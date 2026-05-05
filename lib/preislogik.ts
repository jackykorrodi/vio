// VIO Preislogik — Single Source of Truth
//
// Ersetzt schrittweise lib/vio-paketlogik.ts und lib/b2b-paketlogik.ts.
// Diese Datei wird in Paket B.2/B.3 in die UI-Komponenten eingebunden.
//
// Basis: Regelkatalog v2.3 (public/vio-regelkatalog-politik-v2.md)
// Erstellt: 22.04.2026

import type { Region } from './regions';
import { klassifiziereMehrereRegionen, klassifiziereRegion } from './region-buchbarkeit';

// ─── Konstanten ──────────────────────────────────────────────────────────────

export const B_MIN = 4000;               // CHF Mindestbudget (hard floor)
export const B_NUDGE_SOFT = 20000;       // CHF dezenter Calendly-Nudge
export const B_NUDGE_STRONG = 30000;     // CHF prominente Beratungs-Bubble
export const B_HARD_MAX = 100000;        // CHF absolute Obergrenze (Hard Stop)

export const DAILY_MIN = 150;            // CHF Tagesbudget-Floor (Splicky)
export const LAUFZEIT_MIN_DAYS = 7;
export const LAUFZEIT_MAX_DAYS = 84;     // 12 Wochen

export const F_MIN_WEEKLY = 2.5;         // unter dieser Schwelle: unwirksam
export const F_MAX_WEEKLY = 10;          // ab hier Werbemüdigkeit
export const REACH_CURVE_K = 0.4;        // Hofmans-Saturation Steilheit
export const WEAROUT_FLOOR = 0.70;       // minimaler Wearout-Faktor

export const MAX_REACH_CAP = 0.80;       // max 80% des Pools erreichbar
export const EXPONENT_BUDGET_LAUFZEIT = 0.75;  // konkave Kopplung

// CPM-Tarife (inkl. VIO-Marge)
export const CPM_DOOH = 50;
export const CPM_DISPLAY = 15;

// Delivery-Faktoren (DSP-Kalibrierung) — TBD mit Dani validieren
export const DELIVERY_DOOH = 0.75;
export const DELIVERY_DISPLAY = 0.90;

// CH-DOOH Schätzung, validiert mit Splicky-Daten (Range 1.8–2.5)
export const DOOH_OTS_MULTIPLIER = 1.8;

// ─── Typen ───────────────────────────────────────────────────────────────────

export type HinweisCode =
  | 'ok'
  | 'below_min_budget'
  | 'too_thin'
  | 'overkill'
  | 'daily_below_floor'
  | 'capped_by_region'
  | 'screen_class_begrenzt'
  | 'screen_class_display_dom'
  | 'screen_class_multi_mixed'
  | 'no_dooh_inventory'
  | 'sweet_spot'
  | 'hard_stop_budget'
  | 'daily_below_floor_region'
  | 'nudge_to_sweet_spot'
  | 'wearout_warning';

export interface Hinweis {
  code: HinweisCode;
  text: string;
  priority: number;  // 1 = höchste Priorität (blockierend)
}

export interface ImpactResult {
  // Inputs (echoed zurück)
  budget: number;
  laufzeitDays: number;
  laufzeitWeeks: number;

  // Reichweite (das was der User sieht)
  reachVon: number;
  reachBis: number;
  reachMitte: number;
  reachVonPct: number;
  reachBisPct: number;

  // Frequenz
  frequencyCampaign: number;  // z.B. 20 (= Ø 20× pro Person über die Kampagne)
  frequencyWeekly: number;    // z.B. 5 (intern zur Validierung)

  // Pool
  stimmTotal: number;
  poolCap: number;            // effektiv erreichbare Pool-Grösse (nach Cap-Level)

  // Channel
  doohShare: number;          // z.B. 0.70
  displayShare: number;       // z.B. 0.30
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';

  // Decision-Engine
  capLevel: 1 | 2 | 3;
  impactLevel: 'sichtbar' | 'praesenz' | 'dominanz';
  efficiencyStatus: 'too_thin' | 'balanced' | 'overkill' | 'capped';
  recommendedAction: { action: string; target: number } | null;

  // Flags
  cappedByRegion: boolean;
  hinweise: Hinweis[];
}

export type PaketKey = 'sichtbar' | 'praesenz' | 'dominanz';

