'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';

// Dynamic import avoids SSR issues with D3/canvas
const SwissMap = dynamic(() => import('./SwissMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 340, background: '#FAF7F2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8490', fontSize: 13 }}>
      Karte wird geladen…
    </div>
  ),
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#C1666B', pd: '#A84E53', pl: '#F9ECEC',
  taupe: '#5C4F3D', muted: '#8A8490', border: '#EDE8E0',
  bg: '#FAF7F2', white: '#FFFFFF',
} as const;

// ─── Canton population fallback (for B2C/B2B) ────────────────────────────────
const CANTON_POP: Record<string, { bev: number; stimm: number }> = {
  'Zürich': { bev: 1539000, stimm: 1077300 },
  'Bern': { bev: 1050000, stimm: 735000 },
  'Luzern': { bev: 428000, stimm: 299600 },
  'Uri': { bev: 37000, stimm: 25900 },
  'Schwyz': { bev: 166000, stimm: 116200 },
  'Obwalden': { bev: 39000, stimm: 27300 },
  'Nidwalden': { bev: 44000, stimm: 30800 },
  'Glarus': { bev: 41000, stimm: 28700 },
  'Zug': { bev: 131000, stimm: 91700 },
  'Freiburg': { bev: 337000, stimm: 235900 },
  'Solothurn': { bev: 283000, stimm: 198100 },
  'Basel-Stadt': { bev: 181000, stimm: 128100 },
  'Basel-Landschaft': { bev: 290000, stimm: 199400 },
  'Schaffhausen': { bev: 84000, stimm: 57200 },
  'Appenzell A.Rh.': { bev: 58000, stimm: 40800 },
  'Appenzell I.Rh.': { bev: 16000, stimm: 11500 },
  'St. Gallen': { bev: 514000, stimm: 340900 },
  'Graubünden': { bev: 201000, stimm: 138900 },
  'Aargau': { bev: 693000, stimm: 453400 },
  'Thurgau': { bev: 279000, stimm: 185700 },
  'Tessin': { bev: 356000, stimm: 249600 },
  'Waadt': { bev: 815000, stimm: 516900 },
  'Wallis': { bev: 345000, stimm: 215200 },
  'Neuenburg': { bev: 175000, stimm: 119800 },
  'Genf': { bev: 509000, stimm: 330000 },
  'Jura': { bev: 73000, stimm: 52800 },
  'Gesamte Schweiz': { bev: 8816000, stimm: 5571000 },
};

// ─── Reach rate & budget cap by region size ───────────────────────────────────
function getReachRate(stimmber: number): number {
  if (stimmber < 50000)  return 0.55;
  if (stimmber < 200000) return 0.45;
  if (stimmber < 600000) return 0.35;
  return 0.25;
}

function getBudgetCap(stimmber: number): number {
  if (stimmber < 50000)  return 25000;
  if (stimmber < 200000) return 75000;
  if (stimmber < 600000) return 150000;
  return 300000;
}

// ─── Tier definitions ────────────────────────────────────────────────────────
const BLENDED_CPM = 40;

const TIERS = [
  { id: 0 as const, label: 'Sichtbar',  freqPerWeek: 3, weeks: 1, lzLabel: '1 Woche'  },
  { id: 1 as const, label: 'Empfohlen', freqPerWeek: 5, weeks: 2, lzLabel: '2 Wochen' },
  { id: 2 as const, label: 'Präsenz',   freqPerWeek: 7, weeks: 4, lzLabel: '4 Wochen' },
];

const TIER_RATES = [0.14, 0.35, 0.60];

function calcTierBudget(stimmber: number, tierIdx: number): number {
  const rate = getReachRate(stimmber);
  const cap  = getBudgetCap(stimmber);
  const t    = TIERS[tierIdx];
  const targetReach = stimmber * rate * TIER_RATES[tierIdx];
  const impressions = targetReach * t.freqPerWeek * t.weeks;
  const raw = (impressions / 1000) * BLENDED_CPM;
  return Math.min(cap, Math.max(2500, Math.round(raw / 500) * 500));
}

