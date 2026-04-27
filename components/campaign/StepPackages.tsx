'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import {
  calculateImpact, buildPackages, getLaufzeitCorridor, coupleBudgetToLaufzeit,
} from '@/lib/preislogik';
import type { PaketKey, PakeResult, Hinweis } from '@/lib/preislogik';
import { ALL_REGIONS } from '@/lib/regions';
import type { Region } from '@/lib/regions';
import { getInhabitants } from '@/lib/vio-inhabitants-map';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  violet:      '#6B4FBB',
  violetDeep:  '#5A3FA8',
  ink:         '#2D1F52',
  slate:       '#7A7596',
  bg:          '#F7F5FF',
  card:        '#FFFFFF',
  line:        '#E8E4F5',
  lineStrong:  '#D5CDEC',
  highlight:   '#F0EBFF',
  warn:        '#C97A2B',
  warnBg:      '#FFF6E8',
  infoBg:      '#EEF1FE',
  infoText:    '#3B4A87',
  good:        '#5B8C5A',
  goodBg:      '#EEF6EE',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('de-CH');
}
function fmtCHF(n: number): string {
  return 'CHF ' + Math.round(n).toLocaleString('de-CH');
}
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function fmtDateShort(d: Date): string {
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}
function addDaysToDate(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Package cards sub-component ─────────────────────────────────────────────
const PKG_ORDER: PaketKey[] = ['sichtbar', 'praesenz', 'dominanz'];
const PKG_SUBTITLE: Record<PaketKey, string> = {
  sichtbar: 'Sichtbarkeit aufbauen',
  praesenz: 'Optimal in Meinungsbildungsphase',
  dominanz: 'Maximale Präsenz',
};

function PackageCards({ packages, selectedPkg, onChange }: {
  packages: PakeResult;
  selectedPkg: PaketKey;
  onChange: (key: PaketKey) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
      {PKG_ORDER.map(key => {
        const p = packages[key];
        const isSel = selectedPkg === key;
        const isRec = key === 'praesenz';
        const fCamp = Math.round(p.frequencyCampaign);
        return (
          <div
            key={key}
            onClick={() => onChange(key)}
            style={{
              position: 'relative',
              background: T.card,
              border: `1.5px solid ${isSel ? T.violet : T.line}`,
              borderRadius: 16,
              padding: '20px 20px 18px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 12,
              boxShadow: isSel ? '0 4px 24px rgba(107,79,187,0.10)' : 'none',
              transition: 'all 0.18s ease',
            }}
          >
            {isRec && (
              <div style={{
                position: 'absolute', top: -10, left: 16,
                background: T.violet, color: 'white',
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                padding: '4px 10px', borderRadius: 999,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>Empfohlen</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11, fontWeight: 700, color: T.slate,
                textTransform: 'uppercase' as const, letterSpacing: '0.14em',
              }}>{p.name}</span>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${isSel ? T.violet : T.lineStrong}`,
                background: isSel ? T.violet : 'transparent',
                boxShadow: isSel ? 'inset 0 0 0 3px white' : 'none',
                transition: 'all 0.15s ease',
              }} />
            </div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 28, fontWeight: 800, color: T.ink,
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>{fmtCHF(p.budget)}</div>
            <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, color: T.slate, fontSize: 13, lineHeight: 1.4 }}>
              <strong style={{ color: T.ink, fontWeight: 600 }}>{p.laufzeitDays} Tage</strong>
              {' · '}
              <span>{fCamp}× Kontakte</span>
              <br />
              <span>{PKG_SUBTITLE[key]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, formatVal, onChange, minLabel, maxLabel }: {
  label: string; value: number; min: number; max: number; step: number;
  formatVal: (v: number) => string; onChange: (v: number) => void;
  minLabel?: string; maxLabel?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>{label}</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.violet }}>{formatVal(value)}</span>
      </div>
      <div style={{ position: 'relative', height: 4, background: T.lineStrong, borderRadius: 999, margin: '14px 0 4px' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: T.violet, borderRadius: 999, pointerEvents: 'none' }} />
        <input
          type="range" className="vio-range"
          min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.slate }}>
        <span>{minLabel ?? formatVal(min)}</span>
        <span>{maxLabel ?? formatVal(max)}</span>
      </div>
    </div>
  );
}

// ─── Hint display ────────────────────────────────────────────────────────────
type HintTone = 'warn' | 'info' | 'good' | 'violet';
interface HintDisplay { tone: HintTone; title: string; text: string }

const HINT_META: Record<HintTone, { bg: string; border: string; iconBg: string; titleColor: string; icon: string }> = {
  warn:   { bg: T.warnBg,    border: '#F0D5A8', iconBg: T.warn,     titleColor: T.warn,      icon: '!' },
  info:   { bg: T.infoBg,    border: '#D0D6F0', iconBg: T.infoText, titleColor: T.infoText,  icon: 'i' },
  good:   { bg: T.goodBg,    border: '#C5DDC5', iconBg: T.good,     titleColor: T.good,      icon: '✓' },
  violet: { bg: T.highlight, border: T.lineStrong, iconBg: T.violet, titleColor: T.violetDeep, icon: '★' },
};

function hinweisToDisplay(h: Hinweis, days: number, regionName: string): HintDisplay {
  const { code, text } = h;
  if (code === 'hard_stop_budget')        return { tone: 'warn',   title: 'Persönliche Planung empfohlen',                  text };
  if (code === 'below_min_budget')        return { tone: 'warn',   title: "Mindestbudget CHF 4'000",                        text };
  if (code === 'too_thin')                return { tone: 'warn',   title: 'Budget über zu lange Laufzeit verteilt',          text };
  if (code === 'overkill')                return { tone: 'warn',   title: 'Werbemüdigkeit droht',                           text };
  if (code === 'daily_below_floor')       return { tone: 'warn',   title: 'Tagesbudget zu tief für stabile Auslieferung',   text };
  if (code === 'capped_by_region')        return { tone: 'info',   title: 'Sättigung in Sicht',                             text };
  if (code === 'calendly_nudge_strong')   return { tone: 'violet', title: 'Grosse Kampagne — persönliche Planung sinnvoll', text };
  if (code === 'calendly_nudge_soft')     return { tone: 'info',   title: 'Wir bieten persönliche Beratung',                text };
  if (code === 'screen_class_display_dom') return { tone: 'info',  title: 'In dieser Region primär online',                 text };
  if (code === 'screen_class_begrenzt')   return { tone: 'info',   title: 'Erhöhter Online-Anteil',                         text };
  if (code === 'no_dooh_inventory')       return { tone: 'info',   title: 'Keine DOOH-Flächen verfügbar',                   text };
  return { tone: 'good', title: 'Im Sweet Spot', text: `Kontaktdruck und Abdeckung sind gut ausbalanciert für eine ${days}-tägige Kampagne in ${regionName}.` };
}

function HintCard({ hint }: { hint: HintDisplay }) {
  const s = HINT_META[hint.tone];
  return (
    <div style={{
      borderRadius: 14, padding: '14px 18px', marginBottom: 18,
      display: 'flex', gap: 14, alignItems: 'flex-start',
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 14, lineHeight: 1.5, fontFamily: "'Jost', sans-serif",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: s.iconBg, color: 'white', fontSize: 14, fontWeight: 700, marginTop: 1,
      }}>{s.icon}</div>
      <div>
        <div style={{ fontWeight: 600, color: s.titleColor, marginBottom: 2 }}>{hint.title}</div>
        <div style={{ color: T.slate }}>{hint.text}</div>
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
  stepNumber?: number;
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Step2PolitikBudget({ briefing, updateBriefing, nextStep, stepNumber }: Props) {
  const selectedRegionsFull: Region[] = useMemo(
    () => (briefing.selectedRegions ?? []).map(r => {
      const match = ALL_REGIONS.find(x => x.name === r.name);
      if (match) return match;
      return { name: r.name, type: r.type as Region['type'], kanton: r.kanton ?? 'CH', pop: r.stimm * 2, stimm: r.stimm };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [(briefing.selectedRegions ?? []).map(r => r.name).join(',')]
  );

  const packages: PakeResult | null = useMemo(
    () => selectedRegionsFull.length > 0 ? buildPackages({ regions: selectedRegionsFull }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRegionsFull.map(r => r.name).join(',')]
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [path, setPath]               = useState<'A' | 'B'>('A');
  const [pkg, setPkg]                 = useState<PaketKey>('praesenz');
  const [budget, setBudget]           = useState<number>(
    briefing.budget ?? briefing.recommendedBudget ?? 4000
  );
  const [days, setDays]               = useState<number>(
    packages ? packages.praesenz.laufzeitDays : 21
  );
  const [feintuningOpen, setFeintuning] = useState<boolean>((briefing as any).adjOpen ?? false);

  const handleFeintuning = (val: boolean) => {
    setFeintuning(val);
    updateBriefing({ adjOpen: val } as any);
  };
  const [budgetRef]                   = useState(() => ({
    budget: packages ? packages.praesenz.budget : 8000,
    days: packages ? packages.praesenz.laufzeitDays : 21,
  }));

  // ── Derived ────────────────────────────────────────────────────────────────
  const corridor = getLaufzeitCorridor(budget);

  // Clamp days to corridor on budget change
  const effectiveDays = Math.min(corridor.maxDays, Math.max(corridor.minDays, days));

  const demonym    = getInhabitants(selectedRegionsFull.map(r => r.name));
  const regionName = briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';

  const impact = useMemo(
    () => selectedRegionsFull.length > 0
      ? calculateImpact({ budget, laufzeitDays: effectiveDays, regions: selectedRegionsFull })
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budget, effectiveDays, selectedRegionsFull.map(r => r.name).join(',')]
  );

  const stimmTotal = impact?.stimmTotal ?? selectedRegionsFull.reduce((s, r) => s + r.stimm, 0);

  const daysUntilVote = useMemo(() => {
    if (!briefing.votingDate) return null;
    const ms = new Date(briefing.votingDate + 'T00:00:00').getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  }, [briefing.votingDate]);

  const zeitraumDates = useMemo(() => {
    if (!briefing.votingDate) return null;
    const abstimmung = new Date(briefing.votingDate + 'T00:00:00');
    const end   = addDaysToDate(abstimmung, -28);
    const start = addDaysToDate(end, -effectiveDays);
    return { start: fmtDateShort(start), end: fmtDateShort(end) };
  }, [briefing.votingDate, effectiveDays]);

  const votingDateLabel = useMemo(() => {
    if (!briefing.votingDate) return null;
    const d = new Date(briefing.votingDate + 'T00:00:00');
    return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }, [briefing.votingDate]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function switchPath(p: 'A' | 'B') {
    if (p === 'B' && packages) {
      setPkg('praesenz');
      setBudget(packages.praesenz.budget);
      setDays(packages.praesenz.laufzeitDays);
    }
    setPath(p);
  }

  function handlePkgChange(key: PaketKey) {
    setPkg(key);
    if (packages) {
      setBudget(packages[key].budget);
      setDays(packages[key].laufzeitDays);
    }
  }

  function handleBudgetChange(newBudget: number) {
    setBudget(newBudget);
    const c = getLaufzeitCorridor(newBudget);
    if (effectiveDays < c.minDays) setDays(c.minDays);
    else if (effectiveDays > c.maxDays) setDays(c.maxDays);
  }

  function handleDaysChange(newDays: number) {
    setDays(newDays);
    const coupled = coupleBudgetToLaufzeit(budgetRef.budget, budgetRef.days, newDays);
    setBudget(coupled);
  }

  function handleNext() {
    updateBriefing({
      selectedPackage: path === 'B' ? pkg : undefined,
      budget,
      laufzeit: Math.round(effectiveDays / 7),
      freq:        Math.round(impact?.frequencyCampaign ?? (packages?.[pkg]?.frequencyCampaign ?? 5)),
      reach:       impact?.reachMitte ?? 0,
      reachVonPct: impact?.reachVonPct ?? 0,
      reachBisPct: impact?.reachBisPct ?? 0,
      b2bReach: null,
    });
    nextStep();
  }

  // ── Hint ───────────────────────────────────────────────────────────────────
  const activeHint: HintDisplay =
    impact && impact.hinweise.length > 0
      ? hinweisToDisplay(impact.hinweise[0], effectiveDays, regionName)
      : { tone: 'good', title: 'Im Sweet Spot', text: `Kontaktdruck und Abdeckung sind gut ausbalanciert für eine ${effectiveDays}-tägige Kampagne in ${regionName}.` };

  // ── Wirkungsindikator derived values ───────────────────────────────────────
  const doohPct    = impact ? Math.round(impact.doohShare * 100) : 70;
  const displayPct = 100 - doohPct;
  const klasseLabel = ({ voll: 'Voll', begrenzt: 'Begrenzt', 'display-dominant': 'Display-dominant' })[impact?.screenKlasse ?? 'voll'];
  const fCampaign  = impact ? impact.frequencyCampaign.toFixed(1) : '—';
  const fWeekly    = impact ? impact.frequencyWeekly.toFixed(1)   : '—';

  // ── Sidebar row ─────────────────────────────────────────────────────────────
  const SbRow = ({ label, val, color = T.ink, last = false }: { label: string; val: string; color?: string; last?: boolean }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '9px 0', borderBottom: last ? 'none' : `1px solid ${T.line}`, fontSize: 14,
    }}>
      <span style={{ color: T.slate }}>{label}</span>
      <span style={{ fontWeight: 600, color }}>{val}</span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section style={{ background: T.bg, minHeight: '100vh', fontFamily: "'Jost', sans-serif", color: T.ink }}>
      <style>{`
        .vio-range { -webkit-appearance: none; appearance: none; position: absolute; width: 100%; top: 50%; transform: translateY(-50%); margin: 0; background: transparent; outline: none; border: none; cursor: pointer; height: 22px; }
        .vio-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; background: white; border: 3px solid #6B4FBB; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(107,79,187,0.30); transition: transform .12s; }
        .vio-range::-webkit-slider-thumb:hover { transform: scale(1.1); }
        .vio-range::-moz-range-thumb { width: 22px; height: 22px; background: white; border: 3px solid #6B4FBB; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(107,79,187,0.30); }
        @media (max-width: 700px) {
          .vio-stage { grid-template-columns: 1fr !important; }
          .vio-sidebar { position: relative !important; top: 0 !important; }
          .vio-ctrl-grid { grid-template-columns: 1fr !important; gap: 22px !important; }
          .vio-kpis { grid-template-columns: 1fr !important; }
          .vio-pkgs { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 80px' }}>

        {/* Step tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.violet, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>
          <span style={{ width: 24, height: 2, background: T.violet, display: 'inline-block' }} />
          {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 2'} · Politische Kampagne
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em', marginBottom: 10, lineHeight: 1.1 }}>
          Wie weit soll deine Kampagne strahlen?
        </h1>
        <p style={{ color: T.slate, marginBottom: 28, fontSize: 15 }}>
          Alle Werte sind dynamisch auf deine Zielregion abgestimmt.
        </p>

        {/* Context bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: '14px 18px', marginBottom: 24 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: T.highlight, color: T.violetDeep }}>Politische Kampagne</span>
          {briefing.selectedRegions?.map(r => (
            <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: '#F2EFFA', color: T.ink }}>{r.name}</span>
          ))}
          {stimmTotal > 0 && (
            <span style={{ color: T.slate, fontSize: 14 }}>{fmtNum(stimmTotal)} {demonym}</span>
          )}
          {daysUntilVote != null && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: T.warnBg, color: T.warn }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.warn, display: 'inline-block', flexShrink: 0 }} />
              Abstimmung in {daysUntilVote} Tagen
            </span>
          )}
        </div>

        {/* Stage: main + sidebar */}
        <div className="vio-stage" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>

          {/* MAIN */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.slate, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
              Reichweite &amp; Paket
            </div>

            {/* Path toggle pill */}
            <div style={{ display: 'inline-flex', background: T.card, border: `1px solid ${T.line}`, borderRadius: 999, padding: 4, marginBottom: 24 }}>
              {(['A', 'B'] as const).map(p => (
                <button
                  key={p} type="button" onClick={() => switchPath(p)}
                  style={{
                    border: 'none', padding: '9px 22px',
                    fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 600,
                    borderRadius: 999, cursor: 'pointer', transition: 'all 0.18s ease',
                    background: path === p ? T.violet : 'transparent',
                    color: path === p ? 'white' : T.slate,
                    boxShadow: path === p ? '0 2px 8px rgba(107,79,187,0.25)' : 'none',
                  }}
                >
                  {p === 'A' ? 'Eigenes Budget' : 'Pakete ansehen'}
                </button>
              ))}
            </div>

            {/* Pfad A: 2 sliders */}
            {path === 'A' && (
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: '24px 28px', marginBottom: 18 }}>
                <div className="vio-ctrl-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  <Slider label="Budget" value={budget} min={4000} max={100000} step={500}
                    formatVal={fmtCHF} onChange={handleBudgetChange} />
                  <Slider label="Laufzeit" value={effectiveDays}
                    min={corridor.minDays} max={corridor.maxDays} step={1}
                    formatVal={v => `${v} Tage`} onChange={setDays}
                    minLabel={`${corridor.minDays} Tage`} maxLabel={`${corridor.maxDays} Tage`} />
                </div>
              </div>
            )}

            {/* Pfad B: package cards + feintuning */}
            {path === 'B' && packages && (
              <>
                <div className="vio-pkgs">
                  <PackageCards packages={packages} selectedPkg={pkg} onChange={handlePkgChange} />
                </div>

                {/* Feintuning accordion */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, marginBottom: 18, overflow: 'hidden' }}>
                  <div
                    onClick={() => handleFeintuning(!feintuningOpen)}
                    style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' as const }}
                  >
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, color: T.ink }}>Budget &amp; Laufzeit feintunen</span>
                    <span style={{ color: T.slate, fontSize: 18, display: 'inline-block', transition: 'transform 0.2s', transform: feintuningOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
                  </div>
                  {feintuningOpen && (
                    <div style={{ padding: '4px 20px 22px' }}>
                      <div className="vio-ctrl-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                        <Slider label="Budget" value={budget} min={4000} max={100000} step={500}
                          formatVal={fmtCHF} onChange={handleBudgetChange} />
                        <Slider label="Laufzeit" value={effectiveDays}
                          min={corridor.minDays} max={corridor.maxDays} step={1}
                          formatVal={v => `${v} Tage`} onChange={handleDaysChange}
                          minLabel={`${corridor.minDays} Tage`} maxLabel={`${corridor.maxDays} Tage`} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Wirkungsindikator — identisch beide Pfade */}
            <div style={{
              background: T.ink, borderRadius: 18, padding: '32px 32px 28px',
              color: 'white', marginBottom: 18, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 240, height: 240, background: 'radial-gradient(circle at top right, rgba(107,79,187,0.5), transparent 60%)', pointerEvents: 'none' }} />

              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 14 }}>
                Deine Botschaft erreicht
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 56, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 6 }}>
                {impact ? `${fmtNum(impact.reachVon)} – ${fmtNum(impact.reachBis)}` : '—'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 26 }}>{demonym}</div>

              {/* 3 KPIs */}
              <div className="vio-kpis" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '18px 18px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Abdeckung</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginBottom: 4 }}>
                    {impact ? `${Math.round(impact.reachVonPct)}–${Math.round(impact.reachBisPct)} %` : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>der Stimmberechtigten</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '18px 18px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Kontaktdruck</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginBottom: 4 }}>
                    Ø {fCampaign}×
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>≈ {fWeekly}× / Woche</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '18px 18px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Zeitraum</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginBottom: 4 }}>
                    {effectiveDays} Tage
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    {zeitraumDates ? `${zeitraumDates.start} – ${zeitraumDates.end}` : '—'}
                  </div>
                </div>
              </div>

              {/* Channel Mix Bar */}
              <div style={{ marginTop: 22, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>
                  <span>Kanal-Mix</span>
                  <span>Klasse: {klasseLabel}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', display: 'flex', gap: 2 }}>
                  <div style={{ width: `${doohPct}%`, background: '#B8A2F0', borderRadius: '999px 0 0 999px', transition: 'width 0.3s ease' }} />
                  <div style={{ width: `${displayPct}%`, background: T.violet, borderRadius: '0 999px 999px 0', transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  <span><strong style={{ color: 'white', fontWeight: 600 }}>{doohPct}%</strong> Digitale Plakate</span>
                  <span><strong style={{ color: 'white', fontWeight: 600 }}>{displayPct}%</strong> Online-Display</span>
                </div>
              </div>
            </div>

            {/* Hint (max 1) */}
            <HintCard hint={activeHint} />

            {/* CTA row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 26 }}>
              <button type="button" onClick={() => window.history.back()}
                style={{ background: 'transparent', border: 'none', color: T.slate, fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '10px 4px' }}>
                ← Zurück
              </button>
              <button type="button" onClick={handleNext} disabled={budget >= 100000}
                style={{
                  background: budget >= 100000 ? '#9A90BB' : T.violet,
                  color: 'white', border: 'none', padding: '14px 28px', borderRadius: 999,
                  fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 600,
                  cursor: budget >= 100000 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(107,79,187,0.3)', transition: 'all 0.15s ease',
                }}>
                Weiter zur Zusammenfassung →
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="vio-sidebar" style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: '22px 22px 18px' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Deine Kampagne</div>
              <SbRow label="Kampagnentyp" val="Politisch" />
              <SbRow label="Region" val={regionName} />
              {votingDateLabel && <SbRow label="Abstimmung" val={votingDateLabel} color={T.warn} />}
              {path === 'B' && packages && (
                <SbRow label="Paket" val={packages[pkg].name} color={T.violetDeep} />
              )}
              <SbRow label="Budget" val={fmtCHF(budget)} color={T.violetDeep} />
              <SbRow label="Laufzeit" val={`${effectiveDays} Tage`} last />
            </div>
            <div style={{ background: T.highlight, borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: T.ink, marginBottom: 6, fontSize: 15 }}>Persönliche Beratung</div>
              <p style={{ color: T.slate, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>Unsere Mediaplaner:innen helfen dir, das optimale Paket für deine Kampagne zu finden.</p>
              <a href={process.env.NEXT_PUBLIC_CALENDLY_URL ?? '#'} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', background: T.violet, color: 'white', border: 'none', padding: '10px 18px', borderRadius: 999, fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                Gespräch buchen →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