export interface Paket {
  key: PaketKey;
  name: string;
  budget: number;
  laufzeitDays: number;
  laufzeitWeeks: number;
  frequencyCampaign: number;
  frequencyWeekly: number;
  reachVon: number;
  reachBis: number;
  reachMitte: number;
  reachVonPct: number;
  reachBisPct: number;
  recommended: boolean;
}

export interface PakeResult {
  sichtbar: Paket;
  praesenz: Paket;
  dominanz: Paket;
  recommended: PaketKey;
  stimmTotal: number;
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';
}

// ─── Paket-Definitionen (politisch-stark kalibriert) ─────────────────────────

const PAKET_SPECS: Record<PaketKey, {
  name: string;
  weeklyFreq: number;
  laufzeitDays: number;
  reachCapLevel: 1 | 2 | 3;
}> = {
  sichtbar: { name: 'Sichtbar', weeklyFreq: 3, laufzeitDays: 14, reachCapLevel: 1 },
  praesenz: { name: 'Präsenz', weeklyFreq: 5, laufzeitDays: 28, reachCapLevel: 2 },
  dominanz: { name: 'Dominanz', weeklyFreq: 6, laufzeitDays: 42, reachCapLevel: 3 },
};

// ─── Reach-Caps nach Pool-Grösse (tiered) ────────────────────────────────────

function getReachCap(stimmTotal: number, level: 1 | 2 | 3): number {
  if (stimmTotal < 50000) {
    return level === 1 ? 0.22 : level === 2 ? 0.45 : 0.65;
  }
  if (stimmTotal < 200000) {
    return level === 1 ? 0.12 : level === 2 ? 0.22 : 0.38;
  }
  if (stimmTotal < 500000) {
    return level === 1 ? 0.06 : level === 2 ? 0.12 : 0.21;
  }
  return level === 1 ? 0.03 : level === 2 ? 0.06 : 0.12;
}

// ─── Regionen-Dedup (Stadt-in-Kanton-Überlappung) ────────────────────────────

export function dedupRegions(regions: Region[]): Region[] {
  if (regions.some(r => r.type === 'schweiz')) {
    return regions.filter(r => r.type === 'schweiz');
  }
  const kantonCodes = new Set(
    regions.filter(r => r.type === 'kanton').map(r => r.kanton)
  );
  return regions.filter(r => {
    if (r.type === 'kanton') return true;
    if (r.type === 'stadt' && kantonCodes.has(r.kanton)) return false;
    return true;
  });
}

// ─── Laufzeit-Korridor ───────────────────────────────────────────────────────

export function getLaufzeitCorridor(budget: number): { minDays: number; maxDays: number } {
  if (budget < 6000) return { minDays: 7, maxDays: 21 };
  if (budget < 15000) return { minDays: 14, maxDays: 42 };
  if (budget < 30000) return { minDays: 21, maxDays: 56 };
  return { minDays: 28, maxDays: 84 };
}

// ─── Budget↔Laufzeit-Kopplung (konkav, ^0.75) ────────────────────────────────

export function coupleBudgetToLaufzeit(
  referenceBudget: number,
  referenceDays: number,
  newDays: number,
): number {
  const ratio = newDays / referenceDays;
  const factor = Math.pow(ratio, EXPONENT_BUDGET_LAUFZEIT);
  const raw = referenceBudget * factor;
  return Math.max(B_MIN, roundBudget(raw));
}

// ─── Wearout-Kurve (>8 Wochen) ───────────────────────────────────────────────

function applyWearoutFactor(laufzeitWeeks: number): number {
  if (laufzeitWeeks <= 8) return 1.0;
  const factor = 1 - (laufzeitWeeks - 8) * 0.03;
  return Math.max(factor, WEAROUT_FLOOR);
}

function getUncertaintyBand(politScreens: number): number {
  if (politScreens < 30) return 0.20;
  if (politScreens < 150) return 0.15;
  if (politScreens < 500) return 0.13;
  return 0.12;
}

// ─── Budget-Rundung ──────────────────────────────────────────────────────────

function roundBudget(v: number): number {
  if (v < 10000) return Math.round(v / 100) * 100;
  if (v < 50000) return Math.round(v / 500) * 500;
  return Math.round(v / 1000) * 1000;
}

// ─── Hilfs-Aggregat ──────────────────────────────────────────────────────────

function sumStimm(regions: Region[]): number {
  return regions.reduce((s, r) => s + r.stimm, 0);
}

// ─── Sweet Spot ──────────────────────────────────────────────────────────────