// ─── Reach calculation ────────────────────────────────────────────────────────
function calcReach(budget: number, freqPerWeek: number, weeks: number, stimmber: number) {
  const doohImp    = (budget * 0.70 / 50)  * 1000;
  const displayImp = (budget * 0.30 / 15) * 1000;
  const totalImp   = doohImp + displayImp;
  const totalFreq  = freqPerWeek * weeks;
  const rawReach   = totalImp / totalFreq;
  const maxReach   = stimmber * getReachRate(stimmber);
  const reach      = Math.min(rawReach, maxReach);
  const lo  = Math.round(reach * 0.88 / 1000) * 1000;
  const hi  = Math.round(reach * 1.12 / 1000) * 1000;
  const mid = Math.round(reach / 1000) * 1000;
  const pct = Math.round(reach / stimmber * 100);
  return { lo, hi, mid, pct };
}

// ─── Date helper (for startDate init only) ────────────────────────────────────
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step4Budget({ briefing, updateBriefing, nextStep }: Props) {
  const isPolitik = briefing.campaignType === 'politik';

  // Region name for display and fallback lookup
  const regionName = isPolitik
    ? (briefing.selectedRegions?.[0]?.name ?? briefing.politikRegion ?? 'Gesamte Schweiz')
    : (briefing.analysis?.region?.[0] ?? 'Gesamte Schweiz');

  const popData = CANTON_POP[regionName] ?? CANTON_POP['Gesamte Schweiz'];
  const popSize = isPolitik
    ? (briefing.totalStimmber ?? briefing.stimmberechtigte ?? popData.stimm)
    : popData.bev;

  // Map: pass selected region names for Politik zoom/highlight
  const mapHighlightRegions = isPolitik && briefing.selectedRegions
    ? briefing.selectedRegions.map(r => r.name)
    : [];

  const visibleTiers = TIERS;

  // Compute dynamic budgets for each tier based on popSize
  const tierBudgets: Record<0 | 1 | 2, number> = {
    0: calcTierBudget(popSize, 0),
    1: calcTierBudget(popSize, 1),
    2: calcTierBudget(popSize, 2),
  };

  // Default to Empfohlen (id=1) if visible, else highest visible
  const defaultTier = visibleTiers[Math.min(1, visibleTiers.length - 1)];

  const [budget, setBudget] = useState<number>(() => tierBudgets[defaultTier.id]);
  const [tierSelected, setTierSelected] = useState<0 | 1 | 2>(defaultTier.id);
  const [laufzeitOverride, setLaufzeitOverride] = useState<1 | 2 | 4 | null>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [regionQuery, setRegionQuery] = useState('');
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [editRegions, setEditRegions] = useState<Region[]>(() => (briefing.selectedRegions ?? []) as Region[]);

  // Reinit tier budget when popSize changes (e.g. user changes region in step 2 and comes back)
  useEffect(() => {
    const newDefault = visibleTiers[Math.min(1, visibleTiers.length - 1)];
    setTierSelected(newDefault.id);
    setBudget(calcTierBudget(popSize, newDefault.id));
  }, [popSize]); // eslint-disable-line react-hooks/exhaustive-deps
  const [startDate, setStartDate] = useState<string>(() => {
    if (briefing.votingDate && briefing.recommendedLaufzeit) {
      const d = new Date(briefing.votingDate + 'T12:00:00');
      d.setDate(d.getDate() - briefing.recommendedLaufzeit * 7);
      const today = new Date();
      const start = d < today ? today : d;
      return start.toISOString().split('T')[0];
    }
    return todayStr();
  });

  const activeTier     = TIERS[tierSelected];
  const currentFreq    = activeTier.freqPerWeek;
  const currentLzWeeks = laufzeitOverride ?? activeTier.weeks;
  const currentLzLabel = laufzeitOverride
    ? `${laufzeitOverride} ${laufzeitOverride === 1 ? 'Woche' : 'Wochen'}`
    : activeTier.lzLabel;

  const sliderMax = getBudgetCap(popSize);

  const { lo, hi, mid, pct } = calcReach(budget, currentFreq, currentLzWeeks, popSize);
  const reachFraction = Math.min(getReachRate(popSize), mid / Math.max(1, popSize));

  const needsBeratung = calcTierBudget(popSize, 0) < 5000;

  // Region picker search
  const regionSearchResults = useMemo(() => {
    const q = regionQuery.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => isPolitik || r.type === 'kanton') // B2C/B2B: kantone only
      .filter(r => !editRegions.some(s => s.name === r.name));
    const schweiz = pool.filter(r => r.type === 'schweiz');
    const kantone = pool.filter(r => r.type === 'kanton');
    const staedte = pool.filter(r => r.type === 'stadt').sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return [...schweiz, ...kantone, ...staedte].slice(0, 8);
  }, [regionQuery, editRegions, isPolitik]);

  const editTotalStimm = editRegions.reduce((sum, r) => sum + r.stimm, 0);

  const addEditRegion = (r: Region) => {
    if (!isPolitik) {
      // B2C/B2B: single select — update analysis.region
      updateBriefing({ analysis: briefing.analysis ? { ...briefing.analysis, region: [r.name] } : null });
      setRegionPickerOpen(false);
      setRegionQuery('');
      return;
    }
    if (editRegions.length >= 10) return;
    setEditRegions(prev => [...prev, r]);
    setRegionQuery('');
    setRegionDropdownOpen(false);
  };

  const removeEditRegion = (name: string) => {
    setEditRegions(prev => prev.filter(r => r.name !== name));
  };

  const confirmRegionEdit = () => {
    if (!isPolitik || editRegions.length === 0) return;
    const days = briefing.daysUntil ?? 999;
    const availableIdxs = TIERS
      .map((t, i) => ({ i, t }))
      .filter(({ t }) => t.weeks === 1 || t.weeks * 7 <= days)
      .map(({ i }) => i);
    const recIdx = availableIdxs[Math.min(1, availableIdxs.length - 1)] ?? 0;
    const newTotal = editTotalStimm;
    const newBudget = calcTierBudget(newTotal, recIdx);
    updateBriefing({
      selectedRegions: editRegions.map(r => ({ name: r.name, type: r.type, stimm: r.stimm, kanton: r.kanton })),
      totalStimmber: newTotal,
      stimmberechtigte: newTotal,
      politikRegion: editRegions[0]?.name ?? '',
      politikRegionType: (editRegions[0]?.type ?? 'kanton') as 'kanton' | 'stadt' | 'schweiz',
      recommendedBudget: newBudget,
    });
    setBudget(newBudget);
    setRegionPickerOpen(false);
    setRegionQuery('');
  };

  const handleTierSelect = (id: 0 | 1 | 2) => {
    setTierSelected(id);
    setBudget(tierBudgets[id]);
  };

  // Slider changes budget and auto-highlights closest tier
  const handleSliderChange = (val: number) => {
    setBudget(val);
    // Auto-highlight the tier whose budget is closest to the slider value
    let closest: 0 | 1 | 2 = visibleTiers[0].id;
    let minDist = Infinity;
    for (const t of visibleTiers) {
      const dist = Math.abs(tierBudgets[t.id] - val);
      if (dist < minDist) { minDist = dist; closest = t.id; }
    }
    setTierSelected(closest);
  };

  const handleNext = () => {
    updateBriefing({
      budget,
      laufzeit: currentLzWeeks as number,
      startDate,
      reach: mid,
      freq: currentFreq,
      tierSelected,
      b2bReach: null,
    });
    nextStep();
  };

  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;
  const fmtN   = (n: number) => Math.round(n).toLocaleString('de-CH');
  const fmtRange = (a: number, b: number) => `${fmtN(a)}–${fmtN(b)}`;

  const personLabel = isPolitik ? 'Stimmberechtigte' : 'Personen';

  const ctBadgeLabel = briefing.campaignType === 'b2c' ? 'B2C' : briefing.campaignType === 'b2b' ? 'B2B' : 'Politische Kampagne';
  const ctBadgeColor = briefing.campaignType === 'politik' ? '#7C3AED' : C.primary;

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Eyebrow ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 18, height: 2, background: C.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 4
          </span>
        </div>

        {/* ── Heading ── */}
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 20, color: C.taupe }}>
          Wie weit soll deine Kampagne strahlen?
        </h1>

        {/* ── Context bar ── */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 18px', marginBottom: 6, display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 10, fontSize: 13, color: C.taupe }}>
          <span style={{ background: ctBadgeColor, color: '#fff', borderRadius: 100, padding: '3px 11px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em' }}>
            {ctBadgeLabel}
          </span>
          {isPolitik && briefing.selectedRegions && briefing.selectedRegions.length > 0 ? (
            <span style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, alignItems: 'center' }}>
              {briefing.selectedRegions.map(r => (
                <span key={r.name} style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 100, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                  📍 {r.name}
                </span>
              ))}
              <span style={{ color: C.muted }}>·&nbsp;{popSize.toLocaleString('de-CH')}&nbsp;Stimmberechtigte total</span>
            </span>
          ) : regionName ? (
            <span style={{ color: C.taupe }}>
              📍 <strong>{regionName}</strong>
              &nbsp;·&nbsp;
              {popSize.toLocaleString('de-CH')}&nbsp;{isPolitik ? 'Stimmberechtigte' : 'Personen'}
            </span>
          ) : null}
          {isPolitik && briefing.daysUntil != null && (
            <span style={{ color: '#7A5500', background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: 8, padding: '3px 10px' }}>
              🗳️ Abstimmung in <strong>{briefing.daysUntil}</strong> Tagen
            </span>
          )}
          <button
            type="button"
            onClick={() => { setRegionPickerOpen(o => !o); setEditRegions((briefing.selectedRegions ?? []) as Region[]); setRegionQuery(''); }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, textDecoration: 'underline', fontFamily: 'var(--font-outfit), sans-serif' }}
          >
            Region ändern
          </button>
        </div>

        {/* ── Inline region picker ── */}
        {regionPickerOpen && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
              {isPolitik ? 'Regionen bearbeiten' : 'Region ändern'}
            </div>

            {isPolitik && editRegions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 }}>
                {editRegions.map(r => (
                  <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9ECEC', border: '1px solid #C1666B', color: '#A84E53', borderRadius: 100, padding: '4px 8px 4px 12px', fontSize: 13, fontWeight: 600 }}>
                    {r.name}
                    <button type="button" onClick={() => removeEditRegion(r.name)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 15, padding: '0 3px', lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            {isPolitik && editRegions.length > 0 && (
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                Total: <strong style={{ color: C.taupe }}>{editTotalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={regionQuery}
                placeholder={isPolitik ? 'Kanton oder Gemeinde suchen...' : 'Kanton suchen...'}
                onChange={e => { setRegionQuery(e.target.value); setRegionDropdownOpen(true); }}
                onFocus={() => setRegionDropdownOpen(true)}
                onBlur={() => setTimeout(() => setRegionDropdownOpen(false), 200)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: 'var(--font-outfit), sans-serif', color: C.taupe, backgroundColor: C.bg, outline: 'none' }}
              />
              {regionDropdownOpen && regionSearchResults.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(44,44,62,.12)', maxHeight: 300, overflowY: 'auto', zIndex: 200 }}>
                  {regionSearchResults.filter(r => r.type === 'schweiz').map(r => (
                    <div key={r.name} onMouseDown={() => addEditRegion(r)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, color: C.taupe, display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <span>{r.name}</span><span style={{ fontSize: 11, color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                    </div>
                  ))}
                  {regionSearchResults.filter(r => r.type === 'kanton').length > 0 && (
                    <div>
                      <div style={{ padding: '6px 14px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Kantone</div>
                      {regionSearchResults.filter(r => r.type === 'kanton').map(r => (
                        <div key={r.name} onMouseDown={() => addEditRegion(r)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, color: C.taupe, display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <span>{r.name}</span><span style={{ fontSize: 11, color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {regionSearchResults.filter(r => r.type === 'stadt').length > 0 && (
                    <div>
                      <div style={{ padding: '6px 14px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Städte & Gemeinden</div>
                      {regionSearchResults.filter(r => r.type === 'stadt').map(r => (
                        <div key={r.name} onMouseDown={() => addEditRegion(r)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, color: C.taupe, display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <span>{r.name}</span><span style={{ fontSize: 11, color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isPolitik && editRegions.length > 0 && (
              <button type="button" onClick={confirmRegionEdit} style={{ marginTop: 12, padding: '9px 20px', borderRadius: 100, background: C.primary, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-outfit), sans-serif' }}>
                Übernehmen
              </button>
            )}
            <button type="button" onClick={() => setRegionPickerOpen(false)} style={{ marginTop: 12, marginLeft: isPolitik && editRegions.length > 0 ? 8 : 0, padding: '9px 20px', borderRadius: 100, background: 'none', color: C.muted, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-outfit), sans-serif' }}>
              Abbrechen
            </button>
          </div>
        )}

        {/* ── Three tier cards (or Beratung box for Sichtbar) ── */}
        {needsBeratung && (
          <div style={{ background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#7A5500', marginBottom: 6 }}>
              Persönliche Beratung empfohlen
            </div>
            <div style={{ fontSize: 13, color: '#7A5500', lineHeight: 1.6, marginBottom: 12 }}>
              Für {regionName} mit {fmtN(popSize)} Stimmberechtigten gestalten wir die optimale
              Kampagne gemeinsam mit dir — so stellst du sicher, dass jeder Franken wirkt.
            </div>
            <a href="https://calendly.com/vio" target="_blank" style={{ background: '#C1666B', color: '#fff', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              Kostenlos beraten lassen →
            </a>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: needsBeratung ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 10 }}>
          {TIERS.filter(t => needsBeratung ? t.id !== 0 : true).map((t) => {
            const isActive = tierSelected === t.id;
            const tBudget  = tierBudgets[t.id];
            const { lo: tLo, hi: tHi, pct: tPct } = calcReach(tBudget, t.freqPerWeek, t.weeks, popSize);
            return (
              <div
                key={t.id}
                onClick={() => handleTierSelect(t.id)}
                style={{
                  border: isActive ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                  background: isActive ? C.pl : C.white,
                  borderRadius: 14, padding: '16px 14px',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  position: 'relative', userSelect: 'none',
                }}
              >
                {t.id === 1 && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: C.pl, border: `1px solid ${C.pd}`, color: C.pd, borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', whiteSpace: 'nowrap' as const }}>
                    Empfohlen
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 18, fontWeight: 400, color: C.taupe, marginBottom: 4 }}>
                  {t.label}
                </div>
                <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, color: C.primary, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 4 }}>
                  {fmtCHF(tBudget)}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                  {t.lzLabel} · {t.freqPerWeek}× Frequenz
                </div>
                <div style={{ fontSize: 11, color: isActive ? C.pd : C.muted, lineHeight: 1.4 }}>
                  ~{fmtRange(tLo, tHi)} {personLabel} ({tPct}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Advisory text ── */}
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, padding: '14px 0', borderTop: `1px solid ${C.border}`, marginTop: 8 }}>
          💡 {(() => {
            const rate = Math.round(getReachRate(popSize) * 100);
            if (popSize < 50000) return `${regionName} ist eine überschaubare Gemeinde — mit gezieltem Einsatz erreichst du bis zu ${rate}% der Stimmberechtigten. Wir empfehlen einen starken Kurzauftritt kurz vor dem Abstimmungstermin.`;
            if (popSize < 200000) return `In ${regionName} erreichst du realistisch ${rate}% der Stimmberechtigten. Die Kombination aus Screens an Bahnhöfen und Online-Bannern sorgt für maximale Sichtbarkeit im entscheidenden Moment.`;
            if (popSize < 600000) return `${regionName} ist ein grosses Einzugsgebiet — daher kalkulieren wir mit ${rate}% Reichweite. Ein mehrwöchiger Auftritt auf DOOH-Screens und digitalen Kanälen sorgt für die nötige Frequenz.`;
            return `Mit ${regionName} deckst du eine der grössten Regionen der Schweiz ab. Wir empfehlen eine gestaffelte Kampagne: zuerst Awareness über DOOH, dann Mobilisierung über Display in den letzten 2 Wochen.`;
          })()}
        </div>

        {/* ── Laufzeit override buttons ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Laufzeit:</span>
          {([{ weeks: 1 as const, label: '1 Woche' }, { weeks: 2 as const, label: '2 Wochen' }, { weeks: 4 as const, label: '4 Wochen' }]).map(opt => {
            const isActive = currentLzWeeks === opt.weeks;
            return (
              <button
                key={opt.weeks}
                type="button"
                onClick={() => setLaufzeitOverride(laufzeitOverride === opt.weeks ? null : opt.weeks)}
                style={{ padding: '6px 16px', borderRadius: 100, border: `1.5px solid ${isActive ? C.primary : C.border}`, background: isActive ? C.pl : C.white, color: isActive ? C.pd : C.taupe, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font-outfit), sans-serif' }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* ── Headline stat (korridor) ── */}
        <div style={{ background: C.pl, borderRadius: 12, padding: '16px 22px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, color: C.taupe, fontWeight: 400, lineHeight: 1.3 }}>
            {fmtRange(lo, hi)}&nbsp;{personLabel} sehen deine Kampagne&nbsp;{currentFreq}×&nbsp;— über {currentLzLabel}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Das entspricht ca. {pct}% der {personLabel} in {regionName}
          </div>
        </div>

        {/* ── DOOH + Display breakdown ── */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>
            So wirkt dein Budget
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.taupe, marginBottom: 4 }}>📺 DOOH — Digitale Screens</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                Bahnhöfe, Einkaufszentren, belebte Orte<br/>
                <strong style={{ color: C.taupe }}>{fmtN(Math.round((Math.round(budget * 0.70) / 50) * 1000))} Impressionen</strong>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.taupe, marginBottom: 4 }}>🖥 Display — Online Banner</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                Schweizer Websites & Apps<br/>
                <strong style={{ color: C.taupe }}>{fmtN(Math.round(((budget - Math.round(budget * 0.70)) / 15) * 1000))} Impressionen</strong>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            70% DOOH · 30% Display · Ø {activeTier.freqPerWeek}× pro Person / Woche über {activeTier.lzLabel}
          </div>
        </div>

        {/* ── Budget slider ── */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: 10 }}>
            Budget feinjustieren
          </div>
          <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 32, color: C.taupe, letterSpacing: '-.03em', marginBottom: 10 }}>
            {fmtCHF(budget)}
          </div>
          <input
            type="range"
            min={2500}
            max={sliderMax}
            step={500}
            value={budget}
            onChange={e => handleSliderChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.primary, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 5 }}>
            <span>CHF 2'500</span>
            <span>{fmtCHF(sliderMax)}</span>
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14, padding: '16px 22px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>
            Reichweite visualisieren
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SwissMap
              highlightRegions={mapHighlightRegions}
              campaignType={briefing.campaignType}
              reachFraction={reachFraction}
              width={560}
              height={340}
            />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: C.muted, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.primary }} />
              <span>Erreichbar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#D4CEC4' }} />
              <span>Potenzial</span>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <button
          type="button"
          onClick={handleNext}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '15px 32px', fontFamily: 'var(--font-outfit), sans-serif', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,102,107,.3)', transition: 'all .18s', marginTop: 8 }}
          onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
        >
          Weiter zu den Werbemitteln →
        </button>

      </div>
    </section>
  );
}
