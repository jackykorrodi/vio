'use client';

import { useState, useMemo, useEffect } from 'react';
import { BriefingData } from '@/lib/types';
import type { CustomConfig } from '@/lib/types';
import {
  calculateImpact, buildPackages, getLaufzeitCorridor,
  calculateImpactCustom, PKG_CAP_LEVEL,
  calculateSweetSpotCustom,
  COACH_BUDGET_LOW_RATIO, COACH_BUDGET_HIGH_RATIO,
  WIRKUNGSFOKUS_FREQUENZ,
  getCampaignWindow,
} from '@/lib/preislogik';
import type { CustomImpactResult, CampaignWindow } from '@/lib/preislogik';
import { evaluateCustomConfig } from '@/lib/custom-hints';
import { validatePartnerCode } from '@/lib/partner-codes-mock';
import type { PartnerCode } from '@/lib/partner-codes-mock';
import type { PaketKey, PakeResult, Paket, Hinweis } from '@/lib/preislogik';
import { ALL_REGIONS } from '@/lib/regions';
import type { Region } from '@/lib/regions';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import { resolveLandmarkAnchor } from '@/lib/landmark-anchor';

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
function round500(n: number): number {
  return Math.round(n / 500) * 500;
}

// ─── Package cards sub-component ─────────────────────────────────────────────
const PKG_ORDER: PaketKey[] = ['sichtbar', 'praesenz', 'dominanz'];
const PKG_SUBTITLE: Record<PaketKey, string> = {
  sichtbar: 'Sichtbarkeit aufbauen',
  praesenz: 'Optimal in Meinungsbildungsphase',
  dominanz: 'Maximale Präsenz',
};
const PKG_SUBTITLE_DISPLAY: Record<PaketKey, string> = {
  sichtbar: 'Schnelle digitale Awareness',
  praesenz: 'Schnelle digitale Mobilisierung',
  dominanz: 'Intensive Endphasen-Mobilisierung',
};

const CUSTOM_LAUFZEIT_MAX_DAYS_FALLBACK = 60; // Wenn voteDate nicht gesetzt

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/vio-media';