export function calculateSweetSpot(regions: Region[], laufzeitDays: number): number | null {
  const deduped = dedupRegions(regions);
  const stimmTotal = sumStimm(deduped);
  if (stimmTotal === 0 || deduped.length === 0) return 0;
  const laufzeitWeeks = laufzeitDays / 7;
  const klass = deduped.length > 1
    ? klassifiziereMehrereRegionen(deduped)
    : klassifiziereRegion(deduped[0]);

  const capL2 = getReachCap(stimmTotal, 2);
  const pool = stimmTotal * capL2;

  const TARGET_FREQ = 4.5;
  const impressionsNeeded = TARGET_FREQ * pool * laufzeitWeeks;

  const doohShare = klass.split.dooh;
  const displayShare = 1 - doohShare;
  const mixedCPM = doohShare * CPM_DOOH + displayShare * CPM_DISPLAY;
  const deliveryBlend = doohShare * DELIVERY_DOOH + displayShare * DELIVERY_DISPLAY;

  const raw = (impressionsNeeded / 1000) * mixedCPM / deliveryBlend;

  // Sättigungsbudget: Budget bei dem poolCap überschritten wird
  const impressionsAtCap = pool * TARGET_FREQ * laufzeitWeeks / deliveryBlend;
  const saturationBudget = (impressionsAtCap / 1000) * mixedCPM;

  // Sweet Spot darf nie in Sättigungszone zeigen
  let adjusted = raw;
  if (raw >= saturationBudget) {
    adjusted = saturationBudget * 0.85;
  }

  const clamped = Math.max(B_MIN * 1.5, Math.min(B_NUDGE_SOFT * 0.75, adjusted));
  if (clamped <= B_MIN * 1.5) return null;

  return Math.round(clamped / 500) * 500;
}

// ─── Hinweis-Generierung ─────────────────────────────────────────────────────

