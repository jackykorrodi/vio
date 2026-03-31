'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';
import doohScreens from '@/lib/dooh-screens.json';
import demonymsRaw from '@/lib/demonyms.json';
const DEMONYMS = demonymsRaw as Record<string, string>;

type DoohEntry = {
  type: 'schweiz' | 'kanton' | 'stadt';
  name?: string;
  kanton: string;
  screens: number;
  screens_politik: number;
  standorte: number;
  reach: number;
};
const DOOH_DATA = doohScreens as DoohEntry[];

// ─── Tier configuration ───────────────────────────────────────────────────────
const TIERS = {
  hochfrequenz: {
    praesenzRate: 0.70,
    maxDurchdringung: 0.45,
    displayAnteil: 0.30,
    doohBand: 0.10,
    kombBand: 0.07,
  },
  mittelgross: {
    praesenzRate: 0.75,
    maxDurchdringung: 0.55,
    displayAnteil: 0.25,
    doohBand: 0.15,
    kombBand: 0.10,
  },
  regional: {
    praesenzRate: 0.85,
    maxDurchdringung: 0.75,
    displayAnteil: 0.20,
    doohBand: 0.20,
    kombBand: 0.13,
  },
} as const;

type TierKey = keyof typeof TIERS;

const HOCHFREQUENZ_STAEDTE = [
  'Zürich','Bern','Basel','Genf','Lausanne','Winterthur','Luzern','St. Gallen'
];
const HOCHFREQUENZ_KANTONE = ['ZH','BE','GE','BS'];
const MITTELGROSS_KANTONE = [
  'AG','VD','BL','LU','SG','TI','SO','TG','FR','NE','VS','GR','SZ','ZG','SH'
];

const PAKETE = [
  { id: 'sichtbar' as const, label: 'Sichtbar',  budget:  2500, faktor: 0.35, weeks: 1, recommended: false },
  { id: 'praesenz' as const, label: 'Präsenz',   budget:  9500, faktor: 0.60, weeks: 2, recommended: true  },
  { id: 'dominanz' as const, label: 'Dominanz',  budget: 25000, faktor: 0.80, weeks: 4, recommended: false },
] as const;

type PaketId = 'sichtbar' | 'praesenz' | 'dominanz';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTierForRegion(r: { type: string; name?: string; kanton?: string; screens?: number }): TierKey {
  if (r.type === 'schweiz') return 'mittelgross';
  if (r.type === 'stadt') {
    if (HOCHFREQUENZ_STAEDTE.includes(r.name ?? '')) return 'hochfrequenz';
    if ((r.screens ?? 0) >= 80) return 'mittelgross';
    return 'regional';
  }
  if (r.type === 'kanton') {
    if (HOCHFREQUENZ_KANTONE.includes(r.kanton ?? '')) return 'hochfrequenz';
    if (MITTELGROSS_KANTONE.includes(r.kanton ?? '')) return 'mittelgross';
    return 'regional';
  }
  return 'regional';
}

