'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#C1666B', pd: '#A84E53', pl: '#FFF8F8',
  taupe: '#5C4F3D', muted: '#8A8490', border: '#EDE8E0',
  bg: '#FAF7F2', white: '#FFFFFF',
} as const;

// ─── Canton population ────────────────────────────────────────────────────────
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

// ─── Packages ─────────────────────────────────────────────────────────────────
const PACKAGES = [
  { id: 'sichtbar'  as const, label: 'Sichtbar',  budget: 2500,  duration: 2, freq: 3, recommended: false },
  { id: 'praesenz'  as const, label: 'Präsenz',   budget: 9500,  duration: 4, freq: 7, recommended: true  },
  { id: 'dominanz'  as const, label: 'Dominanz',  budget: 25000, duration: 6, freq: 7, recommended: false },
] as const;

type PackageId = 'sichtbar' | 'praesenz' | 'dominanz';

// ─── Calculation ──────────────────────────────────────────────────────────────
function calcReach(budget: number, stimmber: number) {
  const freq        = budget < 5000 ? 3 : budget < 8000 ? 5 : 7;
  const doohBudget  = budget * 0.7;
  const dispBudget  = budget * 0.3;
  const doohContacts = Math.round(doohBudget / 50 * 1000);
  const dispContacts = Math.round(dispBudget / 15 * 1000);
  const uniqueLow    = Math.min(Math.round(doohContacts / freq * 0.85), stimmber);
  const uniqueHigh   = Math.min(Math.round(doohContacts / freq * 1.1),  stimmber);
  const uniqueMid    = Math.round((uniqueLow + uniqueHigh) / 2);
  const pct          = Math.min(Math.round(uniqueHigh / stimmber * 100), 100);
  const screens      = Math.max(3, Math.round(budget / 950));
  return { freq, doohContacts, dispContacts, uniqueLow, uniqueHigh, uniqueMid, pct, screens };
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
  isActive: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step4Budget({ briefing, updateBriefing, nextStep }: Props) {
  const isPolitik  = briefing.campaignType === 'politik';

  const regionName = isPolitik
    ? (briefing.selectedRegions?.[0]?.name ?? briefing.politikRegion ?? 'Gesamte Schweiz')
    : (briefing.analysis?.region?.[0] ?? 'Gesamte Schweiz');

  const popData  = CANTON_POP[regionName] ?? CANTON_POP['Gesamte Schweiz'];
  const stimmber = isPolitik
    ? (briefing.totalStimmber ?? briefing.stimmberechtigte ?? popData.stimm)
    : popData.bev;

  // ── State ──
  const [budget,          setBudget]          = useState(9500);
  const [duration,        setDuration]        = useState(4);
  const [selectedPackage, setSelectedPackage] = useState<PackageId>('praesenz');
  const [regionPickerOpen,    setRegionPickerOpen]    = useState(false);
  const [regionQuery,         setRegionQuery]         = useState('');
  const [regionDropdownOpen,  setRegionDropdownOpen]  = useState(false);
  const [editRegions, setEditRegions] = useState<Region[]>(() => (briefing.selectedRegions ?? []) as Region[]);
  const [startDate] = useState<string>(() => {
    if (briefing.votingDate && briefing.recommendedLaufzeit) {
      const d = new Date(briefing.votingDate + 'T12:00:00');
      d.setDate(d.getDate() - briefing.recommendedLaufzeit * 7);
      const today = new Date();
      const start = d < today ? today : d;
      return start.toISOString().split('T')[0];
    }
    return todayStr();
  });

  // ── Derived ──
  const { freq, doohContacts, dispContacts, uniqueLow, uniqueHigh, uniqueMid, pct, screens } =
    calcReach(budget, stimmber);

  const pkgReach = PACKAGES.map(p => {
    const dooh = Math.round(p.budget * 0.7 / 50 * 1000);
    const lo   = Math.min(Math.round(dooh / p.freq * 0.85), stimmber);
    const hi   = Math.min(Math.round(dooh / p.freq * 1.1),  stimmber);
    return { lo, hi, pct: Math.min(Math.round(hi / stimmber * 100), 100) };
  });

  const smartTip: string = (() => {
    if (duration > 4 && budget < 5000)
      return "Tipp: Für dieses Budget lieber 2–3 Wochen wählen — so bleibt die Frequenz hoch genug um zu wirken.";
    if (pct >= 55)
      return "Stark: Du erreichst über die Hälfte aller Stimmberechtigten. Maximale Durchdringung.";
    if (pct >= 40)
      return `Gute Durchdringung — ${pct}% der Stimmberechtigten sehen deine Kampagne mindestens ${freq}×.`;
    return "Tipp: Mit etwas mehr Budget lässt sich die Reichweite deutlich steigern — ab CHF 5'000 steigt die Frequenz auf 5× pro Person.";
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

  const editTotalStimm = editRegions.reduce((sum, r) => sum + r.stimm, 0);

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

  const handlePackageSelect = (pkg: typeof PACKAGES[number]) => {
    setSelectedPackage(pkg.id);
    setBudget(pkg.budget);
    setDuration(pkg.duration);
  };

  const handleNext = () => {
    updateBriefing({
      budget, laufzeit: duration, startDate,
      reach: uniqueMid, freq,
      tierSelected: PACKAGES.findIndex(p => p.id === selectedPackage),
      b2bReach: null,
    });
    nextStep();
  };

  // ── Formatters ──
  const fmtCHF   = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;
  const fmtN     = (n: number) => Math.round(n).toLocaleString('de-CH');
  const fmtRange = (a: number, b: number) => `${fmtN(a)}–${fmtN(b)}`;

  const personLabel   = isPolitik ? 'Stimmberechtigte' : 'Personen';
  const ctBadgeLabel  = briefing.campaignType === 'b2c' ? 'B2C' : briefing.campaignType === 'b2b' ? 'B2B' : 'Politische Kampagne';
  const ctBadgeColor  = briefing.campaignType === 'politik' ? '#7C3AED' : C.primary;
  const durLabel      = (w: number) => `${w} ${w === 1 ? 'Woche' : 'Wochen'}`;

  const budgetPct   = ((budget   - 2500) / (50000 - 2500)) * 100;
  const durationPct = ((duration - 1)    / (8     - 1))    * 100;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <section style={{ backgroundColor: C.bg }}>
      <style>{`
        .vio-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; border: none; display: block; }
        .vio-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 2px solid #C1666B; cursor: pointer; box-shadow: 0 1px 6px rgba(193,102,107,.3); margin-top: -8px; }
        .vio-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; }
        .vio-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 2px solid #C1666B; cursor: pointer; box-shadow: 0 1px 6px rgba(193,102,107,.3); box-sizing: border-box; }
        .vio-slider::-moz-range-progress { background: #C1666B; border-radius: 2px; height: 4px; }
        .vio-slider::-moz-range-track { height: 4px; border-radius: 2px; background: #F0EBE3; }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 80px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* ══════════════ MAIN COLUMN ══════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 18, height: 2, background: C.primary, borderRadius: 2 }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' as const }}>
              Schritt 4
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 24, color: C.taupe }}>
            Wie weit soll deine Kampagne strahlen?
          </h1>

          {/* ── 1. CONTEXT BAR ── */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 18px', marginBottom: 24, display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 10, fontSize: 13, color: C.taupe }}>
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
                <span style={{ color: C.muted }}>· {stimmber.toLocaleString('de-CH')} Stimmberechtigte</span>
              </span>
            ) : (
              <span>
                📍 <strong>{regionName}</strong>
                &nbsp;·&nbsp;{stimmber.toLocaleString('de-CH')}&nbsp;{isPolitik ? 'Stimmberechtigte' : 'Personen'}
              </span>
            )}
            {isPolitik && briefing.daysUntil != null && (
              <span style={{ color: '#7A5500', background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: 8, padding: '3px 10px', fontSize: 12 }}>
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

          {/* Region picker */}
          {regionPickerOpen && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 10 }}>
                {isPolitik ? 'Regionen bearbeiten' : 'Region ändern'}
              </div>
              {isPolitik && editRegions.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 }}>
                    {editRegions.map(r => (
                      <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9ECEC', border: `1px solid ${C.primary}`, color: C.pd, borderRadius: 100, padding: '4px 8px 4px 12px', fontSize: 13, fontWeight: 600 }}>
                        {r.name}
                        <button type="button" onClick={() => removeEditRegion(r.name)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 15, padding: '0 3px', lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                    Total: <strong style={{ color: C.taupe }}>{editTotalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
                  </div>
                </>
              )}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={regionQuery}
                  placeholder={isPolitik ? 'Kanton oder Gemeinde suchen...' : 'Kanton suchen...'}
                  onChange={e => { setRegionQuery(e.target.value); setRegionDropdownOpen(true); }}
                  onFocus={() => setRegionDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setRegionDropdownOpen(false), 200)}
                  style={{ width: '100%', boxSizing: 'border-box' as const, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: 'var(--font-outfit), sans-serif', color: C.taupe, backgroundColor: C.bg, outline: 'none' }}
                />
                {regionDropdownOpen && regionSearchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(44,44,62,.12)', maxHeight: 260, overflowY: 'auto', zIndex: 200 }}>
                    {regionSearchResults.map(r => (
                      <div key={r.name} onMouseDown={() => addEditRegion(r)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, color: C.taupe, display: 'flex', justifyContent: 'space-between' }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <span>{r.name}</span><span style={{ fontSize: 11, color: C.muted }}>{r.stimm?.toLocaleString('de-CH')}</span>
                      </div>
                    ))}
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

          {/* ── 2. THREE PACKAGE CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {PACKAGES.map((pkg, i) => {
              const isActive = selectedPackage === pkg.id;
              const pr       = pkgReach[i];
              return (
                <div
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg)}
                  style={{
                    position: 'relative', cursor: 'pointer', userSelect: 'none' as const,
                    border: isActive ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: isActive ? C.pl : C.white,
                    borderRadius: 16, padding: '20px 16px 16px',
                    transition: 'all .15s',
                  }}
                >
                  {pkg.recommended && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: C.primary, color: '#fff', borderRadius: 100, padding: '3px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', whiteSpace: 'nowrap' as const }}>
                      Empfohlen
                    </div>
                  )}
                  {/* Checkmark */}
                  <div style={{ position: 'absolute', top: 14, right: 14, width: 20, height: 20, borderRadius: '50%', background: isActive ? C.primary : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: isActive ? C.pd : C.muted, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    {pkg.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, color: isActive ? C.primary : C.taupe, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 6 }}>
                    {fmtCHF(pkg.budget)}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                    {durLabel(pkg.duration)} · {pkg.freq}× Kontakt
                  </div>
                  <div style={{ fontSize: 11, color: isActive ? C.pd : C.muted }}>
                    ~{fmtRange(pr.lo, pr.hi)} {personLabel} ({pr.pct}%)
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 3. RECOMMENDATION CARD ── */}
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const }}>
              <div>
                <div style={{ display: 'inline-block', background: C.pl, color: C.pd, border: `1px solid #F0C8C8`, borderRadius: 100, padding: '3px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', marginBottom: 10 }}>
                  Unser Vorschlag
                </div>
                <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 36, fontWeight: 400, color: C.taupe, letterSpacing: '-.03em', lineHeight: 1 }}>
                  {fmtRange(uniqueLow, uniqueHigh)}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
                  {personLabel} sehen deine Kampagne · {pct}% von {regionName}
                </div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, color: C.primary, letterSpacing: '-.02em', lineHeight: 1 }}>
                  {fmtCHF(budget)}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {durLabel(duration)} · {freq}× Kontakt
                </div>
              </div>
            </div>
            {/* 2×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              {[
                { label: 'DOOH Screens',     value: fmtN(screens),                   sub: 'digitale Plakatstellen' },
                { label: 'Display Kontakte', value: fmtN(dispContacts),              sub: 'Online-Banner Impressionen' },
                { label: 'Laufzeit',         value: durLabel(duration),              sub: `${freq}× Kontakt pro Person` },
                { label: 'Unique Reach',     value: fmtRange(uniqueLow, uniqueHigh), sub: `${pct}% der ${personLabel}` },
              ].map(cell => (
                <div key={cell.label} style={{ background: C.bg, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 4 }}>{cell.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.taupe, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>{cell.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{cell.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. SLIDERS CARD ── */}
          <div style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
            {/* Budget */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.taupe }}>Budget</span>
                <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 20, color: C.primary, letterSpacing: '-.02em' }}>{fmtCHF(budget)}</span>
              </div>
              <input
                type="range" className="vio-slider"
                min={2500} max={50000} step={500} value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                style={{ background: `linear-gradient(to right, ${C.primary} ${budgetPct}%, #F0EBE3 ${budgetPct}%)` }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 5 }}>
                <span>CHF 2'500</span><span>CHF 50'000</span>
              </div>
            </div>
            {/* Duration */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.taupe }}>Laufzeit</span>
                <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 20, color: C.primary, letterSpacing: '-.02em' }}>{durLabel(duration)}</span>
              </div>
              <input
                type="range" className="vio-slider"
                min={1} max={8} step={1} value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{ background: `linear-gradient(to right, ${C.primary} ${durationPct}%, #F0EBE3 ${durationPct}%)` }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 5 }}>
                <span>1 Woche</span><span>8 Wochen</span>
              </div>
            </div>
          </div>

          {/* ── 5. BREAKDOWN ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 10 }}>
                DOOH — Digitale Screens
              </div>
              <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, color: C.taupe, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 4 }}>
                {fmtN(screens)}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Screens in {regionName}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>Bahnhöfe, Einkaufszentren, belebte Orte</div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.taupe }}>
                {fmtN(doohContacts)} Kontakte
              </div>
            </div>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: 10 }}>
                Display — Online Banner
              </div>
              <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, color: C.taupe, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 4 }}>
                {fmtCHF(Math.round(budget * 0.3))}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Display-Budget (30%)</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>Schweizer Websites & Apps</div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.taupe }}>
                {fmtN(dispContacts)} Kontakte
              </div>
            </div>
          </div>

          {/* ── 6. SMART TIP ── */}
          <div style={{ background: '#F5EBEB', borderLeft: `3px solid ${C.primary}`, borderRadius: '0 12px 12px 0', padding: '14px 18px', marginBottom: 28, fontSize: 13, color: C.taupe, lineHeight: 1.7 }}>
            💡 {smartTip}
          </div>

          {/* ── 7. CTA ── */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleNext}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '14px 30px', fontFamily: 'var(--font-outfit), sans-serif', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,102,107,.3)', transition: 'all .18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
            >
              Weiter zu den Werbemitteln →
            </button>
          </div>

        </div>{/* end main column */}

        {/* ══════════════ SIDEBAR ══════════════ */}
        <div style={{ width: 340, flexShrink: 0, position: 'sticky' as const, top: 80, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>

          {/* Sidebar card 1: Wie berechnen wir das? */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, color: C.taupe, marginBottom: 14 }}>
              Wie berechnen wir das?
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 12 }}>
              Dein Budget wird 70/30 auf DOOH-Screens und Online-Banner aufgeteilt.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {[
                { label: '📺 DOOH-Anteil (70%)',    value: fmtCHF(Math.round(budget * 0.7)) },
                { label: '🖥 Display-Anteil (30%)', value: fmtCHF(Math.round(budget * 0.3)) },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: C.taupe }}>{row.label}</span>
                  <strong style={{ color: C.taupe }}>{row.value}</strong>
                </div>
              ))}
              <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: C.taupe }}>Ø Kontakte pro Person</span>
                <strong style={{ color: C.primary }}>{freq}×</strong>
              </div>
            </div>
          </div>

          {/* Sidebar card 2: Deine Zielregion */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, color: C.taupe, marginBottom: 14 }}>
              Deine Zielregion
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.taupe, marginBottom: 6 }}>
              📍 {regionName}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
              {stimmber.toLocaleString('de-CH')} {isPolitik ? 'Stimmberechtigte' : 'Einwohner'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 12, color: C.muted }}>
              {[
                { label: 'Erreichbar via DOOH',    value: '~85%' },
                { label: 'Erreichbar via Display', value: '~92%' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{row.label}</span>
                  <strong style={{ color: C.taupe }}>{row.value}</strong>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
              Quelle: BFS Bevölkerungsstatistik 2023
            </div>
          </div>

          {/* Sidebar card 3: Fragen? */}
          <div style={{ background: C.pl, border: '1px solid #F0C8C8', borderRadius: 16, padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, color: C.taupe, marginBottom: 8 }}>
              Fragen?
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
              Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.
            </div>
            <a
              href="https://calendly.com/vio"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', background: C.primary, color: '#fff', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-outfit), sans-serif' }}
            >
              Gespräch buchen →
            </a>
          </div>

        </div>{/* end sidebar */}

      </div>
    </section>
  );
}