function buildHinweise(ctx: {
  budget: number;
  frequencyWeekly: number;
  laufzeitDays: number;
  laufzeitWeeks: number;
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';
  cappedByRegion: boolean;
  regionNames: string[];
  multiRegion: boolean;
  politScreensTotal: number;
  stimmTotal: number;
  reachMitte: number;
  regions: Region[];
}): Hinweis[] {
  const hinweise: Hinweis[] = [];

  // Priorität 1: blockierende
  if (ctx.budget >= B_HARD_MAX) {
    hinweise.push({
      code: 'hard_stop_budget',
      text: 'Kampagnen ab CHF 100\'000 planen wir persönlich. Buchung nur nach Gespräch möglich.',
      priority: 1,
    });
    return hinweise;
  }
  if (ctx.budget < B_MIN) {
    hinweise.push({
      code: 'below_min_budget',
      text: 'Mindestbudget CHF 4\'000 – wir heben automatisch an.',
      priority: 1,
    });
  }

  // Priorität 3: daily_below_floor pro Region (nur Multi-Region)
  if (ctx.regions.length > 1) {
    const violating = ctx.regions.filter(r => {
      const share = ctx.stimmTotal > 0 ? r.stimm / ctx.stimmTotal : 1 / ctx.regions.length;
      return (ctx.budget * share) / ctx.laufzeitDays < DAILY_MIN;
    });
    if (violating.length > 0) {
      const regionList = violating.map(r => r.name).join(', ');
      hinweise.push({
        code: 'daily_below_floor_region',
        text: `In ${regionList} liegt das Tagesbudget unter CHF 150 – Ausspielung dort nicht garantiert. Empfehlung: Region entfernen oder Budget erhöhen.`,
        priority: 3,
      });
    }
  }

  // Priorität 4: daily_below_floor (global)
  const dailyBudget = ctx.budget / ctx.laufzeitDays;
  if (dailyBudget < DAILY_MIN) {
    hinweise.push({
      code: 'daily_below_floor',
      text: 'Tagesbudget unter CHF 150 – Ausspielung nicht garantiert. Kürzere Laufzeit empfohlen.',
      priority: 4,
    });
  }

  // Priorität 5: Empfehlungen
  if (ctx.frequencyWeekly < F_MIN_WEEKLY) {
    const emptohleneWochen = Math.max(1, Math.floor(ctx.laufzeitDays / 7 / 2));
    hinweise.push({
      code: 'too_thin',
      text: `Dein Budget ist für ${Math.round(ctx.laufzeitDays / 7)} Wochen zu dünn verteilt. Empfehlung: Laufzeit auf ${emptohleneWochen} Wochen reduzieren.`,
      priority: 5,
    });
  }
  if (ctx.frequencyWeekly > F_MAX_WEEKLY) {
    hinweise.push({
      code: 'overkill',
      text: 'Deine Frequenz ist sehr hoch. Empfehlung: Budget reduzieren oder Region erweitern.',
      priority: 5,
    });
  }

  // Priorität 6: capped_by_region
  if (ctx.cappedByRegion) {
    const regionText = ctx.regionNames.length === 1 ? ctx.regionNames[0] : 'deiner Auswahl';
    hinweise.push({
      code: 'capped_by_region',
      text: `Maximale Reichweite in ${regionText} erreicht. Mehr Budget bringt keine zusätzlichen Personen.`,
      priority: 6,
    });
  }

  // Priorität 8: Kontext (Screen-Klasse)
  if (ctx.politScreensTotal === 0) {
    hinweise.push({
      code: 'no_dooh_inventory',
      text: 'Keine DOOH-Flächen verfügbar. Kampagne läuft zu 100% als Display.',
      priority: 8,
    });
  } else if (ctx.multiRegion && ctx.screenKlasse !== 'voll') {
    hinweise.push({
      code: 'screen_class_multi_mixed',
      text: ctx.screenKlasse === 'begrenzt'
        ? 'In deiner Region-Auswahl ist DOOH-Inventar teilweise begrenzt — der Online-Anteil wird entsprechend erhöht.'
        : 'In Teilen deiner Region-Auswahl erreichen wir deine Zielgruppe primär online.',
      priority: 8,
    });
  } else if (!ctx.multiRegion && ctx.screenKlasse === 'begrenzt') {
    const name = ctx.regionNames[0] ?? 'deiner Region';
    hinweise.push({
      code: 'screen_class_begrenzt',
      text: `In ${name} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal.`,
      priority: 8,
    });
  } else if (!ctx.multiRegion && ctx.screenKlasse === 'display-dominant') {
    const name = ctx.regionNames[0] ?? 'deiner Region';
    hinweise.push({
      code: 'screen_class_display_dom',
      text: `In ${name} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt.`,
      priority: 8,
    });
  }

  // Priorität 9: Laufzeit-Wearout
  if (ctx.laufzeitWeeks > 8) {
    hinweise.push({
      code: 'wearout_warning',
      text: 'Lange Kampagnen verlieren Effizienz ab Woche 9. Für maximale Wirkung: 4–8 Wochen.',
      priority: 9,
    });
  }

  // Sweet Spot Logik (budget-basiert via calculateSweetSpot)
  const ssRegionName = ctx.regionNames.length === 1 ? ctx.regionNames[0] : 'deiner Region';
  const sweetSpot = ctx.regions.length > 0 ? calculateSweetSpot(ctx.regions, ctx.laufzeitDays) : null;
  const hasBlockingHint = hinweise.some(h => h.priority <= 4);
  if (!hasBlockingHint && sweetSpot !== null) {
    const budgetRatio = ctx.budget / sweetSpot;
    const fmtSweetSpot = new Intl.NumberFormat('de-CH').format(sweetSpot);
    if (!ctx.cappedByRegion && budgetRatio < 0.85) {
      hinweise.push({
        code: 'nudge_to_sweet_spot',
        text: `CHF ${fmtSweetSpot} wäre das optimale Budget für ${ssRegionName} bei ${ctx.laufzeitDays} Tagen Laufzeit — ausreichend Frequenz, breite Abdeckung, kein Leerlauf.`,
        priority: 5.5,
      });
    } else if (budgetRatio <= 1.20) {
      hinweise.push({
        code: 'sweet_spot',
        text: `Kontaktdruck und Abdeckung sind gut ausbalanciert für eine ${ctx.laufzeitDays}-tägige Kampagne in ${ssRegionName}.`,
        priority: 9,
      });
    }
  }

  if (hinweise.length === 0) {
    hinweise.push({ code: 'ok', text: 'Konfiguration in Ordnung.', priority: 10 });
  }

  return hinweise.sort((a, b) => a.priority - b.priority);
}

// ─── Cap-Level-Inferenz ──────────────────────────────────────────────────────

function inferCapLevel(contacts: number, stimm: number, weeks: number): 1 | 2 | 3 {
  const targetFreqs = { 1: 3, 2: 5, 3: 6 } as const;
  const distances = ([1, 2, 3] as const).map(level => {
    const pool = stimm * getReachCap(stimm, level);
    const sat = 1 - Math.exp(-REACH_CURVE_K * contacts / pool);
    const reach = Math.min(pool * sat, stimm * MAX_REACH_CAP);
    const fw = reach > 0 ? contacts / (reach * weeks) : 0;
    return { level, distance: Math.abs(fw - targetFreqs[level]) };
  });
  return distances.sort((a, b) => a.distance - b.distance)[0].level;
}