function PackageCards({ packages, selectedPkg, onChange, disabledPkgs, recommendedPkg }: {
  packages: PakeResult;
  selectedPkg: PaketKey | null;
  onChange: (key: PaketKey) => void;
  disabledPkgs: Set<PaketKey>;
  recommendedPkg: PaketKey;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
      {PKG_ORDER.map(key => {
        const p = packages[key];
        const isDisabled = disabledPkgs.has(key);
        const isConsult = p.requiresConsultation;
        const isSel = selectedPkg === key && !isDisabled && !isConsult;
        const isRec = key === recommendedPkg && !isConsult;
        const fCamp = Math.round(p.frequencyCampaign);
        const handleClick = isDisabled ? undefined
          : isConsult ? () => window.open(CALENDLY_URL, '_blank')
          : () => onChange(key);
        return (
          <div
            key={key}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            className="vio-pkg-card"
            onClick={handleClick}
            onKeyDown={e => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleClick?.(); } }}
            style={{
              position: 'relative',
              background: isSel ? 'rgba(107,79,187,0.06)' : T.card,
              border: isSel ? `2px solid ${T.violet}` : `1.5px solid ${T.line}`,
              borderRadius: 16,
              padding: '20px 20px 18px',
              cursor: isDisabled ? 'default' : 'pointer',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 12,
              boxShadow: isSel ? '0 4px 24px rgba(107,79,187,0.10)' : 'none',
              transition: 'all 0.18s ease',
              opacity: isDisabled ? 0.5 : 1,
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
              {!isConsult && (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSel ? T.violet : T.lineStrong}`,
                  background: isSel ? T.violet : 'transparent',
                  boxShadow: isSel ? 'inset 0 0 0 3px white' : 'none',
                  transition: 'all 0.15s ease',
                }} />
              )}
            </div>
            {isConsult ? (
              <div style={{ color: T.violet, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>
                Persönliche Beratung empfohlen →
              </div>
            ) : (
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 28, fontWeight: 800, color: T.ink,
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>{fmtCHF(p.budget)}</div>
            )}
            {!isConsult && (
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, color: T.slate, fontSize: 13, lineHeight: 1.4 }}>
                {isDisabled ? (
                  <span>Mehr Vorlauf nötig · {packages[recommendedPkg].name} ist jetzt die stärkste Option</span>
                ) : (
                  <>
                    <strong style={{ color: T.ink, fontWeight: 600 }}>{p.laufzeitDays} Tage</strong>
                    {' · '}
                    <span>{fCamp}× Kontakte</span>
                    <br />
                  </>
                )}
                <span>{p.deliveryMode === 'display_only' ? PKG_SUBTITLE_DISPLAY[key] : PKG_SUBTITLE[key]}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, formatVal, onChange, minLabel, maxLabel, marker }: {
  label: string; value: number; min: number; max: number; step: number;
  formatVal: (v: number) => string; onChange: (v: number) => void;
  minLabel?: string; maxLabel?: string; marker?: number | null;
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

// ─── Campaign Timeline ────────────────────────────────────────────────────────
function CampaignTimeline({
  voteDate, fruehesterStart, laufzeitWochen, onChange, effectiveDays,
}: {
  voteDate: Date; fruehesterStart: Date; laufzeitWochen: number;
  onChange: (wochen: number) => void;
  effectiveDays?: number;
}) {
  const totalMs   = voteDate.getTime() - fruehesterStart.getTime();
  if (totalMs <= 0) return null;
  const totalDays = totalMs / 86400000;
  const maxWeeks  = Math.max(2, Math.floor(totalDays / 7));
  const minWeeks  = 2;

  const campaignStart = new Date(voteDate.getTime() - laufzeitWochen * 7 * 86400000);
  // Header-Datum darf nicht vor frühestem Start liegen
  const campaignStartDisplay = new Date(Math.max(campaignStart.getTime(), fruehesterStart.getTime()));
  const handlePct = Math.max(0, Math.min(100, ((campaignStart.getTime() - fruehesterStart.getTime()) / totalMs) * 100));

  function pctToWeeks(pct: number): number {
    const msFromLeft = fruehesterStart.getTime() + (pct / 100) * totalMs;
    const daysToVote = (voteDate.getTime() - msFromLeft) / 86400000;
    return Math.max(minWeeks, Math.min(maxWeeks, Math.round(daysToVote / 7)));
  }

  function handleDrag(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onChange(pctToWeeks(pct));
  }

  const tickStep = maxWeeks > 16 ? 4 : maxWeeks > 8 ? 2 : 1;
  const ticks: { pct: number; weeks: number }[] = [];
  for (let w = maxWeeks; w >= minWeeks; w -= tickStep) {
    const d = new Date(voteDate.getTime() - w * 7 * 86400000);
    if (d.getTime() >= fruehesterStart.getTime()) {
      ticks.push({ pct: ((d.getTime() - fruehesterStart.getTime()) / totalMs) * 100, weeks: w });
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>Kampagnenfenster</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.violet }}>
          {effectiveDays != null
            ? `${effectiveDays} Tage`
            : `${laufzeitWochen} ${laufzeitWochen === 1 ? 'Woche' : 'Wochen'}`
          }&nbsp;·&nbsp;{fmtDateShort(campaignStartDisplay)}
        </span>
      </div>
      <div
        style={{ position: 'relative', height: 44, cursor: 'pointer', userSelect: 'none' as const, touchAction: 'none', margin: '0 0 4px' }}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); handleDrag(e); }}
        onPointerMove={e => { if (e.buttons === 0) return; handleDrag(e); }}
      >
        {/* Bahn */}
        <div style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 8, background: T.lineStrong, borderRadius: 999 }} />
        {/* Sperrzone-Indikator (linke Kante = frühester Start) */}
        <div style={{
          position: 'absolute', top: 18, left: 0, width: 14, height: 8,
          borderRadius: '999px 0 0 999px', pointerEvents: 'none',
          background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(107,79,187,0.2) 3px,rgba(107,79,187,0.2) 6px)',
        }} />
        {/* Aktive Zone (handle → rechts) */}
        <div style={{
          position: 'absolute', top: 18, right: 0, height: 8,
          width: `${100 - handlePct}%`,
          background: T.violet, borderRadius: '0 999px 999px 0', pointerEvents: 'none',
        }} />
        {/* Wochen-Ticks */}
        {ticks.map(t => (
          <div key={t.weeks}
            onPointerDown={e => { e.stopPropagation(); onChange(t.weeks); }}
            style={{
              position: 'absolute', top: 14, left: `${t.pct}%`,
              transform: 'translateX(-50%)',
              width: 2, height: 16, background: T.line, borderRadius: 1, cursor: 'pointer',
            }}
          />
        ))}
        {/* Handle */}
        <div style={{
          position: 'absolute', top: 11,
          left: `${handlePct}%`, transform: 'translateX(-50%)',
          width: 22, height: 22, borderRadius: '50%',
          background: 'white', border: `3px solid ${T.violet}`,
          boxShadow: '0 2px 8px rgba(107,79,187,0.30)', pointerEvents: 'none',
        }} />
        {/* Wahltag-Marker rechts */}
        <div style={{
          position: 'absolute', top: 11, right: 0, transform: 'translateX(50%)',
          width: 22, height: 22, borderRadius: '50%',
          background: T.warn, border: '3px solid white',
          boxShadow: '0 2px 6px rgba(232,168,56,0.4)', pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.slate }}>
        <span>{fmtDateShort(fruehesterStart)} (frühester Start)</span>
        <span style={{ color: T.warn }}>{fmtDateShort(voteDate)} (Wahltag)</span>
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


function hinweisToDisplay(h: Hinweis, _days: number, _regionName: string): HintDisplay | null {
  const { code, text } = h;
  if (code === 'hard_stop_budget')        return { tone: 'warn',   title: 'Persönliche Planung empfohlen',                  text };
  if (code === 'below_min_budget')        return { tone: 'warn',   title: "Mindestbudget CHF 4'000",                        text };
  // Stabile Codes — alle 'good' + 'Empfehlung' (§7.2 v3.5.2)
  if (code === 'optimal_28d_standard')            return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'optimal_28d_vorlauf_constrained') return { tone: 'good', title: 'Empfehlung', text };
  if (code === '28d_broad_reach_low_frequency')   return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'sprint_14d_grosser_pool')         return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'sprint_14d_28d_unavailable')      return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'aufbau_42d_reach_premium')        return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'aufbau_42d_28d_unavailable')      return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'dominanzmodus')                   return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'sprint_14d_vorlauf_constrained')  return { tone: 'good', title: 'Empfehlung', text };
  if (code === 'display_only_late_window')        return { tone: 'good', title: 'Empfehlung', text };
  // Unstable Codes
  if (code === 'sprint_14d_thin_budget')   return { tone: 'info', title: 'Schlussimpuls 14 Tage', text };
  if (code === 'aufbau_42d_thin_budget')   return { tone: 'info', title: 'Aufbau 6 Wochen',        text };
  if (code === 'dominanzmodus_stark')      return { tone: 'warn', title: 'Sehr hohe Frequenz',     text };
  if (code === 'overkill_frequency')       return { tone: 'warn', title: 'Hohe Kontaktdichte',     text };
  if (code === 'too_thin')                 return { tone: 'warn', title: 'Budget knapp',            text };
  if (code === 'too_short_for_campaign')   return { tone: 'warn', title: 'Zu wenig Zeit',           text };
  if (code === 'vote_passed')              return { tone: 'warn', title: 'Abstimmung vorbei',       text };
  return null;
}

// §9.2 Pfad-B Hint-Mapping aus Paket-Dimensionen
function pkgToHint(p: Paket, regionName: string): HintDisplay | null {
  if (p.availability === 'unavailable')
    return { tone: 'warn', title: 'Nicht mehr buchbar', text: 'Für dieses Paket reicht der Vorlauf bis zum Abstimmungstermin nicht mehr aus.' };
  if (p.deliveryMode === 'display_only')
    return { tone: 'info', title: PKG_SUBTITLE_DISPLAY[p.key], text: 'Kurzfristiger Einsatz via Digital Display — DOOH-Buchungen benötigen mindestens 10 Tage Vorlauf.' };
  if (p.qualityStatus === 'high_frequency')
    return { tone: 'warn', title: 'Hohe Kontaktdichte', text: 'Der Pool ist klein im Verhältnis zum Budget. Ein kleineres Paket kann effizienter sein.' };
  if (p.qualityStatus === 'thin')
    return { tone: 'warn', title: 'Budget knapp für gewählte Region', text: 'Reach und Frequenz liegen unter dem Wirkungsschwellenwert. Grösseres Budget oder kleinere Region.' };
  if (p.contextFlag === 'mikro_limited')
    return { tone: 'info', title: 'Begrenzte Reichweite in kleineren Gemeinden', text: `Der Stimmberechtigten-Pool in ${regionName} ist klein. Die maximale Reichweite ist entsprechend begrenzt.` };
  return null;
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

  const daysUntilVote = useMemo(() => {
    if (!briefing.votingDate) return null;
    const ms = new Date(briefing.votingDate + 'T00:00:00').getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  }, [briefing.votingDate]);

  const packages: PakeResult | null = useMemo(
    () => selectedRegionsFull.length > 0 ? buildPackages({ regions: selectedRegionsFull, daysUntilVote }) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRegionsFull.map(r => r.name).join(','), daysUntilVote]
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode]               = useState<'paket' | 'custom'>(() => briefing.pfad ?? 'custom');
  const [selectedPkg, setSelectedPkg] = useState<PaketKey | null>(briefing.selectedPackage ?? null);
  const [budget, setBudget]           = useState<number>(
    briefing.budget ||
    packages?.praesenz?.budget ||
    4000
  );
  const [days, setDays]               = useState<number>(
    packages ? packages.praesenz.laufzeitDays : 21
  );
  const [customConfig, setCustomConfig] = useState<CustomConfig>(() => {
    if (briefing.customConfig) return briefing.customConfig;
    const safeDays = daysUntilVote != null
      ? Math.max(14, Math.min(CUSTOM_LAUFZEIT_MAX_DAYS_FALLBACK, daysUntilVote - 10))
      : 28;
    return { budget: 8000, laufzeitDays: safeDays, freqWeekly: 5, doohShare: 0.6, wirkungsfokus: 'ausgewogen' };
  });
  const [activeCode, setActiveCode]   = useState<PartnerCode | null>(() =>
    briefing.partnerCode ? validatePartnerCode(briefing.partnerCode) : null
  );
  const [partnerCodeOpen, setPartnerCodeOpen]   = useState<boolean>(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState<string>('');
  const [partnerCodeError, setPartnerCodeError] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const corridor = getLaufzeitCorridor(budget);

  // Clamp days to corridor on budget change
  const effectiveDays = Math.min(corridor.maxDays, Math.max(corridor.minDays, days));

  const demonym    = getInhabitants(selectedRegionsFull.map(r => r.name));
  const regionName = briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';

  const impact = useMemo(
    () => {
      if (!selectedRegionsFull.length) return null;
      const boostPct = activeCode?.reachBoostPct ?? 0;
      // Pfad 'paket': paketLevel-Modus, nur wenn Paket gewählt
      if (mode === 'paket' && packages && selectedPkg) {
        const pkgData = packages[selectedPkg];
        return calculateImpact({
          budget: pkgData.budget,
          laufzeitDays: pkgData.laufzeitDays,
          regions: selectedRegionsFull,
          mode: 'paketLevel',
          paketLevel: PKG_CAP_LEVEL[selectedPkg],
          splitOverride: pkgData.deliveryMode === 'display_only' ? { dooh: 0, display: 1 } : undefined,
          partnerCodeBoostPct: boostPct,
        });
      }
      if (mode === 'custom') return null; // custom mode uses calculateImpactCustom via customImpact
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, selectedPkg, budget, selectedRegionsFull.map(r => r.name).join(','), daysUntilVote, activeCode?.reachBoostPct]
  );

  // Basis-Impact ohne Code-Boost (für Reach-Delta-Berechnung)
  const impactBase = useMemo(() => {
    if (!activeCode || activeCode.reachBoostPct === 0 || !selectedRegionsFull.length) return null;
    if (mode === 'paket' && packages && selectedPkg) {
      const pkgData = packages[selectedPkg];
      return calculateImpact({
        budget: pkgData.budget,
        laufzeitDays: pkgData.laufzeitDays,
        regions: selectedRegionsFull,
        mode: 'paketLevel',
        paketLevel: PKG_CAP_LEVEL[selectedPkg],
        splitOverride: pkgData.deliveryMode === 'display_only' ? { dooh: 0, display: 1 } : undefined,
      });
    }
    return calculateImpact({ budget, regions: selectedRegionsFull, daysUntilVote });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode, mode, selectedPkg, budget, selectedRegionsFull.map(r => r.name).join(','), daysUntilVote]);

  const stimmTotal = impact?.stimmTotal ?? selectedRegionsFull.reduce((s, r) => s + r.stimm, 0);

  // ── Custom-Pfad: Kampagnenfenster (Single Source of Truth) ─────────────────
  const voteDate = useMemo(() =>
    briefing.votingDate ? new Date(briefing.votingDate + 'T00:00:00') : null,
    [briefing.votingDate]
  );

  const campaignWindow = useMemo(
    () => getCampaignWindow(selectedRegionsFull, voteDate, customConfig.laufzeitDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRegionsFull.map(r => r.name).join(','), voteDate, customConfig.laufzeitDays]
  );

  const sweetSpotCustom = useMemo(() => {
    if (!selectedRegionsFull.length) return null;
    return calculateSweetSpotCustom(
      selectedRegionsFull,
      customConfig.wirkungsfokus ?? 'ausgewogen',
      campaignWindow.effectiveLaufzeitDays,
      campaignWindow.doohShare,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionsFull.map(r => r.name).join(','), customConfig.wirkungsfokus, campaignWindow.effectiveLaufzeitDays, campaignWindow.doohShare]);

  // ── Custom-Pfad derived values ──────────────────────────────────────────────
  const customBudgetMax = useMemo(
    () => sweetSpotCustom && sweetSpotCustom.budget > 0
      ? Math.ceil(sweetSpotCustom.budget * 1.5 / 1000) * 1000
      : 100000,
    [sweetSpotCustom]
  );

  const customLaufzeitMax = useMemo(() =>
    daysUntilVote != null
      ? Math.max(14, Math.min(CUSTOM_LAUFZEIT_MAX_DAYS_FALLBACK, daysUntilVote - 10))
      : CUSTOM_LAUFZEIT_MAX_DAYS_FALLBACK,
    [daysUntilVote]
  );

  // effectiveBudget: abgeleiteter Wert, kein State — kein useEffect, kein Flash
  const effectiveBudget = Math.min(customConfig.budget, customBudgetMax);

  const customImpact: CustomImpactResult | null = useMemo(() => {
    if (!selectedRegionsFull.length) return null;
    return calculateImpactCustom({
      budget: effectiveBudget,
      laufzeitDays: campaignWindow.effectiveLaufzeitDays,
      freqWeekly: customConfig.freqWeekly,
      doohShare: customConfig.doohShare,
      wirkungsfokus: customConfig.wirkungsfokus,
      regions: selectedRegionsFull,
      campaignStart: campaignWindow.earliestStart,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionsFull.map(r => r.name).join(','), effectiveBudget, campaignWindow.effectiveLaufzeitDays, campaignWindow.doohShare, campaignWindow.earliestStart.getTime()]);

  const customEval = useMemo(() => {
    if (!customImpact) return null;
    return evaluateCustomConfig(customConfig, selectedRegionsFull, customImpact, daysUntilVote ?? 999, campaignWindow.earliestStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customImpact, daysUntilVote, campaignWindow.earliestStart.getTime()]);

  // laufzeitWochen aus effectiveLaufzeitDays (aus Fenster)
  const laufzeitWochen = Math.max(2, Math.round(campaignWindow.effectiveLaufzeitDays / 7));

  // displayDays + displayBudget nach effectiveBudget/campaignWindow
  const displayDays = mode === 'paket' && packages && selectedPkg
    ? packages[selectedPkg].laufzeitDays
    : mode === 'custom' ? campaignWindow.effectiveLaufzeitDays : (impact?.laufzeitDays ?? effectiveDays);

  const displayBudget = mode === 'paket' && packages && selectedPkg
    ? packages[selectedPkg].budget
    : mode === 'custom' ? effectiveBudget : budget;

  // Pfad 'custom': Boosted-Variante für Partner-Code-Delta.
  const customImpactBoosted: CustomImpactResult | null = useMemo(() => {
    if (mode !== 'custom' || !activeCode || activeCode.reachBoostPct === 0
        || !selectedRegionsFull.length) return null;
    const boostedBudget = effectiveBudget * (1 + activeCode.reachBoostPct / 100);
    return calculateImpactCustom({
      budget: boostedBudget,
      laufzeitDays: campaignWindow.effectiveLaufzeitDays,
      freqWeekly: customConfig.freqWeekly,
      doohShare: customConfig.doohShare,
      wirkungsfokus: customConfig.wirkungsfokus,
      regions: selectedRegionsFull,
      campaignStart: campaignWindow.earliestStart,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedRegionsFull.map(r => r.name).join(','), effectiveBudget, campaignWindow.effectiveLaufzeitDays, campaignWindow.earliestStart.getTime(), activeCode?.reachBoostPct]);

  // Partner-Code Reach-Delta — Pfad 'paket' (calculateImpact-basiert, 1:1 unverändert)
  const _codeBaseReach  = impactBase?.reachUniqueAbs ?? 0;
  const _codeBoostReach = (activeCode && activeCode.reachBoostPct > 0) ? (impact?.reachUniqueAbs ?? 0) : 0;
  // Partner-Code Reach-Delta — Pfad 'custom' (Budget-Multiplikator-Approximation)
  const _customBaseReach  = customImpact?.reach ?? 0;
  const _customBoostReach = (activeCode && activeCode.reachBoostPct > 0 && customImpactBoosted)
    ? customImpactBoosted.reach : 0;
  // Aktiven Modus wählen
  const _baseReach  = mode === 'custom' ? _customBaseReach  : _codeBaseReach;
  const _boostReach = mode === 'custom' ? _customBoostReach : _codeBoostReach;
  const deltaPersonen = (activeCode && activeCode.reachBoostPct > 0)
    ? round500(Math.max(0, _boostReach - _baseReach))
    : 0;
  const deltaPct = (activeCode && activeCode.reachBoostPct > 0 && _baseReach > 0)
    ? Math.round(((_boostReach - _baseReach) / _baseReach) * 100)
    : 0;
  // Cap-Edge-Case: Code aktiv mit Boost, aber delta = 0 → Sättigung erreicht
  const isCapEdgeCase = !!(activeCode && activeCode.reachBoostPct > 0 && deltaPersonen === 0);
  const displayReachImpact = (isCapEdgeCase && impactBase) ? impactBase : impact;

  const disabledPkgs = useMemo<Set<PaketKey>>(() => {
    if (!packages) return new Set<PaketKey>();
    return new Set(PKG_ORDER.filter(k => packages[k].availability === 'unavailable'));
  }, [packages]);

  const recommendedPkg: PaketKey = packages?.recommended ?? 'praesenz';

  useEffect(() => {
    if (mode === 'paket' && selectedPkg !== null && disabledPkgs.has(selectedPkg)) {
      handlePkgChange(recommendedPkg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, disabledPkgs]);

  const zeitraumDates = useMemo(() => {
    if (!briefing.votingDate) return null;
    const end   = new Date(briefing.votingDate + 'T00:00:00');
    const start = addDaysToDate(end, -displayDays);
    return { start: fmtDateShort(start), end: fmtDateShort(end) };
  }, [briefing.votingDate, displayDays]);

  const votingDateLabel = useMemo(() => {
    if (!briefing.votingDate) return null;
    const d = new Date(briefing.votingDate + 'T00:00:00');
    return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }, [briefing.votingDate]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleCustomConfigChange(patch: Partial<CustomConfig>) {
    const next = { ...customConfig, ...patch };
    setCustomConfig(next);
    updateBriefing({ customConfig: next });
  }

  function handleSwitchToCustom() {
    setMode('custom');
    // Falls noch kein customConfig im briefing: aktuelle (Default-)Werte persistieren
    updateBriefing({ pfad: 'custom', ...(!briefing.customConfig ? { customConfig } : {}) });
  }

  function handlePkgChange(key: PaketKey) {
    setSelectedPkg(key);
  }

  function handleBudgetChange(newBudget: number) {
    setBudget(newBudget);
    const c = getLaufzeitCorridor(newBudget);
    if (effectiveDays < c.minDays) setDays(c.minDays);
    else if (effectiveDays > c.maxDays) setDays(c.maxDays);
  }

  function handleNext() {
    if (mode === 'custom') {
      // Budget-Clamp in State materialisieren, damit Step 3 / Briefing keinen überhöhten Roh-Wert erhält
      if (customConfig.budget > customBudgetMax) handleCustomConfigChange({ budget: customBudgetMax });
      nextStep();
      return;
    }
    const budgetToSave = selectedPkg && packages ? packages[selectedPkg].budget : budget;
    updateBriefing({
      selectedPackage: selectedPkg ?? undefined,
      budget: budgetToSave,
      laufzeit: Math.round((impact?.laufzeitDays ?? effectiveDays) / 7),
      freq:     Math.round(impact?.frequencyCampaign ?? (selectedPkg && packages ? packages[selectedPkg].frequencyCampaign : 5)),
      reach:    impact?.reachUniqueAbs ?? 0,
      reachUniqueLowPct: impact?.reachUniqueLowPct ?? 0,
      reachUniqueHighPct: impact?.reachUniqueHighPct ?? 0,
      b2bReach: null,
    });
    nextStep();
  }

  function handlePartnerCodeSubmit() {
    const validated = validatePartnerCode(partnerCodeInput);
    if (!validated) {
      setPartnerCodeError('Dieser Code ist ungültig.');
      return;
    }
    setActiveCode(validated);
    setPartnerCodeError(null);
    updateBriefing({ partnerCode: validated.code });
  }

  function handlePartnerCodeRemove() {
    setActiveCode(null);
    setPartnerCodeInput('');
    setPartnerCodeError(null);
    updateBriefing({ partnerCode: undefined });
  }

  // ── Hint ───────────────────────────────────────────────────────────────────
  const filteredHinweise = impact ? impact.hinweise : [];
  // Pfad 'paket': Hint aus Paket-Dimensionen (§9.2); Pfad 'custom': aus Optimizer-Hinweisen
  const activeHintRaw: HintDisplay | null = mode === 'paket' && packages && selectedPkg
    ? pkgToHint(packages[selectedPkg], regionName)
    : filteredHinweise.length > 0
      ? hinweisToDisplay(filteredHinweise[0], displayDays, regionName)
      : null;
  const activeHint: HintDisplay | null = (() => {
    if (!activeHintRaw) return null;
    if (mode !== 'custom' || !sweetSpotCustom || activeHintRaw.tone !== 'good') return activeHintRaw;
    const zoneLow  = sweetSpotCustom.budget * COACH_BUDGET_LOW_RATIO;
    const zoneHigh = sweetSpotCustom.budget * COACH_BUDGET_HIGH_RATIO;
    const prefix =
      effectiveBudget < zoneLow
        ? `Empfohlenes Budget ab ${fmtCHF(sweetSpotCustom.budget)}. `
        : effectiveBudget <= zoneHigh
          ? 'Im Sweet Spot. '
          : 'Starke Kampagne — du nutzt das volle Potenzial dieser Region. ';
    return { ...activeHintRaw, text: prefix + activeHintRaw.text };
  })();

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
        .vio-pkg-card:focus-visible { outline: 2px solid #6B4FBB; outline-offset: 2px; }
        .vio-pkg-card:not([tabindex="-1"]):hover { border-color: #9181CC !important; box-shadow: 0 2px 12px rgba(107,79,187,0.14) !important; }
        @media (max-width: 700px) {
          .vio-stage { grid-template-columns: 1fr !important; }
          .vio-sidebar { position: relative !important; top: 0 !important; }
          .vio-kpis { grid-template-columns: 1fr !important; }
          .vio-pkgs { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .vio-ctrl-grid { grid-template-columns: 1fr !important; gap: 22px !important; }
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
            <span style={{ color: T.slate, fontSize: 14 }}>{fmtNum(stimmTotal)} Stimmberechtigte</span>
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

            {/* Pfad 'custom': Drei-Hebel-Cockpit */}
            {mode === 'custom' && (
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: '24px 28px', marginBottom: 18 }}>

                {/* HEBEL 3: Wirkungsfokus-Toggle */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.slate, marginBottom: 10 }}>Wirkungsfokus</div>
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.line}` }}>
                    {(['breit', 'ausgewogen', 'verankerung'] as const).map((key, i) => {
                      const labels = { breit: 'Breite Wirkung', ausgewogen: 'Ausgewogen', verankerung: 'Verankerung' };
                      const active = (customConfig.wirkungsfokus ?? 'ausgewogen') === key;
                      return (
                        <button key={key} type="button"
                          onClick={() => handleCustomConfigChange({ wirkungsfokus: key })}
                          style={{
                            flex: 1, border: 'none',
                            borderLeft: i > 0 ? `1px solid ${T.line}` : 'none',
                            background: active ? T.violet : T.card,
                            color: active ? 'white' : T.slate,
                            fontFamily: "'Jost', sans-serif",
                            fontSize: 13, fontWeight: active ? 600 : 400,
                            padding: '9px 4px', cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >{labels[key]}</button>
                      );
                    })}
                  </div>
                </div>

                {/* HEBEL 1: Budget mit Sweet-Spot-Zone */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>Budget</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.violet }}>{fmtCHF(effectiveBudget)}</span>
                  </div>
                  <div style={{ position: 'relative', height: 4, background: T.lineStrong, borderRadius: 999, margin: '14px 0 4px' }}>
                    {/* Filled track */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%',
                      width: `${customBudgetMax > 4000 ? Math.max(0, Math.min(100, ((effectiveBudget - 4000) / (customBudgetMax - 4000)) * 100)) : 0}%`,
                      background: T.violet, borderRadius: 999, pointerEvents: 'none',
                    }} />
                    {/* Sweet-Spot band */}
                    {sweetSpotCustom && sweetSpotCustom.budget > 0 && customBudgetMax > 4000 && (() => {
                      const range     = customBudgetMax - 4000;
                      const leftPct   = Math.max(0, Math.min(100, ((COACH_BUDGET_LOW_RATIO  * sweetSpotCustom.budget - 4000) / range) * 100));
                      const rightPct  = Math.max(0, Math.min(100, ((COACH_BUDGET_HIGH_RATIO * sweetSpotCustom.budget - 4000) / range) * 100));
                      const markerPct = Math.max(0, Math.min(100, ((sweetSpotCustom.budget - 4000) / range) * 100));
                      return (
                        <>
                          <div style={{
                            position: 'absolute', top: -3, height: 10,
                            left: `${leftPct}%`, width: `${Math.max(0, rightPct - leftPct)}%`,
                            background: 'rgba(107,79,187,0.18)', borderRadius: 999, pointerEvents: 'none',
                          }} />
                          <div style={{
                            position: 'absolute', top: -4, width: 12, height: 12,
                            left: `${markerPct}%`, transform: 'translateX(-50%)',
                            background: T.violet, borderRadius: '50%', opacity: 0.7, pointerEvents: 'none',
                          }} />
                        </>
                      );
                    })()}
                    <input
                      type="range" className="vio-range"
                      min={4000} max={Math.max(4000, customBudgetMax)} step={500} value={effectiveBudget}
                      onChange={e => handleCustomConfigChange({ budget: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.slate, marginBottom: sweetSpotCustom ? 8 : 0 }}>
                    <span>CHF 4&apos;000</span>
                    <span>{fmtCHF(customBudgetMax)}</span>
                  </div>
                  {sweetSpotCustom && sweetSpotCustom.budget > 0 && (
                    <button type="button"
                      onClick={() => handleCustomConfigChange({ budget: Math.round(sweetSpotCustom.budget / 1000) * 1000 })}
                      style={{
                        background: 'none', border: `1px solid ${T.lineStrong}`, borderRadius: 8,
                        padding: '5px 12px', fontSize: 12, color: T.violetDeep, cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif", fontWeight: 500,
                      }}
                    >Auf Empfehlung setzen ({fmtCHF(Math.round(sweetSpotCustom.budget / 1000) * 1000)})</button>
                  )}
                </div>

                {/* HEBEL 2: Kampagnenfenster (Zeitachse) */}
                {voteDate && (
                  <CampaignTimeline
                    voteDate={voteDate}
                    fruehesterStart={campaignWindow.earliestStart}
                    laufzeitWochen={laufzeitWochen}
                    effectiveDays={campaignWindow.effectiveLaufzeitDays}
                    onChange={wochen => {
                      const start = new Date(voteDate.getTime() - wochen * 7 * 86400000);
                      handleCustomConfigChange({
                        laufzeitDays: wochen * 7,
                        campaignStart: start.toISOString().slice(0, 10),
                      });
                    }}
                  />
                )}

              </div>
            )}

            {/* Pfad 'paket': Paket-Karten */}
            {mode === 'paket' && packages && (
              <div className="vio-pkgs">
                <PackageCards packages={packages} selectedPkg={selectedPkg} onChange={handlePkgChange} disabledPkgs={disabledPkgs} recommendedPkg={recommendedPkg} />
              </div>
            )}

            {/* Wirkungsindikator — nur Pfad 'paket' mit Auswahl */}
            {mode === 'paket' && selectedPkg !== null && (
              <div style={{
                background: T.ink, borderRadius: 18, padding: '32px 32px 28px',
                color: 'white', marginBottom: 18, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 240, height: 240, background: 'radial-gradient(circle at top right, rgba(107,79,187,0.5), transparent 60%)', pointerEvents: 'none' }} />

                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 14 }}>
                  Deine Botschaft erreicht
                </div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 56, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 6 }}>
                  {displayReachImpact ? `${fmtNum(displayReachImpact.reachUniqueLow)} – ${fmtNum(displayReachImpact.reachUniqueHigh)}` : '—'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 26 }}>{demonym}</div>

                {/* 2 KPIs */}
                <div className="vio-kpis" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
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
                      {displayDays} Tage
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      {zeitraumDates ? `${zeitraumDates.start} – ${zeitraumDates.end}` : '—'}
                    </div>
                    {daysUntilVote != null && daysUntilVote > displayDays && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                        Effektive Kampagnenzeit bis Abstimmung: {daysUntilVote} Tage
                      </div>
                    )}
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
            )}

            {/* Coach-Hint (Brücke zwischen Cockpit und Outcome) */}
            {mode === 'custom' && customEval?.coachHint && (
              <div style={{
                background: T.highlight, border: `1px solid ${T.lineStrong}`,
                borderRadius: 14, padding: '13px 18px', marginBottom: 14,
                display: 'flex', gap: 12, alignItems: 'flex-start',
                fontFamily: "'Jost', sans-serif",
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: T.violet, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, marginTop: 1,
                }}>→</div>
                <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.5 }}>
                  {customEval.coachHint.text}
                </div>
              </div>
            )}

            {/* Zone 2: Outcome-Panel (nur Pfad 'custom') */}
            {mode === 'custom' && customImpact && (() => {
              const wfKey = customConfig.wirkungsfokus ?? 'ausgewogen';
              const frequenzKampagne = Math.round(WIRKUNGSFOKUS_FREQUENZ[wfKey] * campaignWindow.effectiveLaufzeitDays / 7);
              const regionsKontext = selectedRegionsFull.length === 1
                ? `in ${selectedRegionsFull[0].name}`
                : 'in deiner Auswahl';
              const heroStep = customImpact.reachUniqueLow < 10000 ? 100 : customImpact.reachUniqueLow < 100000 ? 1000 : 5000;
              const heroFloor = Math.floor(customImpact.reachUniqueLow / heroStep) * heroStep;
              const anchor = resolveLandmarkAnchor(customImpact.reachUniqueLow, selectedRegionsFull);
              const dotUnit = (() => {
                if (customImpact.reachUniqueLow <= 0) return 1000;
                const raw = customImpact.reachUniqueLow / 90;
                const exp = Math.floor(Math.log10(raw));
                const mag = Math.pow(10, exp);
                return [1, 2, 5, 10].map(b => b * mag).find(v => v >= raw) ?? mag * 10;
              })();
              const filledDots = Math.min(260, Math.max(1, Math.round(customImpact.reachUniqueLow / dotUnit)));
              const totalSlots = filledDots;
              const DOTS_PER_ROW = 12;
              const presence = customEval?.presence;
              return (
                <div style={{
                  background: T.card, border: `1px solid ${T.line}`,
                  borderRadius: 16, padding: '24px 28px', marginBottom: 18,
                }}>
                  {/* Reichweite-Hero */}
                  <div style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 42, fontWeight: 800, color: T.violet,
                    letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 4,
                  }}>
                    {fmtNum(heroFloor)}+
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                    Stimmberechtigte erreicht
                  </div>
                  <div style={{ fontSize: 12, color: T.slate, marginBottom: 8 }}>
                    {fmtNum(customImpact.reachUniqueLow)} – {fmtNum(customImpact.reachUniqueHigh)} Stimmberechtigte · typischer Bereich
                  </div>
                  <div style={{ fontSize: 13, color: T.slate, marginBottom: 24 }}>
                    Ø&nbsp;{frequenzKampagne}× gesehen&nbsp;·&nbsp;{regionsKontext}
                  </div>

                  {/* Dot-Grid */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      display: 'flex', flexWrap: 'wrap' as const,
                      gap: 5, maxWidth: DOTS_PER_ROW * (10 + 5),
                    }}>
                      {Array.from({ length: totalSlots }, (_, i) => (
                        <div key={i} style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: i < filledDots ? T.violet : 'rgba(107,79,187,0.15)',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: T.slate, marginTop: 8 }}>
                      1 Punkt ≈ {fmtNum(dotUnit)} Stimmberechtigte
                    </div>
                  </div>

                  {/* Präsenz-Story */}
                  {presence && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 16, lineHeight: 1.4 }}>📍</span>
                        <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.5 }}>
                          {campaignWindow.modus === 'display_only' ? (
                            <>Sichtbar auf Online-Werbeflächen in deiner Zielregion.</>
                          ) : presence.showScreenCount ? (
                            <>Sichtbar auf rund <strong style={{ color: T.ink }}>{fmtNum(presence.screenCount)}</strong> Bildschirmen im öffentlichen Raum – und online.</>
                          ) : (
                            <>Sichtbar im öffentlichen Raum deiner Region – und online.</>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: anchor.generic ? 'rgba(122,117,150,0.65)' : T.slate, fontStyle: 'italic', marginTop: 6, paddingLeft: 24 }}>
                        {anchor.text}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Partnercode */}
            <div style={{ marginBottom: 14 }}>
              {!activeCode ? (
                <>
                  {!partnerCodeOpen ? (
                    <button type="button" onClick={() => setPartnerCodeOpen(true)}
                      style={{ background: 'none', border: 'none', color: T.slate, fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: "'Jost', sans-serif" }}>
                      Partnercode hinzufügen
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' as const }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <input
                          type="text"
                          value={partnerCodeInput}
                          onChange={e => { setPartnerCodeInput(e.target.value); setPartnerCodeError(null); }}
                          onKeyDown={e => e.key === 'Enter' && handlePartnerCodeSubmit()}
                          placeholder="Code eingeben"
                          style={{ width: '100%', boxSizing: 'border-box' as const, border: `1px solid ${partnerCodeError ? '#D0624A' : T.line}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: "'Jost', sans-serif", color: T.ink, outline: 'none' }}
                        />
                        {partnerCodeError && (
                          <div style={{ fontSize: 12, color: '#D0624A', marginTop: 4 }}>{partnerCodeError}</div>
                        )}
                      </div>
                      <button type="button" onClick={handlePartnerCodeSubmit}
                        style={{ background: T.violet, color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost', sans-serif", whiteSpace: 'nowrap' as const }}>
                        Bestätigen
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ background: T.goodBg, border: '1px solid #C5DDC5', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, color: T.good, fontSize: 14, marginBottom: 4 }}>
                    Partnerkampagne aktiviert
                  </div>
                  {activeCode.reachBoostPct === 0 ? (
                    <div style={{ color: T.slate, fontSize: 13 }}>Code wurde erfolgreich hinterlegt.</div>
                  ) : isCapEdgeCase ? (
                    <div style={{ color: T.slate, fontSize: 13 }}>Gesamte Region wird erreicht, kein zusätzlicher Reach-Effekt möglich.</div>
                  ) : (
                    <>
                      <div style={{ color: T.good, fontSize: 13, fontWeight: 500 }}>+{deltaPct}% zusätzliche Reichweite</div>
                      <div style={{ color: T.slate, fontSize: 13 }}>≈ {deltaPersonen.toLocaleString('de-CH')} zusätzlich erreichte Personen</div>
                    </>
                  )}
                  <button type="button" onClick={handlePartnerCodeRemove}
                    style={{ background: 'none', border: 'none', color: T.slate, fontSize: 12, cursor: 'pointer', padding: '6px 0 0', textDecoration: 'underline', fontFamily: "'Jost', sans-serif", display: 'block' }}>
                    Code entfernen
                  </button>
                </div>
              )}
            </div>

            {/* Hint-Karten: nur Pfad 'paket' mit Auswahl */}
            {mode === 'paket' && selectedPkg !== null && activeHint && (
              <HintCard hint={activeHint} />
            )}

            {/* CTA row */}
            {(() => {
              const nextDisabled = mode === 'paket' ? selectedPkg === null : false;
              return (
                <div style={{ marginTop: 26 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={() => window.history.back()}
                      style={{ background: 'transparent', border: 'none', color: T.slate, fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '10px 4px' }}>
                      ← Zurück
                    </button>
                    <button type="button" onClick={handleNext} disabled={nextDisabled}
                      style={{
                        background: nextDisabled ? '#9A90BB' : T.violet,
                        color: 'white', border: 'none', padding: '14px 28px', borderRadius: 999,
                        fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 600,
                        cursor: nextDisabled ? 'not-allowed' : 'pointer',
                        boxShadow: nextDisabled ? 'none' : '0 4px 14px rgba(107,79,187,0.3)', transition: 'all 0.15s ease',
                      }}>
                      Weiter zur Zusammenfassung →
                    </button>
                  </div>
                  {nextDisabled && mode === 'paket' && (
                    <div style={{ fontSize: 13, color: T.slate, marginTop: 6, textAlign: 'right' as const }}>
                      Bitte wähle ein Paket aus.
                    </div>
                  )}
                  {mode === 'paket' && (
                    <div style={{ textAlign: 'right' as const, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={handleSwitchToCustom}
                        style={{ background: 'none', border: 'none', color: T.slate, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: "'Jost', sans-serif" }}
                      >
                        Erweiterte Einstellungen →
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* SIDEBAR */}
          <aside className="vio-sidebar" style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: '22px 22px 18px' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 16 }}>Deine Kampagne</div>
              <SbRow label="Kampagnentyp" val="Politisch" />
              <SbRow label="Region" val={regionName} />
              {votingDateLabel && <SbRow label="Abstimmung" val={votingDateLabel} color={T.warn} />}
              {mode === 'paket' && packages && selectedPkg && (
                <SbRow label="Paket" val={packages[selectedPkg].name} color={T.violetDeep} />
              )}
              <SbRow label="Budget" val={fmtCHF(displayBudget)} color={T.violetDeep} />
              <SbRow label="Laufzeit" val={`${displayDays} Tage`} last />
            </div>
            {budget >= 20000 && (
              <div style={{ background: T.highlight, borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: T.ink, marginBottom: 4, fontSize: 15 }}>Persönliche Beratung</div>
                <p style={{ color: T.slate, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>Wir planen deine Kampagne gemeinsam mit dir — kostenlos und unverbindlich.</p>
                <a href={process.env.NEXT_PUBLIC_CALENDLY_URL ?? '#'} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', background: T.violet, color: 'white', border: 'none', padding: '10px 18px', borderRadius: 999, fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                  Gespräch buchen →
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