function snap(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function getDoohScreens(
  regionName: string,
  regionType: string,
  kanton: string | undefined,
  isPolitik: boolean,
): number {
  let entry: DoohEntry | undefined;
  if (regionType === 'schweiz') {
    entry = DOOH_DATA.find(d => d.type === 'schweiz');
  } else if (regionType === 'kanton') {
    entry = DOOH_DATA.find(d => d.type === 'kanton' && d.kanton === kanton);
  } else {
    entry = DOOH_DATA.find(d => d.type === 'stadt' && d.name === regionName);
  }
  if (!entry) return 0;
  return isPolitik ? entry.screens_politik : entry.screens;
}

// ─── Reach model ──────────────────────────────────────────────────────────────
interface ReachResult {
  doohMitte: number;
  displayUnique: number;
  gesamtMitte: number;
  von: number;
  bis: number;
  vonPct: number;
  bisPct: number;
  cappedAt80: boolean;
  screens: number;
  tier: TierKey;
  kombBand: number;
}

function calcVioReach(
  budget: number,
  stimmber: number,
  paketFaktor: number,
  selectedRegions: Array<{ name?: string; type: string; kanton?: string; stimm: number }>,
  isPolitik: boolean,
): ReachResult {
  let totalStimm = 0;
  let sumPraesenz = 0;
  let sumDurchdringung = 0;
  let sumDisplayAnteil = 0;
  let sumKombBand = 0;
  let totalScreens = 0;

  selectedRegions.forEach(r => {
    const s = r.stimm;
    const screens = getDoohScreens(r.name ?? '', r.type, r.kanton, isPolitik);
    const tierKey = getTierForRegion({ type: r.type, name: r.name, kanton: r.kanton, screens });
    const tier = TIERS[tierKey];

    totalStimm += s;
    sumPraesenz += s * tier.praesenzRate;
    sumDurchdringung += s * tier.maxDurchdringung;
    sumDisplayAnteil += s * tier.displayAnteil;
    sumKombBand += s * tier.kombBand;
    totalScreens += screens;
  });

  if (totalStimm === 0) {
    return { doohMitte: 0, displayUnique: 0, gesamtMitte: 0, von: 0, bis: 0, vonPct: 0, bisPct: 0, cappedAt80: false, screens: 0, tier: 'regional', kombBand: 0.13 };
  }

  const avgPraesenz      = sumPraesenz      / totalStimm;
  const avgDurchdringung = sumDurchdringung / totalStimm;
  const avgDisplayAnteil = sumDisplayAnteil / totalStimm;
  const avgKombBand      = sumKombBand      / totalStimm;

  const doohMitte    = Math.round(stimmber * avgPraesenz * avgDurchdringung * paketFaktor);
  const displayBudget = budget * avgDisplayAnteil;
  const displayRaw    = Math.round(displayBudget / 15 * 1000 * 0.35);
  const displayUnique = Math.min(displayRaw, Math.round(doohMitte * 1.5));

  let gesamtMitte = doohMitte + displayUnique;
  const cap80     = Math.round(stimmber * 0.80);
  const cappedAt80 = gesamtMitte > cap80;
  gesamtMitte = Math.min(gesamtMitte, cap80);

  const von    = snap(Math.max(0, Math.round(gesamtMitte * (1 - avgKombBand))), 500);
  const bis    = Math.min(snap(Math.round(gesamtMitte * (1 + avgKombBand)), 500), Math.round(stimmber * 0.80));
  const vonPct = Math.round(von / stimmber * 100);
  const bisPct = Math.round(bis / stimmber * 100);

  const dominantRegion  = selectedRegions.reduce((a, b) => a.stimm > b.stimm ? a : b);
  const dominantScreens = getDoohScreens(dominantRegion.name ?? '', dominantRegion.type, dominantRegion.kanton, isPolitik);
  const dominantTier = getTierForRegion({
    type: dominantRegion.type,
    name: dominantRegion.name,
    kanton: dominantRegion.kanton,
    screens: dominantScreens,
  });

  return { doohMitte, displayUnique, gesamtMitte, von, bis, vonPct, bisPct, cappedAt80, screens: totalScreens, tier: dominantTier, kombBand: avgKombBand };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  prevStep?: () => void;
  isActive: boolean;
  stepNumber?: number;
}

function getEinwohner(regionName: string): string {
  return DEMONYMS[regionName] ?? `Einwohnerinnen und Einwohner von ${regionName}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step4Budget({ briefing, updateBriefing, nextStep, prevStep, stepNumber }: Props) {
  const isPolitik = briefing.campaignType === 'politik';

  const selectedRegions = useMemo(() => {
    if (isPolitik && briefing.selectedRegions?.length) {
      return briefing.selectedRegions.map(r => ({
        name: r.name,
        type: r.type,
        kanton: r.kanton,
        stimm: r.stimm,
      }));
    }
    const rName = briefing.analysis?.region?.[0] ?? 'Gesamte Schweiz';
    const found = ALL_REGIONS.find(r => r.name === rName);
    return [{
      name:   found?.name   ?? 'Gesamte Schweiz',
      type:   found?.type   ?? 'schweiz',
      kanton: found?.kanton ?? 'CH',
      stimm:  found?.stimm  ?? 5571000,
    }];
  }, [briefing, isPolitik]);

  const stimmber  = selectedRegions.reduce((s, r) => s + r.stimm, 0);
  const regionName = selectedRegions.length === 1
    ? (selectedRegions[0].name ?? 'Gesamte Schweiz')
    : `${selectedRegions.length} Regionen`;
  const primaryRegionName = selectedRegions[0]?.name ?? 'Gesamte Schweiz';
  const einwohner = getEinwohner(primaryRegionName);

  // ── State ──
  const [budget,             setBudget]             = useState(9500);
  const [duration,           setDuration]           = useState(4);
  const [selectedPkg,        setSelectedPkg]        = useState<PaketId>('praesenz');
  const [regionPickerOpen,   setRegionPickerOpen]   = useState(false);
  const [regionQuery,        setRegionQuery]        = useState('');
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [editRegions, setEditRegions] = useState<Region[]>(() => (briefing.selectedRegions ?? []) as Region[]);
  const [startDate] = useState<string>(() => {
    if (briefing.votingDate && briefing.recommendedLaufzeit) {
      const d = new Date(briefing.votingDate + 'T12:00:00');
      d.setDate(d.getDate() - briefing.recommendedLaufzeit * 7);
      const today = new Date();
      return (d < today ? today : d).toISOString().split('T')[0];
    }
    return todayStr();
  });

  // ── Derived ──
  const currentPaket = PAKETE.find(p => p.id === selectedPkg) ?? PAKETE[1];
  const reach = useMemo(() =>
    calcVioReach(budget, stimmber, currentPaket.faktor, selectedRegions, isPolitik),
    [budget, stimmber, currentPaket.faktor, selectedRegions, isPolitik]
  );
  const pkgReach = useMemo(() => PAKETE.map(pkg =>
    calcVioReach(pkg.budget, stimmber, pkg.faktor, selectedRegions, isPolitik)
  ), [stimmber, selectedRegions, isPolitik]);

  const smartTip = (() => {
    if (reach.bisPct >= 55)
      return "Stark: Du erreichst über die Hälfte aller Stimmberechtigten. Maximale Durchdringung.";
    if (reach.bisPct >= 40)
      return `Gute Durchdringung — bis zu ${reach.bisPct}% der Stimmberechtigten sehen deine Kampagne.`;
    return "Tipp: Mit etwas mehr Budget lässt sich die Reichweite deutlich steigern.";
  })();

  // ── Region picker ──
  const regionSearchResults = useMemo(() => {
    const q    = regionQuery.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => isPolitik || r.type === 'kanton')
      .filter(r => !editRegions.some(s => s.name === r.name));
    return [
      ...pool.filter(r => r.type === 'schweiz'),
      ...pool.filter(r => r.type === 'kanton'),
      ...pool.filter(r => r.type === 'stadt'),
    ].slice(0, 8);
  }, [regionQuery, editRegions, isPolitik]);

  const editTotalStimm = editRegions.reduce((s, r) => s + r.stimm, 0);

  const addEditRegion = (r: Region) => {
    if (!isPolitik) {
      updateBriefing({ analysis: briefing.analysis ? { ...briefing.analysis, region: [r.name] } : null });
      setRegionPickerOpen(false); setRegionQuery(''); return;
    }
    if (editRegions.length >= 10) return;
    setEditRegions(prev => [...prev, r]);
    setRegionQuery(''); setRegionDropdownOpen(false);
  };

  const removeEditRegion = (name: string) =>
    setEditRegions(prev => prev.filter(r => r.name !== name));

  const confirmRegionEdit = () => {
    if (!isPolitik || editRegions.length === 0) return;
    updateBriefing({
      selectedRegions:   editRegions.map(r => ({ name: r.name, type: r.type, stimm: r.stimm, kanton: r.kanton })),
      totalStimmber:     editTotalStimm,
      stimmberechtigte:  editTotalStimm,
      politikRegion:     editRegions[0]?.name ?? '',
      politikRegionType: (editRegions[0]?.type ?? 'kanton') as 'kanton' | 'stadt' | 'schweiz',
    });
    setRegionPickerOpen(false); setRegionQuery('');
  };

  const handlePackageSelect = (pkg: typeof PAKETE[number]) => {
    setSelectedPkg(pkg.id);
    setBudget(pkg.budget);
    setDuration(pkg.weeks);
  };

  const handleNext = () => {
    updateBriefing({
      budget,
      laufzeit: currentPaket.weeks,
      startDate,
      reach: reach.gesamtMitte,
      reachVon:    reach.von,
      reachBis:    reach.bis,
      reachVonPct: reach.vonPct,
      reachBisPct: reach.bisPct,
      screens:     reach.screens,
      tierSelected: PAKETE.findIndex(p => p.id === selectedPkg),
      b2bReach: null,
    });
    nextStep();
  };

  // ── Formatters ──
  const fmtCHF   = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;
  const fmtN     = (n: number) => Math.round(n).toLocaleString('de-CH');
  const fmtRange = (a: number, b: number) => `${fmtN(a)}–${fmtN(b)}`;
  const durLabel = (w: number) => `${w} ${w === 1 ? 'Woche' : 'Wochen'}`;

  const personLabel  = isPolitik ? 'Stimmberechtigte' : 'Personen';
  const ctBadgeLabel = briefing.campaignType === 'b2c' ? 'B2C' : briefing.campaignType === 'b2b' ? 'B2B' : 'Politische Kampagne';
  const ctBadgeColor = briefing.campaignType === 'politik' ? '#7C3AED' : 'var(--primary)';

  const budgetPct   = ((budget   - 2500) / (50000 - 2500)) * 100;
  const durationPct = ((duration - 1)    / (8 - 1))        * 100;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <section>
      <style>{`
        .wrap{max-width:1320px;margin:0 auto;padding:32px 48px 100px;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:start;}
        .eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
        .eline{width:20px;height:2px;background:#6B4FBB;border-radius:2px;flex-shrink:0;}
        .etxt{font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#D4A843;}
        .step4-h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(26px,2.4vw,34px);font-weight:800;letter-spacing:-.025em;line-height:1.15;color:#2D1F52;margin-bottom:28px;}
        .ctx-bar{background:white;border:1px solid rgba(107,79,187,0.10);border-radius:14px;padding:13px 18px;margin-bottom:32px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;}
        .badge-v{background:#6B4FBB;color:white;border-radius:100px;padding:3px 14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;}
        .badge-r{background:#EDE8FF;color:#6B4FBB;border-radius:100px;padding:3px 12px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;}
        .badge-d{background:#FDF3DC;color:#9B7120;border:1px solid rgba(212,168,67,0.3);border-radius:8px;padding:3px 10px;font-size:11px;}
        .ctx-change{margin-left:auto;font-size:12px;color:#6B4FBB;font-weight:600;text-decoration:underline;cursor:pointer;background:none;border:none;}
        .pkg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:32px;}
        .pkg{background:white;border:1.5px solid rgba(107,79,187,0.10);border-radius:20px;padding:24px 20px;cursor:pointer;position:relative;transition:all .2s;text-align:left;width:100%;}
        .pkg:hover{border-color:rgba(107,79,187,0.25);transform:translateY(-3px);box-shadow:0 10px 28px rgba(107,79,187,0.09);}
        .pkg.active{border:2px solid #6B4FBB;background:#F5F2FF;}
        .pkg-rec{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#6B4FBB;color:white;font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;border-radius:100px;padding:3px 12px;white-space:nowrap;}
        .pkg-check{position:absolute;top:14px;right:14px;width:20px;height:20px;border-radius:50%;background:rgba(107,79,187,0.10);display:flex;align-items:center;justify-content:center;}
        .pkg.active .pkg-check{background:#6B4FBB;}
        .pkg-lbl{font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7A7596;margin-bottom:12px;}
        .pkg.active .pkg-lbl{color:#8B6FD4;}
        .pkg-price{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(20px,1.8vw,26px);font-weight:800;color:#2D1F52;letter-spacing:-.025em;line-height:1;margin-bottom:6px;}
        .pkg.active .pkg-price{color:#6B4FBB;}
        .pkg-dur{font-size:12px;color:#7A7596;margin-bottom:5px;}
        .pkg-reach{font-size:11px;color:#7A7596;}
        .pkg.active .pkg-reach{color:#8B6FD4;}
        .proposal{background:white;border:1px solid rgba(107,79,187,0.10);border-top:3px solid #6B4FBB;border-radius:20px;padding:28px;margin-bottom:28px;}
        .prop-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:24px;flex-wrap:wrap;}
        .prop-badge{background:#EDE8FF;color:#6B4FBB;border:1px solid rgba(107,79,187,0.2);border-radius:100px;padding:3px 14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;display:inline-block;margin-bottom:10px;}
        .prop-num{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(32px,3vw,44px);font-weight:800;color:#2D1F52;letter-spacing:-.03em;line-height:1;}
        .prop-sub{font-size:13px;color:#7A7596;margin-top:6px;font-weight:300;}
        .prop-right{text-align:right;flex-shrink:0;}
        .prop-price{font-family:'Plus Jakarta Sans',sans-serif;font-size:26px;font-weight:800;color:#6B4FBB;letter-spacing:-.02em;}
        .prop-psub{font-size:12px;color:#7A7596;margin-top:3px;}
        .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding-top:20px;border-top:1px solid rgba(107,79,187,0.08);}
        .stat{background:#F5F2FF;border-radius:14px;padding:16px 18px;}
        .stat-lbl{font-family:'Plus Jakarta Sans',sans-serif;font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B8A9E8;margin-bottom:8px;}
        .stat-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#2D1F52;letter-spacing:-.02em;line-height:1.1;}
        .stat-sub{font-size:11px;color:#7A7596;margin-top:4px;font-weight:300;}
        .sliders{background:white;border:1px solid rgba(107,79,187,0.10);border-radius:20px;padding:28px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr;gap:32px;}
        .sl-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;}
        .sl-label{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:600;color:#2D1F52;}
        .sl-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#6B4FBB;letter-spacing:-.02em;}
        .step4-range{width:100%;-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;outline:none;cursor:pointer;border:none;display:block;}
        .step4-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:white;border:2.5px solid #6B4FBB;cursor:pointer;box-shadow:0 2px 8px rgba(107,79,187,0.25);margin-top:-9px;}
        .step4-range::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:white;border:2.5px solid #6B4FBB;cursor:pointer;box-shadow:0 2px 8px rgba(107,79,187,0.25);box-sizing:border-box;}
        .sl-ends{display:flex;justify-content:space-between;font-size:11px;color:#B8A9E8;margin-top:8px;}
        .kanal{background:white;border:1px solid rgba(107,79,187,0.10);border-radius:20px;padding:24px 28px;margin-bottom:28px;}
        .kanal-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;color:#2D1F52;margin-bottom:16px;}
        .kanal-row{display:flex;align-items:center;gap:16px;margin-bottom:12px;}
        .kanal-row:last-child{margin-bottom:0;}
        .kanal-label{font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:600;color:#2D1F52;width:140px;flex-shrink:0;}
        .kanal-bar-wrap{flex:1;height:8px;background:rgba(107,79,187,0.08);border-radius:100px;overflow:hidden;}
        .kanal-bar{height:100%;border-radius:100px;}
        .kanal-pct{font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;color:#6B4FBB;width:36px;text-align:right;flex-shrink:0;}
        .kanal-note{font-size:11px;color:#7A7596;font-weight:300;margin-top:12px;padding-top:12px;border-top:1px solid rgba(107,79,187,0.08);}
        .tip{background:#F5F2FF;border-left:3px solid #6B4FBB;border-radius:0 14px 14px 0;padding:16px 20px;margin-bottom:28px;font-size:13px;color:#2D1F52;line-height:1.7;font-weight:300;}
        .tip strong{font-weight:700;}
        .cta-btn{background:#6B4FBB;color:white;border:none;border-radius:100px;padding:17px 40px;font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(107,79,187,0.28);transition:all .2s;}
        .cta-btn:hover{background:#8B6FD4;transform:translateY(-2px);}
        .sidebar{position:sticky;top:80px;display:flex;flex-direction:column;gap:16px;}
        .sc{background:white;border:1px solid rgba(107,79,187,0.10);border-radius:18px;padding:22px 20px;}
        .sc-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:#2D1F52;margin-bottom:12px;}
        .sc-note{font-size:12px;color:#7A7596;line-height:1.6;margin-bottom:12px;font-weight:300;}
        .sc-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(107,79,187,0.06);font-size:13px;}
        .sc-row:last-of-type{border-bottom:none;}
        .sc-l{color:#7A7596;}
        .sc-r{font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;color:#2D1F52;}
        .sc-rv{color:#6B4FBB;}
        .rname{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:#6B4FBB;margin-bottom:3px;}
        .rpop{font-size:12px;color:#7A7596;font-weight:300;margin-bottom:12px;}
        .rsrc{font-size:10px;color:#B8A9E8;margin-top:10px;padding-top:8px;border-top:1px solid rgba(107,79,187,0.07);}
        .fragen{background:#F5F2FF;border-radius:16px;padding:20px;}
        .fragen h3{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:#2D1F52;margin-bottom:8px;}
        .fragen p{font-size:12px;color:#7A7596;line-height:1.6;margin-bottom:14px;font-weight:300;}
        .fragen-btn{background:#6B4FBB;color:white;border:none;border-radius:100px;padding:10px 22px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;}
        .region-picker{background:white;border:1px solid rgba(107,79,187,0.10);border-radius:14px;padding:18px;margin-bottom:20px;}
        .region-picker-title{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7A7596;margin-bottom:10px;}
        .region-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
        .region-tag{display:inline-flex;align-items:center;gap:4px;background:#FAECEC;border:1px solid #6B4FBB;border-radius:100px;padding:4px 12px;font-size:13px;font-weight:600;color:#6B4FBB;}
        .region-tag-x{background:none;border:none;cursor:pointer;font-size:16px;color:#7A7596;line-height:1;padding:0 4px;min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;}
        .region-total{font-size:12px;color:#7A7596;margin-bottom:8px;}
        .region-input{width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid rgba(107,79,187,0.10);font-size:14px;color:#2D1F52;background:#FDFCFF;outline:none;min-height:44px;}
        .region-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;background:white;border:1px solid rgba(107,79,187,0.10);border-radius:14px;box-shadow:0 8px 24px rgba(107,79,187,0.11);max-height:260px;overflow-y:auto;z-index:200;}
        .region-dropdown-item{padding:10px 14px;cursor:pointer;font-size:14px;color:#2D1F52;display:flex;justify-content:space-between;}
        .region-dropdown-item:hover{background:#FDFCFF;}
        .region-actions{display:flex;gap:8px;margin-top:12px;}
        .region-confirm-btn{min-height:44px;padding:8px 20px;border-radius:100px;background:#6B4FBB;color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;}
        .region-cancel-btn{min-height:44px;padding:8px 20px;border-radius:100px;background:transparent;color:#7A7596;border:1px solid rgba(107,79,187,0.10);font-size:14px;font-weight:600;cursor:pointer;}
        .mobile-calc{display:none;margin-bottom:20px;}
        .mobile-calc-btn{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;background:white;border:1px solid rgba(107,79,187,0.10);border-radius:14px;padding:12px 16px;font-size:14px;font-weight:600;color:#2D1F52;cursor:pointer;}
        .mobile-calc-body{background:white;border:1px solid rgba(107,79,187,0.10);border-top:none;border-radius:0 0 14px 14px;padding:12px 16px 16px;}
        .mobile-calc-row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;}
        @media (max-width:900px){
          .wrap{grid-template-columns:1fr;padding:20px 16px 80px;gap:24px;}
          .pkg-grid{grid-template-columns:1fr;}
          .sidebar{display:none;}
          .sliders{grid-template-columns:1fr;gap:20px;}
          .mobile-calc{display:block;}
        }
      `}</style>

      <div className="wrap">

        {/* ══════════════ MAIN COLUMN ══════════════ */}
        <div>

          {/* Eyebrow */}
          <div className="eyebrow">
            <div className="eline" />
            <span className="etxt">{stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 4'}</span>
          </div>

          <h1 className="step4-h1">Wie weit soll deine Kampagne strahlen?</h1>

          {/* ── CONTEXT BAR ── */}
          <div className="ctx-bar">
            <span className="badge-v">{ctBadgeLabel}</span>
            {isPolitik && briefing.selectedRegions && briefing.selectedRegions.length > 0 ? (
              <>
                {briefing.selectedRegions.map(r => (
                  <span key={r.name} className="badge-r">📍 {r.name}</span>
                ))}
                <span style={{ fontSize: '13px', color: '#7A7596' }}>
                  {stimmber.toLocaleString('de-CH')} Stimmberechtigte
                </span>
              </>
            ) : (
              <span className="badge-r">📍 {regionName}</span>
            )}
            {isPolitik && briefing.daysUntil != null && (
              <span className="badge-d">🗳️ Abstimmung in <strong>{briefing.daysUntil}</strong> Tagen</span>
            )}
            <button
              type="button"
              className="ctx-change"
              onClick={() => { setRegionPickerOpen(o => !o); setEditRegions((briefing.selectedRegions ?? []) as Region[]); setRegionQuery(''); }}
            >
              Region ändern
            </button>
          </div>

          {/* Region picker */}
          {regionPickerOpen && (
            <div className="region-picker">
              <div className="region-picker-title">
                {isPolitik ? 'Regionen bearbeiten' : 'Region ändern'}
              </div>
              {isPolitik && editRegions.length > 0 && (
                <>
                  <div className="region-tags">
                    {editRegions.map(r => (
                      <span key={r.name} className="region-tag">
                        {r.name}
                        <button type="button" className="region-tag-x" onClick={() => removeEditRegion(r.name)}>×</button>
                      </span>
                    ))}
                  </div>
                  <p className="region-total">
                    Total: <strong>{editTotalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
                  </p>
                </>
              )}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="region-input"
                  value={regionQuery}
                  placeholder={isPolitik ? 'Kanton oder Gemeinde suchen...' : 'Kanton suchen...'}
                  onChange={e => { setRegionQuery(e.target.value); setRegionDropdownOpen(true); }}
                  onFocus={() => setRegionDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setRegionDropdownOpen(false), 200)}
                />
                {regionDropdownOpen && regionSearchResults.length > 0 && (
                  <div className="region-dropdown">
                    {regionSearchResults.map(r => (
                      <div key={r.name} className="region-dropdown-item" onMouseDown={() => addEditRegion(r)}>
                        <span>{r.name}</span>
                        <span style={{ fontSize: '11px', color: '#B8A9E8' }}>{r.stimm?.toLocaleString('de-CH')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="region-actions">
                {isPolitik && editRegions.length > 0 && (
                  <button type="button" className="region-confirm-btn" onClick={confirmRegionEdit}>Übernehmen</button>
                )}
                <button type="button" className="region-cancel-btn" onClick={() => setRegionPickerOpen(false)}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* ── PACKAGE CARDS ── */}
          <div className="pkg-grid">
            {PAKETE.map((pkg, i) => {
              const isActive = selectedPkg === pkg.id;
              const r        = pkgReach[i];
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handlePackageSelect(pkg)}
                  className={`pkg${isActive ? ' active' : ''}`}
                >
                  {pkg.recommended && <div className="pkg-rec">Empfohlen</div>}
                  <div className="pkg-check">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="pkg-lbl">{pkg.label}</div>
                  <div className="pkg-price">{fmtCHF(pkg.budget)}</div>
                  <div className="pkg-dur">{durLabel(pkg.weeks)} · {fmtN(r.screens)} Screens</div>
                  <div className="pkg-reach">Deine Botschaft erreicht ~{fmtN(r.von)}–{fmtN(r.bis)} {einwohner}</div>
                </button>
              );
            })}
          </div>

          {/* ── PROPOSAL CARD ── */}
          <div className="proposal">
            <div className="prop-head">
              <div>
                <div className="prop-badge">Unser Vorschlag</div>
                <div className="prop-num">~{fmtN(reach.von)} – {fmtN(reach.bis)}</div>
                <div className="prop-sub">
                  Deine Botschaft erreicht ~{fmtN(reach.von)}–{fmtN(reach.bis)} {einwohner}
                </div>
              </div>
              <div className="prop-right">
                <div className="prop-price">{fmtCHF(budget)}</div>
                <div className="prop-psub">{durLabel(currentPaket.weeks)} · {fmtN(reach.screens)} Screens</div>
              </div>
            </div>
            <div className="stats" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
              <div className="stat">
                <div className="stat-lbl">Screens</div>
                <div className="stat-val">{fmtN(reach.screens)}</div>
                <div className="stat-sub">digitale Standorte</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Laufzeit</div>
                <div className="stat-val">{durLabel(currentPaket.weeks)}</div>
                <div className="stat-sub">Kampagnendauer</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Unique Reach</div>
                <div className="stat-val" style={{ fontSize: 'clamp(13px,1.2vw,16px)' }}>~{fmtN(reach.von)}–{fmtN(reach.bis)}</div>
                <div className="stat-sub">{reach.vonPct}%–{reach.bisPct}% der Stimmber.</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">Reichweite</div>
                <div className="stat-val">{reach.vonPct}%–{reach.bisPct}%</div>
                <div className="stat-sub">der Stimmberechtigten</div>
              </div>
            </div>
          </div>

          {/* ── SLIDERS ── */}
          <div className="sliders">
            <div>
              <div className="sl-top">
                <span className="sl-label">Budget</span>
                <span className="sl-val">{fmtCHF(budget)}</span>
              </div>
              <input
                type="range"
                className="step4-range"
                min={2500} max={50000} step={500} value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                style={{ background: `linear-gradient(to right, #6B4FBB ${budgetPct}%, rgba(107,79,187,0.12) ${budgetPct}%)` }}
              />
              <div className="sl-ends"><span>CHF 2&apos;500</span><span>CHF 50&apos;000</span></div>
            </div>
            <div>
              <div className="sl-top">
                <span className="sl-label">Laufzeit</span>
                <span className="sl-val">{durLabel(duration)}</span>
              </div>
              <input
                type="range"
                className="step4-range"
                min={1} max={8} step={1} value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{ background: `linear-gradient(to right, #6B4FBB ${durationPct}%, rgba(107,79,187,0.12) ${durationPct}%)` }}
              />
              <div className="sl-ends"><span>1 Woche</span><span>8 Wochen</span></div>
            </div>
          </div>

          {/* ── SMART TIP ── */}
          <div className="tip">💡 <strong>Tipp:</strong> {smartTip}</div>

          {/* ── CTA ── */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="cta-btn" onClick={handleNext}>
              Weiter zu den Werbemitteln →
            </button>
            {prevStep && (
              <button
                type="button"
                onClick={prevStep}
                style={{ background: 'transparent', color: '#7A7596', border: '1px solid rgba(107,79,187,0.10)', borderRadius: '100px', padding: '15px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Zurück
              </button>
            )}
          </div>

        </div>{/* end main column */}

        {/* ══════════════ SIDEBAR ══════════════ */}
        <div className="sidebar">

          <div className="sc">
            <div className="sc-title">Wie berechnen wir das?</div>
            <div className="sc-note">Deine Reichweite wird anhand der DOOH-Screens und der Stimmberechtigten in deiner Zielregion berechnet.</div>
            <div className="sc-row"><span className="sc-l">Reichweite</span><span className="sc-r">~{fmtN(reach.von)} – {fmtN(reach.bis)}</span></div>
            <div className="sc-row"><span className="sc-l">Screens</span><span className="sc-r">{fmtN(reach.screens)}</span></div>
            <div className="sc-row"><span className="sc-l">Laufzeit</span><span className="sc-r sc-rv">{durLabel(currentPaket.weeks)}</span></div>
          </div>

          <div className="sc">
            <div className="sc-title">Deine Zielregion</div>
            <div className="rname">📍 {regionName}</div>
            <div className="rpop">{stimmber.toLocaleString('de-CH')} {isPolitik ? 'Stimmberechtigte' : 'Einwohner'}</div>
            <div className="sc-row"><span className="sc-l">DOOH Screens</span><span className="sc-r">~{fmtN(reach.screens)}</span></div>
            <div className="sc-row"><span className="sc-l">Reichweite</span><span className="sc-r">~{reach.vonPct}%–{reach.bisPct}%</span></div>
            <div className="rsrc">Quelle: VIO DOOH-Screendaten & BFS 2023</div>
          </div>

          <div className="fragen">
            <h3>Fragen?</h3>
            <p>Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.</p>
            <button type="button" className="fragen-btn">Gespräch buchen →</button>
          </div>

        </div>{/* end sidebar */}

      </div>
    </section>
  );
}
