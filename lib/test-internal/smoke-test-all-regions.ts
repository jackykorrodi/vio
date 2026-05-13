/**
 * Smoke-Test: Alle buchbaren Einzelregionen × 6 Budgets.
 * Ausgabe: os.tmpdir()/vio-smoke-test/
 *
 * Stabil gegen Datensatz-Updates (regions.ts, dooh-screens.json):
 * Alle Cluster werden datengetrieben entdeckt — keine Vordefinitionen.
 *
 * Ausführung: npx tsx lib/test-internal/smoke-test-all-regions.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ALL_REGIONS } from '../regions';
import {
  filterBuchbareRegionen,
  klassifiziereRegion,
  isBuchbar,
  PERMANENTLY_EXCLUDED,
  MIN_STIMM,
  MIN_SCREENS_QUALIFIER,
  FREIGABE_QUOTE,
} from '../region-buchbarkeit';
import { optimizeForBudget, calculateImpact } from '../preislogik';
import doohData from '../dooh-screens.json';
import type { Region } from '../regions';
import type { ScreenKlasse } from '../region-buchbarkeit';

// ── Konfiguration ─────────────────────────────────────────────────────────────

const BUDGETS = [4000, 6000, 8000, 12000, 20000, 30000] as const;
type Budget = typeof BUDGETS[number];

const OUT_DIR = path.join(os.tmpdir(), 'vio-smoke-test');

// ── Pool-Tier (lokal, nur für Clustering) ────────────────────────────────────

function getPoolTier(region: Region): string {
  if (region.type === 'schweiz') return 'schweiz';
  const s = region.stimm;
  if (s < 20_000)  return 'mikro';
  if (s < 50_000)  return 'klein';
  if (s < 200_000) return 'mittel';
  if (s < 500_000) return 'gross';
  return 'mega';
}

function getClusterId(region: Region, klasse: ScreenKlasse): string {
  return `${getPoolTier(region)}_${klasse}_${region.type}`;
}

// ── CSV Helper ────────────────────────────────────────────────────────────────

function esc(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function csvRow(...vals: (string | number | null | undefined)[]): string {
  return vals.map(esc).join(',');
}

// ── Row-Typen ─────────────────────────────────────────────────────────────────

interface SmokeRow {
  region: Region;
  klasse: ScreenKlasse;
  politScreens: number;
  clusterId: string;
  budget: Budget;
  laufzeitDays: number;
  capLevel: number;
  reachAbs: number;
  reachPct: number;
  frequencyWeekly: number;
  frequencyCampaign: number;
  status: string;
  flags: string[];
  details: string[];
}

// ── Hauptlogik ────────────────────────────────────────────────────────────────

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const buchbareRegionen = filterBuchbareRegionen(ALL_REGIONS);

  const permanently_excluded_count = ALL_REGIONS.filter(r =>
    PERMANENTLY_EXCLUDED.has(r.name)
  ).length;
  const excluded_thresholds_count = ALL_REGIONS.filter(r =>
    !PERMANENTLY_EXCLUDED.has(r.name) && !isBuchbar(r)
  ).length;

  // ── Smoke-Test Loop ──────────────────────────────────────────────────────────

  const rows: SmokeRow[] = [];

  for (const region of buchbareRegionen) {
    const klassif = klassifiziereRegion(region);
    const clusterId = getClusterId(region, klassif.klasse);

    for (const budget of BUDGETS) {
      // optimizeForBudget für statusCode (nicht in ImpactResult direkt)
      const optOut = optimizeForBudget(budget, [region]);

      // calculateImpact für Reach + Frequenz (ruft intern denselben Optimizer auf)
      const impact = calculateImpact({ budget, regions: [region] });

      const reachAbs = Math.round(impact.reachUniqueAbs);
      const reachPct =
        impact.stimmTotal > 0
          ? Math.round((impact.reachUniqueAbs / impact.stimmTotal) * 1000) / 10
          : 0;

      rows.push({
        region,
        klasse: klassif.klasse,
        politScreens: klassif.politScreens,
        clusterId,
        budget,
        laufzeitDays: optOut.laufzeitDays,
        capLevel: optOut.capLevel,
        reachAbs,
        reachPct,
        frequencyWeekly: Math.round(impact.frequencyWeekly * 10) / 10,
        frequencyCampaign: Math.round(impact.frequencyCampaign * 10) / 10,
        status: optOut.statusCode,
        flags: [],
        details: [],
      });
    }
  }

  // ── Per-Row Anomalie-Flags ────────────────────────────────────────────────────

  for (const r of rows) {
    if (r.status === 'dominanzmodus_stark' && r.budget < 8000) {
      r.flags.push('cap_bug_or_micro');
      r.details.push(`dominanzmodus_stark bei budget=${r.budget}`);
    }
    if (r.status === 'too_thin' && r.budget >= 12000) {
      r.flags.push('over_defensive');
      r.details.push(`too_thin bei budget=${r.budget}`);
    }
    if (r.frequencyWeekly > 20) {
      r.flags.push('extreme_frequency');
      r.details.push(`f_weekly=${r.frequencyWeekly}`);
    }
  }

  // ── Boundary-Inconsistency (Cross-Row) ─────────────────────────────────────
  // Pro (klasse, budget)-Gruppe: benachbarte Regionen mit Pool-Diff < 20% prüfen.

  const groupKey = (r: SmokeRow) => `${r.klasse}||${r.budget}`;
  const groups = new Map<string, SmokeRow[]>();
  for (const r of rows) {
    const k = groupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.region.stimm - b.region.stimm);
    for (let i = 0; i < group.length - 1; i++) {
      const R1 = group[i];
      const R2 = group[i + 1];
      const maxStimm = Math.max(R1.region.stimm, R2.region.stimm);
      const poolDiffRatio = maxStimm > 0
        ? Math.abs(R1.region.stimm - R2.region.stimm) / maxStimm
        : 0;
      if (poolDiffRatio >= 0.20) continue;

      const statusDiff = R1.status !== R2.status;
      const maxReach = Math.max(R1.reachAbs, R2.reachAbs);
      const reachDiffRatio = maxReach > 0
        ? Math.abs(R1.reachAbs - R2.reachAbs) / maxReach
        : 0;
      const reachDiff = reachDiffRatio > 0.40;

      if (statusDiff || reachDiff) {
        const pPool  = Math.round(poolDiffRatio * 100);
        const pReach = Math.round(reachDiffRatio * 100);
        R1.flags.push('boundary_inconsistency');
        R1.details.push(
          `vs ${R2.region.name}: pool_diff=${pPool}%, status=${R1.status}->${R2.status}, reach_diff=${pReach}%`
        );
        R2.flags.push('boundary_inconsistency');
        R2.details.push(
          `vs ${R1.region.name}: pool_diff=${pPool}%, status=${R1.status}->${R2.status}, reach_diff=${pReach}%`
        );
      }
    }
  }

  // ── Cluster-Aggregation ───────────────────────────────────────────────────────
  // Unique Regionen pro Cluster (budget-unabhängig, aus erstem Budget-Pass)

  const clusterMap = new Map<string, Map<string, Region>>();
  for (const r of rows) {
    if (!clusterMap.has(r.clusterId)) clusterMap.set(r.clusterId, new Map());
    clusterMap.get(r.clusterId)!.set(r.region.name, r.region);
  }

  interface ClusterInfo {
    clusterId: string;
    tier: string;
    klasse: string;
    regionType: string;
    count: number;
    medianRegion: Region;
    edgeLow: Region;
    edgeHigh: Region;
    allRegions: Region[];
  }

  const clusters: ClusterInfo[] = [];
  for (const [clusterId, regionMap] of clusterMap.entries()) {
    const clusterRegions = [...regionMap.values()].sort((a, b) => a.stimm - b.stimm);
    const edgeLow  = clusterRegions[0];
    const edgeHigh = clusterRegions[clusterRegions.length - 1];

    // Arithmetischer Median der stimm-Werte → Region die am nächsten liegt
    const n = clusterRegions.length;
    const arithmeticMedian = n % 2 === 1
      ? clusterRegions[Math.floor(n / 2)].stimm
      : (clusterRegions[n / 2 - 1].stimm + clusterRegions[n / 2].stimm) / 2;
    let medianRegion = clusterRegions[0];
    let minDiff = Infinity;
    for (const reg of clusterRegions) {
      const diff = Math.abs(reg.stimm - arithmeticMedian);
      if (diff < minDiff) { minDiff = diff; medianRegion = reg; }
    }

    // Cluster-ID parsen: format = `${tier}_${klasse}_${regionType}`
    // klasse kann 'display-dominant' (Bindestrich) enthalten → split auf letztem _
    const lastUnderscore = clusterId.lastIndexOf('_');
    const secondLastUnderscore = clusterId.lastIndexOf('_', lastUnderscore - 1);
    const regionType = clusterId.slice(lastUnderscore + 1);
    const tier       = clusterId.slice(0, secondLastUnderscore);
    const klasse     = clusterId.slice(secondLastUnderscore + 1, lastUnderscore);

    clusters.push({
      clusterId, tier, klasse, regionType,
      count: clusterRegions.length,
      medianRegion, edgeLow, edgeHigh,
      allRegions: clusterRegions,
    });
  }
  clusters.sort((a, b) => a.clusterId.localeCompare(b.clusterId));

  // ── cluster-overview.csv ──────────────────────────────────────────────────────

  const overviewLines = [
    'cluster_id,pool_tier,klasse,region_type,count,median_region,edge_low,edge_high',
  ];
  for (const c of clusters) {
    overviewLines.push(csvRow(
      c.clusterId, c.tier, c.klasse, c.regionType,
      c.count, c.medianRegion.name, c.edgeLow.name, c.edgeHigh.name,
    ));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'cluster-overview.csv'), overviewLines.join('\n'));

  // ── smoke-test-results.csv ────────────────────────────────────────────────────

  const smokeHeader =
    'region_name,region_type,pool,polit_screens,klasse,cluster_id,' +
    'budget,laufzeit_days,cap_level,reach_abs,reach_pct,' +
    'frequency_weekly,frequency_campaign,status';
  const smokeLines = [smokeHeader];
  for (const r of rows) {
    smokeLines.push(csvRow(
      r.region.name, r.region.type, r.region.stimm, r.politScreens,
      r.klasse, r.clusterId, r.budget, r.laufzeitDays, r.capLevel,
      r.reachAbs, r.reachPct, r.frequencyWeekly, r.frequencyCampaign, r.status,
    ));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'smoke-test-results.csv'), smokeLines.join('\n'));

  // ── anomalies.csv ─────────────────────────────────────────────────────────────

  const anomalyHeader =
    'region_name,region_type,pool,polit_screens,klasse,cluster_id,' +
    'budget,laufzeit_days,cap_level,reach_abs,reach_pct,' +
    'frequency_weekly,frequency_campaign,status,flag,detail';
  const anomalyLines = [anomalyHeader];
  for (const r of rows.filter(r => r.flags.length > 0)) {
    for (let i = 0; i < r.flags.length; i++) {
      anomalyLines.push(csvRow(
        r.region.name, r.region.type, r.region.stimm, r.politScreens,
        r.klasse, r.clusterId, r.budget, r.laufzeitDays, r.capLevel,
        r.reachAbs, r.reachPct, r.frequencyWeekly, r.frequencyCampaign, r.status,
        r.flags[i], r.details[i] ?? '',
      ));
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'anomalies.csv'), anomalyLines.join('\n'));

  // ── cluster-representatives.csv ───────────────────────────────────────────────

  const reprLines = ['cluster_id,role,region_name,pool,klasse'];
  for (const c of clusters) {
    const seen = new Set<string>();
    const add = (reg: Region, role: string) => {
      if (!seen.has(reg.name)) {
        reprLines.push(csvRow(c.clusterId, role, reg.name, reg.stimm, c.klasse));
        seen.add(reg.name);
      }
    };

    if (c.count <= 3) {
      for (const reg of c.allRegions) {
        const role =
          reg.name === c.edgeLow.name  ? 'edge_low'  :
          reg.name === c.edgeHigh.name ? 'edge_high' : 'median';
        add(reg, role);
      }
    } else {
      add(c.medianRegion, 'median');
      add(c.edgeLow,      'edge_low');
      add(c.edgeHigh,     'edge_high');
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'cluster-representatives.csv'), reprLines.join('\n'));

  // ── metadata.json ─────────────────────────────────────────────────────────────

  const anomalyCount = anomalyLines.length - 1;
  const metadata = {
    timestamp_iso:                new Date().toISOString(),
    regions_input_total:          ALL_REGIONS.length,
    regions_buchbar:              buchbareRegionen.length,
    regions_excluded_permanently: permanently_excluded_count,
    regions_excluded_thresholds:  excluded_thresholds_count,
    thresholds: {
      MIN_STIMM,
      MIN_SCREENS_QUALIFIER,
      FREIGABE_QUOTE,
    },
    budgets_tested:    [...BUDGETS],
    clusters_found:    clusters.length,
    anomalies_found:   anomalyCount,
    total_smoke_rows:  buchbareRegionen.length * BUDGETS.length,
    dooh_data_entries: (doohData as unknown[]).length,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
  );

  // ── Console-Zusammenfassung ───────────────────────────────────────────────────

  console.log('✓ Smoke-Test abgeschlossen');
  console.log(`${buchbareRegionen.length} Regionen buchbar, ${ALL_REGIONS.length - buchbareRegionen.length} ausgeschlossen`);
  console.log(`${clusters.length} Cluster gefunden`);
  console.log(`${anomalyCount} Anomalien geflaggt`);
  console.log(`Output: ${OUT_DIR}`);
}

main();