// ─── Kern: calculateImpact ───────────────────────────────────────────────────

export function calculateImpact(input: {
  budget: number;
  laufzeitDays: number;
  regions: Region[];
  mode?: 'budgetFirst' | 'paketLevel';   // default: 'budgetFirst'
  paketLevel?: 1 | 2 | 3;               // nur bei mode='paketLevel'
}): ImpactResult {
  const regions = dedupRegions(input.regions);
  const stimmTotal = sumStimm(regions);
  const multiRegion = regions.length > 1;

  // Channel-Split via region-buchbarkeit
  const klass = multiRegion
    ? klassifiziereMehrereRegionen(regions)
    : regions[0]
      ? klassifiziereRegion(regions[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };

  const doohShare = klass.split.dooh;
  const displayShare = klass.split.display;
  const politScreensTotal = klass.politScreens;

  // Dynamischer Misch-CPM
  const mixedCpm = doohShare * CPM_DOOH + displayShare * CPM_DISPLAY;

  // Total-Kontakte aus Budget (mit Delivery-Faktoren + OTS-Multiplier für DOOH)
  const doohBudget = input.budget * doohShare;
  const displayBudget = input.budget * displayShare;
  const doohContacts = (doohBudget / CPM_DOOH) * 1000 * DELIVERY_DOOH * DOOH_OTS_MULTIPLIER;
  const displayContacts = (displayBudget / CPM_DISPLAY) * 1000 * DELIVERY_DISPLAY;
  const impressionsEffective = doohContacts + displayContacts;

  // Laufzeit
  const laufzeitWeeks = input.laufzeitDays / 7;

  // Cap-Level (Budget-first: inferieren; Paket-Modus: fix)
  const capLevel: 1 | 2 | 3 = (input.mode === 'paketLevel' && input.paketLevel)
    ? input.paketLevel
    : inferCapLevel(impressionsEffective, stimmTotal, laufzeitWeeks);

  // Hofmans-Saturation Reach
  const poolCap = stimmTotal * getReachCap(stimmTotal, capLevel);
  const ratio = poolCap > 0 ? impressionsEffective / poolCap : 0;
  const saturationFactor = 1 - Math.exp(-REACH_CURVE_K * ratio);
  let uniqueReach = Math.min(poolCap * saturationFactor, stimmTotal * MAX_REACH_CAP);
  const capped = saturationFactor > 0.85 || uniqueReach >= stimmTotal * MAX_REACH_CAP * 0.99;

  // Wearout bei Laufzeit > 8 Wochen
  uniqueReach = uniqueReach * applyWearoutFactor(laufzeitWeeks);

  // Frequenz emergent
  const frequencyCampaign = uniqueReach > 0 ? impressionsEffective / uniqueReach : 0;
  const frequencyWeekly = laufzeitWeeks > 0 ? frequencyCampaign / laufzeitWeeks : 0;

  const band = getUncertaintyBand(politScreensTotal);

  const reachMitte = Math.round(uniqueReach);
  const reachVon = Math.round(Math.max(0, uniqueReach * (1 - band)) / 500) * 500;
  const reachBis = Math.round(Math.min(poolCap, uniqueReach * (1 + band)) / 500) * 500;

  const reachVonPct = stimmTotal > 0 ? Math.round((reachVon / stimmTotal) * 100) : 0;
  const reachBisPct = stimmTotal > 0 ? Math.round((reachBis / stimmTotal) * 100) : 0;

  // Decision-Engine-Signale
  const impactLevel: 'sichtbar' | 'praesenz' | 'dominanz' =
    capLevel === 1 ? 'sichtbar' : capLevel === 2 ? 'praesenz' : 'dominanz';

  const fWeekly = Math.round(frequencyWeekly * 10) / 10;

  const efficiencyStatus: 'too_thin' | 'balanced' | 'overkill' | 'capped' = capped
    ? 'capped'
    : fWeekly < F_MIN_WEEKLY ? 'too_thin'
    : fWeekly > F_MAX_WEEKLY ? 'overkill'
    : 'balanced';

  const targetFreqWeekly = capLevel === 1 ? 3 : capLevel === 2 ? 5 : 6;
  const recommendedAction: { action: string; target: number } | null =
    efficiencyStatus === 'too_thin'
      ? { action: 'reduce_laufzeit', target: Math.ceil(impressionsEffective / (targetFreqWeekly * poolCap)) }
      : efficiencyStatus === 'overkill'
      ? { action: 'reduce_budget', target: Math.round(poolCap * targetFreqWeekly * laufzeitWeeks / 1000 * mixedCpm) }
      : efficiencyStatus === 'capped'
      ? { action: 'expand_region_or_reduce_budget', target: Math.round(poolCap) }
      : null;

  // Hinweise
  const hinweise = buildHinweise({
    budget: input.budget,
    frequencyWeekly,
    laufzeitDays: input.laufzeitDays,
    laufzeitWeeks,
    screenKlasse: klass.klasse,
    cappedByRegion: capped,
    regionNames: regions.map(r => r.name),
    multiRegion,
    politScreensTotal,
    stimmTotal,
    reachMitte,
    regions,
  });

  return {
    budget: input.budget,
    laufzeitDays: input.laufzeitDays,
    laufzeitWeeks,
    reachVon,
    reachBis,
    reachMitte,
    reachVonPct,
    reachBisPct,
    frequencyCampaign: Math.round(frequencyCampaign * 10) / 10,
    frequencyWeekly: fWeekly,
    stimmTotal,
    poolCap: Math.round(poolCap),
    doohShare,
    displayShare,
    screenKlasse: klass.klasse,
    capLevel,
    impactLevel,
    efficiencyStatus,
    recommendedAction,
    cappedByRegion: capped,
    hinweise,
  };
}

// ─── buildPackages — Pfad B (drei Pakete) ────────────────────────────────────

export function buildPackages(input: {
  regions: Region[];
}): PakeResult {
  const regions = dedupRegions(input.regions);
  const stimmTotal = sumStimm(regions);
  const multiRegion = regions.length > 1;

  const klass = multiRegion
    ? klassifiziereMehrereRegionen(regions)
    : regions[0]
      ? klassifiziereRegion(regions[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };

  const PKG_MIN: Record<PaketKey, number> = {
    sichtbar: 4000,
    praesenz: 6000,
    dominanz: 9000,
  };

  const buildOne = (key: PaketKey): Paket => {
    const spec = PAKET_SPECS[key];
    const reachCap = getReachCap(stimmTotal, spec.reachCapLevel);
    const targetReach = stimmTotal * reachCap;
    const laufzeitWeeks = spec.laufzeitDays / 7;

    // Budget rückwärts lösen (v2.3: Saturation-Korrektur 0.7, symmetrisch zu calculateImpact)
    const targetContacts = spec.weeklyFreq * laufzeitWeeks * targetReach * 0.7;
    const impsDOOH = (targetContacts * klass.split.dooh) / (DOOH_OTS_MULTIPLIER * DELIVERY_DOOH);
    const impsDisplay = (targetContacts * klass.split.display) / DELIVERY_DISPLAY;
    const rawBudget = (impsDOOH / 1000) * CPM_DOOH + (impsDisplay / 1000) * CPM_DISPLAY;
    const finalBudget = Math.max(PKG_MIN[key], roundBudget(rawBudget));

    // Reach via calculateImpact (mode:'paketLevel' fixiert Cap-Level)
    const imp = calculateImpact({
      budget: finalBudget,
      laufzeitDays: spec.laufzeitDays,
      regions,
      mode: 'paketLevel',
      paketLevel: spec.reachCapLevel,
    });

    return {
      key,
      name: spec.name,
      budget: finalBudget,
      laufzeitDays: spec.laufzeitDays,
      laufzeitWeeks,
      frequencyCampaign: imp.frequencyCampaign,
      frequencyWeekly: imp.frequencyWeekly,
      reachVon: imp.reachVon,
      reachBis: imp.reachBis,
      reachMitte: imp.reachMitte,
      reachVonPct: imp.reachVonPct,
      reachBisPct: imp.reachBisPct,
      recommended: key === 'praesenz',
    };
  };

  return {
    sichtbar: buildOne('sichtbar'),
    praesenz: buildOne('praesenz'),
    dominanz: buildOne('dominanz'),
    recommended: 'praesenz',
    stimmTotal,
    screenKlasse: klass.klasse,
  };
}

// ─── Konstanten-Export für UI ────────────────────────────────────────────────

export const GEMEINDE_NICHT_GEFUNDEN_HINWEIS =
  'Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen ' +
  'Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — ' +
  'wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte ' +
  'Gemeinde.';
