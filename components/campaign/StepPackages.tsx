'use client';

import { useState, useMemo, useEffect } from 'react';
import { BriefingData } from '@/lib/types';
import type { CustomConfig } from '@/lib/types';
import {
  buildPackages, getLaufzeitCorridor,
  calculateImpactCustom,
  calculateSweetSpotCustom,
  COACH_BUDGET_LOW_RATIO, COACH_BUDGET_HIGH_RATIO,
  WIRKUNGSFOKUS_FREQUENZ,
  REFERENZ_LAUFZEIT_DAYS,
  getCampaignWindow,
  POLITIK_LAUFZEIT_MAX,
} from '@/lib/preislogik';
import type { ImpactResult, CustomImpactResult, CampaignWindow } from '@/lib/preislogik';
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
function fmtReach(n: number): string {
  const rounded = n < 10000 ? Math.round(n / 100) * 100 : Math.round(n / 500) * 500;
  return rounded.toLocaleString('de-CH');
}

// ─── Package cards sub-component ─────────────────────────────────────────────
const PKG_ORDER: PaketKey[] = ['sichtbar', 'praesenz', 'dominanz'];
const PKG_TITEL: Record<PaketKey, string> = {
  sichtbar: 'Lokale Sichtbarkeit',
  praesenz: 'Regionale Präsenz',
  dominanz: 'Hohe Präsenz',
};
const PKG_SUBTITLE_DISPLAY: Record<PaketKey, string> = {
  sichtbar: 'Schnelle digitale Awareness',
  praesenz: 'Schnelle digitale Mobilisierung',
  dominanz: 'Intensive Endphasen-Mobilisierung',
};
const PKG_STRATEGIE: Record<PaketKey, string> = {
  sichtbar: 'mehr Reichweite',
  praesenz: 'ausgewogen',
  dominanz: 'mehr Wiederholung',
};

const CUSTOM_LAUFZEIT_MAX_DAYS_FALLBACK = POLITIK_LAUFZEIT_MAX; // Politik-Fenster-Obergrenze (Spec §6.3)

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? 'https://calendly.com/vio-media';

function PackageCards({ packages, selectedPkg, onChange, disabledPkgs, recommendedPkg, onCustom }: {
  packages: PakeResult;
  selectedPkg: PaketKey | null;
  onChange: (key: PaketKey) => void;
  disabledPkgs: Set<PaketKey>;
  recommendedPkg: PaketKey;
  onCustom: () => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
      {PKG_ORDER.map(key => {
        const p = packages[key];
        const isDisabled = disabledPkgs.has(key);
        const isConsult = p.requiresConsultation;
        const isSel = selectedPkg === key && !isDisabled && !isConsult;
        const isRec = key === recommendedPkg && !isConsult;
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
              }}>{PKG_TITEL[key]}</span>
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
            <div style={{ fontSize: 12, color: T.slate, fontWeight: 500, letterSpacing: '0.01em' }}>
              {PKG_STRATEGIE[key]}
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
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, color: T.slate, fontSize: 13, lineHeight: 1.5 }}>
                {isDisabled ? (
                  <span>Mehr Vorlauf nötig · {PKG_TITEL[recommendedPkg]} ist jetzt die stärkste Option</span>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, color: T.ink }}>
                      ca.&nbsp;{fmtReach(p.reachUniqueAbs)} Personen
                    </div>
                    <div>
                      je {p.frequencyCampaign}× gesehen · {p.laufzeitDays} Tage
                    </div>
                    <div style={{ fontSize: 11, color: T.slate, marginTop: 2 }}>
                      Ø {p.frequencyWeekly.toFixed(1)}×/Woche
                    </div>
                    {p.deliveryMode === 'display_only' && (
                      <div style={{ marginTop: 4, fontSize: 12 }}>{PKG_SUBTITLE_DISPLAY[key]}</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* §9.1 Vierte Karte: Individuell konfigurieren — eigene Achse, nie EMPFOHLEN */}
      <div
        role="button"
        tabIndex={0}
        className="vio-pkg-card"
        onClick={onCustom}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCustom(); } }}
        style={{
          position: 'relative',
          background: T.card,
          border: `1.5px solid ${T.line}`,
          borderRadius: 16,
          padding: '20px 20px 18px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 12,
          transition: 'all 0.18s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11, fontWeight: 700, color: T.slate,
            textTransform: 'uppercase' as const, letterSpacing: '0.14em',
          }}>Individuell</span>
          <span style={{ fontSize: 16, color: T.violet }}>→</span>
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>
          Individuell konfigurieren
        </div>
        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, color: T.slate, fontSize: 13, lineHeight: 1.4 }}>
          Eigenes Budget, Laufzeit und Wirkungsfokus
        </div>
      </div>
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
  const maxWeeks  = Math.max(2, Math.min(Math.floor(POLITIK_LAUFZEIT_MAX / 7), Math.floor(totalDays / 7)));
  const minWeeks  = 2;

  const campaignStart = new Date(voteDate.getTime() - laufzeitWochen * 7 * 86400000);
  // Header-Datum darf nicht vor frühestem Start liegen
  const campaignStartDisplay = new Date(Math.max(campaignStart.getTime(), fruehesterStart.getTime()));
  const rangeWeeks = maxWeeks - minWeeks;
  // Laufzeit-basierte Skala: 0% = minWeeks (14d), 100% = maxWeeks (42d)
  const handlePct = rangeWeeks > 0
    ? Math.max(0, Math.min(100, ((laufzeitWochen - minWeeks) / rangeWeeks) * 100))
    : 100;

  function pctToWeeks(pct: number): number {
    return Math.max(minWeeks, Math.min(maxWeeks, Math.round(minWeeks + (pct / 100) * rangeWeeks)));
  }

  function handleDrag(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onChange(pctToWeeks(pct));
  }

  const tickStep = maxWeeks > 16 ? 4 : maxWeeks > 8 ? 2 : 1;
  const ticks: { pct: number; weeks: number }[] = [];
  for (let w = minWeeks; w <= maxWeeks; w += tickStep) {
    const pct = rangeWeeks > 0 ? ((w - minWeeks) / rangeWeeks) * 100 : 100;
    ticks.push({ pct, weeks: w });
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
        {/* Aktive Zone (links → handle): längere Laufzeit = vollerer Balken */}
        <div style={{
          position: 'absolute', top: 18, left: 0, height: 8,
          width: `${handlePct}%`,
          background: T.violet, borderRadius: '999px 0 0 999px', pointerEvents: 'none',
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
        <span>{minWeeks * 7} Tage</span>
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

  // Custom-Pfad: geführter Wizard (Fokus → Dauer → Empfehlung → Budget).
  // Bestehende customConfig (Rückkehrer) → alle Schritte erledigt, Outcome direkt sichtbar.
  const [wizardStep, setWizardStep] = useState<number>(briefing.customConfig ? 3 : 0);
  const [doneSteps, setDoneSteps]   = useState<boolean[]>(
    briefing.customConfig ? [true, true, true] : [false, false, false]
  );
  const [budgetRaw, setBudgetRaw]   = useState<string>(String(customConfig.budget));

  // ── Derived ────────────────────────────────────────────────────────────────
  const corridor = getLaufzeitCorridor(budget);

  // Clamp days to corridor on budget change
  const effectiveDays = Math.min(corridor.maxDays, Math.max(corridor.minDays, days));

  const demonym    = getInhabitants(selectedRegionsFull.map(r => r.name));
  const regionName = briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';

  // Paket-Modus: zweiter buildPackages-Aufruf mit Boost (nur wenn Code aktiv)
  const packagesBoosted: PakeResult | null = useMemo(
    () => {
      if (mode !== 'paket' || !activeCode?.reachBoostPct || !selectedRegionsFull.length) return null;
      return buildPackages({ regions: selectedRegionsFull, daysUntilVote, partnerCodeBoostPct: activeCode.reachBoostPct });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, selectedRegionsFull.map(r => r.name).join(','), daysUntilVote, activeCode?.reachBoostPct]
  );

  const impact = useMemo((): ImpactResult | null => {
    if (!selectedRegionsFull.length) return null;
    if (mode === 'paket' && packages && selectedPkg) {
      const boostActive = !!(activeCode?.reachBoostPct);
      const pkgSource   = boostActive && packagesBoosted ? packagesBoosted : packages;
      const pkg = pkgSource[selectedPkg];
      return {
        budget:             pkg.budget,
        laufzeitDays:       pkg.laufzeitDays,
        laufzeitWeeks:      pkg.laufzeitWeeks,
        reachUniqueLow:     pkg.reachUniqueLow,
        reachUniqueHigh:    pkg.reachUniqueHigh,
        reachUniqueAbs:     pkg.reachUniqueAbs,
        reachUniqueLowPct:  pkg.reachUniqueLowPct,
        reachUniqueHighPct: pkg.reachUniqueHighPct,
        frequencyCampaign:  pkg.frequencyCampaign,
        frequencyWeekly:    pkg.frequencyWeekly,
        stimmTotal:         packages.stimmTotal,
        poolCap:            0,
        doohShare:          pkg.doohShare,
        displayShare:       1 - pkg.doohShare,
        screenKlasse:       packages.screenKlasse,
        capLevel:           selectedPkg === 'sichtbar' ? 1 : selectedPkg === 'praesenz' ? 2 : 3,
        impactLevel:        selectedPkg,
        efficiencyStatus:   'balanced',
        recommendedAction:  null,
        cappedByRegion:     false,
        hinweise:           [],
      };
    }
    return null;
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [mode, selectedPkg, activeCode?.reachBoostPct, packages, packagesBoosted]);

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
  useEffect(() => { setBudgetRaw(String(effectiveBudget)); }, [effectiveBudget]);

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

  const displayDays = mode === 'paket' && packages && selectedPkg
    ? packages[selectedPkg].laufzeitDays
    : mode === 'custom' ? campaignWindow.effectiveLaufzeitDays : (impact?.laufzeitDays ?? effectiveDays);

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

  // Partner-Code Reach-Delta — Pfad 'paket' (aus buildPackages, direkt)
  const _codeBaseReach  = mode === 'paket' && packages && selectedPkg ? packages[selectedPkg].reachUniqueAbs : 0;
  const _codeBoostReach = mode === 'paket' && packagesBoosted && selectedPkg
    ? (packagesBoosted[selectedPkg]?.reachUniqueAbs ?? _codeBaseReach)
    : _codeBaseReach;
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
  const displayReachImpact = impact;

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
    let prefix: string;
    if (effectiveBudget < zoneLow) {
      const rangeLow  = Math.round(sweetSpotCustom.budget * 0.85 / 1000) * 1000;
      const rangeHigh = Math.round(sweetSpotCustom.budget * 1.15 / 1000) * 1000;
      const wfLabel = ({ breit: 'Breite Wirkung', ausgewogen: 'Ausgewogen', verankerung: 'Verankerung' } as const)[customConfig.wirkungsfokus ?? 'ausgewogen'];
      prefix = `${fmtCHF(rangeLow)}–${Math.round(rangeHigh).toLocaleString('de-CH')} · abgestimmt auf ${regionName}, ${wfLabel}. `;
    } else if (effectiveBudget <= zoneHigh) {
      prefix = 'Im Wirkungsbereich. ';
    } else {
      prefix = 'Starke Kampagne — du nutzt das volle Potenzial dieser Region. ';
    }
    return { ...activeHintRaw, text: prefix + activeHintRaw.text };
  })();

  // ── Wirkungsindikator derived values ───────────────────────────────────────
  const doohPct    = impact ? Math.round(impact.doohShare * 100) : 70;
  const displayPct = 100 - doohPct;
  const klasseLabel = ({ voll: 'Voll', begrenzt: 'Begrenzt', 'display-dominant': 'Display-dominant' })[impact?.screenKlasse ?? 'voll'];
  const fCampaign  = impact ? impact.frequencyCampaign.toFixed(1) : '—';
  const fWeekly    = impact ? impact.frequencyWeekly.toFixed(1)   : '—';


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
        <div className="vio-stage" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, alignItems: 'start' }}>

          {/* MAIN */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.slate, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
              Reichweite &amp; Paket
            </div>

            {/* Pfad 'custom': Geführter Wizard (Fokus → Dauer → Empfehlung → Budget) */}
            {mode === 'custom' && (() => {
              const effLauf = campaignWindow.effectiveLaufzeitDays;
              const wfKey   = customConfig.wirkungsfokus ?? 'ausgewogen';
              const WF_LABEL: Record<'breit' | 'ausgewogen' | 'verankerung', string> =
                { breit: 'Breite Wirkung', ausgewogen: 'Ausgewogen', verankerung: 'Tiefe Verankerung' };
              const WF_DESC: Record<'breit' | 'ausgewogen' | 'verankerung', string> =
                { breit: 'Möglichst viele Menschen erreichen', ausgewogen: 'Gute Balance aus Reichweite & Wiederholung', verankerung: 'Gezielter — dafür sieht dich jede Person öfter' };
              const sweetRounded = sweetSpotCustom && sweetSpotCustom.budget > 0 ? Math.round(sweetSpotCustom.budget / 1000) * 1000 : 0;
              const kanalFaktor = campaignWindow.modus === 'display_only' ? 'Online-Reichweite' : 'verfügbare Bildschirme';
              const unlocked = (i: number) => i === 0 || doneSteps[i - 1];
              const stState  = (i: number): 'done' | 'active' | 'idle' =>
                doneSteps[i] && wizardStep !== i ? 'done' : (wizardStep === i && unlocked(i) ? 'active' : 'idle');
              const mkImpact = (wf: 'breit' | 'ausgewogen' | 'verankerung') => calculateImpactCustom({
                budget: effectiveBudget, laufzeitDays: effLauf, freqWeekly: customConfig.freqWeekly,
                doohShare: customConfig.doohShare, wirkungsfokus: wf, regions: selectedRegionsFull,
                campaignStart: campaignWindow.earliestStart,
              });
              const rBreit = mkImpact('breit');
              const rVer   = mkImpact('verankerung');
              const freqOf = (wf: 'breit' | 'ausgewogen' | 'verankerung') => WIRKUNGSFOKUS_FREQUENZ[wf]; // v3.13: direkte Kampagnenkontakte
              const zoneLow  = sweetSpotCustom ? sweetSpotCustom.budget * COACH_BUDGET_LOW_RATIO  : 0;
              const zoneHigh = sweetSpotCustom ? sweetSpotCustom.budget * COACH_BUDGET_HIGH_RATIO : 0;
              const badge = (s: 'done' | 'active' | 'idle'): React.CSSProperties => ({
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13,
                background: s === 'done' ? T.good : s === 'active' ? T.violet : T.highlight,
                color: s === 'idle' ? T.violet : 'white',
                border: `2px solid ${s === 'done' ? T.good : s === 'active' ? T.violet : T.lineStrong}`,
              });
              const card = (i: number): React.CSSProperties => ({
                background: T.card,
                border: `1px solid ${wizardStep === i && unlocked(i) ? T.violet : T.line}`,
                borderRadius: 16, marginBottom: 12, overflow: 'hidden',
                boxShadow: wizardStep === i && unlocked(i) ? '0 6px 24px rgba(107,79,187,0.10)' : 'none',
                opacity: unlocked(i) ? 1 : 0.55,
              });
              const headRow = (i: number): React.CSSProperties => ({
                display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px',
                cursor: unlocked(i) ? 'pointer' : 'default',
              });
              const ttl: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: T.ink };
              const stepBtn: React.CSSProperties = {
                marginTop: 18, background: T.violet, color: 'white', border: 'none',
                padding: '11px 22px', borderRadius: 999, fontFamily: "'Jost', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(107,79,187,0.25)',
              };
              const microHint = (text: React.ReactNode) => (
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: T.highlight, border: `1px solid ${T.lineStrong}`, borderRadius: 11, padding: '11px 14px', marginTop: 14, fontSize: 13, color: T.ink, lineHeight: 1.45 }}>
                  <span style={{ color: T.violet, fontWeight: 700 }}>→</span>
                  <span>{text}</span>
                </div>
              );
              return (
                <>
                  {/* Fortschrittsbalken */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ height: 5, flex: 1, borderRadius: 999, background: doneSteps[i] ? T.violet : T.lineStrong, opacity: doneSteps[i] ? 1 : wizardStep === i ? 0.85 : 0.5, transition: 'all 0.3s ease' }} />
                    ))}
                  </div>

                  {/* SCHRITT 1 — Fokus (Breite ↔ Tiefe) */}
                  <div style={card(0)}>
                    <div style={headRow(0)} onClick={() => unlocked(0) && setWizardStep(0)}>
                      <div style={badge(stState(0))}>{stState(0) === 'done' ? '✓' : '1'}</div>
                      <div style={ttl}>Worauf legst du den Fokus?</div>
                      {doneSteps[0] && wizardStep !== 0 && (
                        <div style={{ marginLeft: 'auto', fontSize: 13, color: T.violetDeep, fontWeight: 600 }}>{WF_LABEL[wfKey]}</div>
                      )}
                    </div>
                    {wizardStep === 0 && (
                      <div style={{ padding: '0 22px 22px' }}>
                        <p style={{ fontSize: 13, color: T.slate, margin: '0 0 14px', lineHeight: 1.45 }}>
                          Gleiches Budget, andere Wirkung: viele Menschen einmal antippen — oder weniger Menschen dafür richtig oft erreichen.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                          {(['breit', 'ausgewogen', 'verankerung'] as const).map(key => {
                            const active = wfKey === key;
                            return (
                              <button key={key} type="button" onClick={() => handleCustomConfigChange({ wirkungsfokus: key })}
                                style={{
                                  position: 'relative', textAlign: 'left',
                                  border: `1.5px solid ${active ? T.violet : T.line}`,
                                  background: active ? 'rgba(107,79,187,0.05)' : T.card,
                                  borderRadius: 13, padding: 14, cursor: 'pointer',
                                  fontFamily: "'Jost', sans-serif",
                                  boxShadow: active ? '0 4px 16px rgba(107,79,187,0.10)' : 'none',
                                  transition: 'all 0.15s ease',
                                }}>
                                {key === 'ausgewogen' && (
                                  <span style={{ position: 'absolute', top: -9, right: 12, background: T.violet, color: 'white', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Empfohlen</span>
                                )}
                                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: active ? T.violetDeep : T.ink, marginBottom: 5 }}>{WF_LABEL[key]}</div>
                                <div style={{ fontSize: 12, color: T.slate, lineHeight: 1.4 }}>{WF_DESC[key]}</div>
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.slate, margin: '9px 2px 0' }}>
                          <span>← mehr Menschen</span><span>öfter gesehen →</span>
                        </div>
                        <div style={{ marginTop: 12, background: T.infoBg, border: '1px solid #D9E0F4', borderRadius: 11, padding: '11px 14px', fontSize: 13, color: T.infoText, lineHeight: 1.45 }}>
                          {wfKey === 'breit'
                            ? <>Möglichst viele Menschen erreichen.</>
                            : wfKey === 'verankerung'
                            ? <>Dieselben Personen häufiger erreichen.</>
                            : <>Gute Balance zwischen Reichweite und Wiederholung.</>}
                        </div>
                        <button type="button" style={stepBtn}
                          onClick={() => { setDoneSteps(prev => { const n = [...prev]; n[0] = true; return n; }); setWizardStep(1); }}>
                          Passt — weiter zur Dauer →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SCHRITT 2 — Dauer (Kampagnenfenster) */}
                  <div style={card(1)}>
                    <div style={headRow(1)} onClick={() => unlocked(1) && setWizardStep(1)}>
                      <div style={badge(stState(1))}>{stState(1) === 'done' ? '✓' : '2'}</div>
                      <div style={ttl}>Wie lange läuft die Kampagne?</div>
                      {!unlocked(1) && <div style={{ marginLeft: 'auto', fontSize: 12, color: T.slate }}>Zuerst Schritt 1</div>}
                      {doneSteps[1] && wizardStep !== 1 && <div style={{ marginLeft: 'auto', fontSize: 13, color: T.violetDeep, fontWeight: 600 }}>{effLauf} Tage</div>}
                    </div>
                    {wizardStep === 1 && unlocked(1) && (
                      <div style={{ padding: '0 22px 22px' }}>
                        <p style={{ fontSize: 13, color: T.slate, margin: '0 0 4px', lineHeight: 1.45 }}>
                          Der orange Punkt ist der Abstimmungstag. Zieh nach rechts für eine längere Kampagne — wir starten früher, enden immer am Wahltag.
                        </p>
                        {voteDate && (
                          <CampaignTimeline
                            voteDate={voteDate}
                            fruehesterStart={campaignWindow.earliestStart}
                            laufzeitWochen={laufzeitWochen}
                            effectiveDays={campaignWindow.effectiveLaufzeitDays}
                            onChange={wochen => {
                              const start = new Date(voteDate.getTime() - wochen * 7 * 86400000);
                              handleCustomConfigChange({ laufzeitDays: wochen * 7, campaignStart: start.toISOString().slice(0, 10) });
                            }}
                          />
                        )}
                        {microHint(<>Bei {effLauf} Tagen sieht dich jede Person rund <strong>{freqOf(wfKey)}× während der Kampagne</strong> — gut verteilt bis zum Abstimmungstag.</>)}
                        {microHint(campaignWindow.modus === 'display_only'
                          ? <>Kurzfristig machbar: Online-Display startet 1 Werktag nach deiner Bestätigung und vorliegendem Werbemittel. Digitale Plakate (DOOH) bräuchten 10 Werktage Vorlauf.</>
                          : <>Genug Vorlauf für digitale Plakate — DOOH startet 10 Werktage nach Bestätigung, sobald dein Werbemittel vorliegt.</>)}
                        <button type="button" style={stepBtn}
                          onClick={() => {
                            setDoneSteps(prev => { const n = [...prev]; n[1] = true; return n; });
                            if (sweetRounded > 0) handleCustomConfigChange({ budget: sweetRounded });
                            setWizardStep(2);
                          }}>
                          Passt — Budget-Empfehlung berechnen →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SCHRITT 3 — Budget (Empfehlung bestätigen / anpassen) */}
                  <div style={card(2)}>
                    <div style={headRow(2)} onClick={() => unlocked(2) && setWizardStep(2)}>
                      <div style={badge(stState(2))}>{stState(2) === 'done' ? '✓' : '3'}</div>
                      <div style={ttl}>Dein Budget — bestätigen oder anpassen</div>
                      {!unlocked(2) && <div style={{ marginLeft: 'auto', fontSize: 12, color: T.slate }}>Zuerst Schritt 2</div>}
                      {doneSteps[2] && wizardStep !== 2 && <div style={{ marginLeft: 'auto', fontSize: 13, color: T.violetDeep, fontWeight: 600 }}>{fmtCHF(effectiveBudget)}</div>}
                    </div>
                    {wizardStep === 2 && unlocked(2) && (
                      <div style={{ padding: '0 22px 22px' }}>
                        {sweetRounded > 0 && (
                          <div style={{ background: `linear-gradient(135deg, ${T.violetDeep}, ${T.violet})`, color: 'white', borderRadius: 14, padding: '18px 20px', marginBottom: 18 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>✦ Dein Wirkungsbereich für {regionName}</div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 7 }}>{fmtCHF(sweetRounded)}</div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                              Bei <strong style={{ color: 'white' }}>{WF_LABEL[wfKey]}</strong> über <strong style={{ color: 'white' }}>{effLauf} Tage</strong> in {regionName} trifft dieses Budget deinen Wirkungsbereich — abgestimmt auf Budget, Frequenz, Laufzeit und {kanalFaktor} in {regionName}.
                            </div>
                          </div>
                        )}
                        <p style={{ fontSize: 13, color: T.slate, margin: '0 0 8px', lineHeight: 1.45 }}>
                          Der Regler steht bereits auf der Empfehlung. Hast du ein festes Budget im Kopf? Tipp es einfach drüber — wir zeigen dir sofort, was es bewirkt.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>Budget</span>
                          <label style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.violet }}>CHF</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={budgetRaw}
                              onChange={e => setBudgetRaw(e.target.value)}
                              onBlur={e => {
                                const v = Number(e.target.value.replace(/[^0-9]/g, ''));
                                const clamped = (isNaN(v) || v < 4000) ? 4000 : Math.round(Math.min(Math.max(4000, customBudgetMax), v) / 500) * 500;
                                handleCustomConfigChange({ budget: clamped });
                              }}
                              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: T.violet, background: 'none', border: 'none', borderBottom: `2px solid ${T.violet}`, outline: 'none', width: 96, textAlign: 'right', padding: '0 2px' }}
                            />
                          </label>
                        </div>
                        <div style={{ position: 'relative', height: 4, background: T.lineStrong, borderRadius: 999, margin: '14px 0 4px' }}>
                          <div style={{
                            position: 'absolute', left: 0, top: 0, height: '100%',
                            width: `${customBudgetMax > 4000 ? Math.max(0, Math.min(100, ((effectiveBudget - 4000) / (customBudgetMax - 4000)) * 100)) : 0}%`,
                            background: T.violet, borderRadius: 999, pointerEvents: 'none',
                          }} />
                          {sweetSpotCustom && sweetSpotCustom.budget > 0 && customBudgetMax > 4000 && (() => {
                            const range     = customBudgetMax - 4000;
                            const leftPct   = Math.max(0, Math.min(100, ((0.87 * sweetSpotCustom.budget - 4000) / range) * 100));
                            const rightPct  = Math.max(0, Math.min(100, ((1.13 * sweetSpotCustom.budget - 4000) / range) * 100));
                            const markerPct = Math.max(0, Math.min(100, ((sweetSpotCustom.budget - 4000) / range) * 100));
                            return (
                              <>
                                <div style={{ position: 'absolute', top: -3, height: 10, left: `${leftPct}%`, width: `${Math.max(0, rightPct - leftPct)}%`, background: 'rgba(107,79,187,0.18)', borderRadius: 999, pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', top: -4, width: 12, height: 12, left: `${markerPct}%`, transform: 'translateX(-50%)', background: T.violet, borderRadius: '50%', opacity: 0.7, pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', top: 10, left: `${markerPct}%`, transform: 'translateX(-50%)', fontSize: 10, color: T.violet, whiteSpace: 'nowrap', pointerEvents: 'none', fontWeight: 600 }}>Wirkungsbereich</div>
                              </>
                            );
                          })()}
                          <input type="range" className="vio-range" min={4000} max={Math.max(4000, customBudgetMax)} step={500} value={effectiveBudget} onChange={e => handleCustomConfigChange({ budget: Number(e.target.value) })} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.slate }}>
                          <span>CHF 4&apos;000</span>
                          <span>{fmtCHF(customBudgetMax)}</span>
                        </div>
                        {sweetRounded > 0 && effectiveBudget !== sweetRounded && (
                          <button type="button" onClick={() => handleCustomConfigChange({ budget: sweetRounded })}
                            style={{ marginTop: 10, background: 'none', border: `1px solid ${T.lineStrong}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, color: T.violetDeep, cursor: 'pointer', fontFamily: "'Jost', sans-serif", fontWeight: 500 }}>
                            ↺ Zurück zur Empfehlung
                          </button>
                        )}
                        {microHint(
                          effectiveBudget < zoneLow
                            ? <>Solide Basis. Ab {fmtCHF(sweetRounded)} holst du in {regionName} spürbar mehr Menschen ab.</>
                            : effectiveBudget <= zoneHigh
                            ? <>Genau im Wirkungsbereich — abgestimmt auf Budget, Frequenz, Laufzeit und {kanalFaktor}.</>
                            : <>Volle Power: du schöpfst {regionName} fast aus. Mehr bringt nur noch wenig dazu.</>
                        )}
                        <button type="button" style={stepBtn}
                          onClick={() => { setDoneSteps(prev => { const n = [...prev]; n[2] = true; return n; }); setWizardStep(3); }}>
                          Fertig — Ergebnis zeigen ↓
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Pfad 'paket': Paket-Karten */}
            {mode === 'paket' && packages && (
              <div className="vio-pkgs">
                <PackageCards packages={packages} selectedPkg={selectedPkg} onChange={handlePkgChange} disabledPkgs={disabledPkgs} recommendedPkg={recommendedPkg} onCustom={handleSwitchToCustom} />
                {/* §9.2 Aufklärungssatz */}
                <p style={{ fontSize: 13, color: T.slate, lineHeight: 1.5, margin: '0 0 12px' }}>
                  Mehr erreichte Personen heisst nicht automatisch mehr Wirkung — entscheidend ist, dass deine Botschaft oft genug gesehen wird.
                </p>
                {/* §9.2 Tier-C/D Custom-Hint */}
                {packages.customHint && (
                  <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: T.highlight, border: `1px solid ${T.lineStrong}`, borderRadius: 11, padding: '11px 14px', marginBottom: 14, fontSize: 13, color: T.ink, lineHeight: 1.45 }}>
                    <span style={{ color: T.violet, fontWeight: 700 }}>→</span>
                    <span>{regionName} zählt zu den grösseren Regionen. Wenn du zusätzliche Reichweite oder einen anderen Wirkungsfokus möchtest, kannst du deine Kampagne im Custom-Modus individuell konfigurieren.</span>
                  </div>
                )}
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
                  {displayReachImpact ? `~${fmtNum(displayReachImpact.reachUniqueAbs)}` : '—'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 26 }}>{demonym}</div>

                {/* 2 KPIs */}
                <div className="vio-kpis" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '18px 18px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Kampagnenkontakte</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.05, marginBottom: 4 }}>
                      {fCampaign}× gesehen
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Ø {fWeekly}× / Woche</div>
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
                  {doohPct === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'white' }}>Nur Online-Display</strong> — bei kurzer Laufzeit kein DOOH-Vorlauf möglich
                    </div>
                  ) : (
                    <>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', display: 'flex', gap: 2 }}>
                        <div style={{ width: `${doohPct}%`, background: '#B8A2F0', borderRadius: '999px 0 0 999px', transition: 'width 0.3s ease' }} />
                        <div style={{ width: `${displayPct}%`, background: T.violet, borderRadius: '0 999px 999px 0', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                        <span><strong style={{ color: 'white', fontWeight: 600 }}>{doohPct}%</strong> Digitale Plakate</span>
                        <span><strong style={{ color: 'white', fontWeight: 600 }}>{displayPct}%</strong> Online-Display</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Outcome (nur Pfad 'custom', nach Abschluss aller drei Schritte) */}
            {mode === 'custom' && customImpact && doneSteps[0] && doneSteps[1] && doneSteps[2] && (() => {
              const wfKey = customConfig.wirkungsfokus ?? 'ausgewogen';
              // v3.13: Kampagnenkontakte direkt (fix), Wochenfreq abgeleitet
              const frequenzKampagne = WIRKUNGSFOKUS_FREQUENZ[wfKey];
              const fWeeklyDisplay = campaignWindow.effectiveLaufzeitDays > 0
                ? frequenzKampagne / (campaignWindow.effectiveLaufzeitDays / 7)
                : 0;
              const heroStep = customImpact.reachUniqueLow < 10000 ? 100 : customImpact.reachUniqueLow < 100000 ? 1000 : 5000;
              const heroFloor = Math.floor(customImpact.reachUniqueLow / heroStep) * heroStep;
              const anchor = resolveLandmarkAnchor(customImpact.reachUniqueLow, selectedRegionsFull);
              const presence = customEval?.presence;
              const sweetB   = sweetSpotCustom ? sweetSpotCustom.budget : 0;
              const zoneLow  = sweetB * COACH_BUDGET_LOW_RATIO;
              const zoneHigh = sweetB * COACH_BUDGET_HIGH_RATIO;
              const confirm = effectiveBudget < zoneLow
                ? { title: 'Guter Plan — da geht noch was', text: `Mit etwas mehr Budget holst du spürbar mehr Menschen ab. Ab ${fmtCHF(Math.round(sweetB / 1000) * 1000)} bist du im Wirkungsbereich für ${regionName}.` }
                : effectiveBudget <= zoneHigh
                ? { title: 'Das sitzt.', text: `~${fmtNum(heroFloor)} ${demonym} sehen deine Botschaft im Schnitt ${frequenzKampagne}× — genug, um wirklich hängen zu bleiben. Starke Wahl.` }
                : { title: 'Volle Power für deine Region', text: `Du schöpfst das Potenzial von ${regionName} aus — fast jede erreichbare Person ist dabei.` };
              return (
                <>
                  {/* Zwei-Hero-Outcome: Menschen erreicht · Häufigkeit */}
                  <div style={{ background: T.ink, borderRadius: 20, padding: '30px 32px 28px', color: 'white', position: 'relative', overflow: 'hidden', marginBottom: 18 }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 300, height: 300, background: 'radial-gradient(circle, rgba(107,79,187,0.55), transparent 62%)', pointerEvents: 'none' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 18, position: 'relative' }}>
                      Das bewirkt deine Kampagne
                    </div>
                    <div className="vio-kpis" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, position: 'relative', zIndex: 1 }}>
                      <div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 50, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 7 }}>≈ {fmtNum(heroFloor)}</div>
                        <div style={{ fontSize: 15, color: 'white', fontWeight: 600, marginBottom: 3 }}>{demonym} erreicht</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>{fmtNum(customImpact.reachUniqueLow)} – {fmtNum(customImpact.reachUniqueHigh)} · typischer Bereich</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 50, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 7, color: '#C9B6FF' }}>{frequenzKampagne}×</div>
                        <div style={{ fontSize: 15, color: 'white', fontWeight: 600, marginBottom: 3 }}>gesehen während der Kampagne</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>
                          Ø {fWeeklyDisplay.toFixed(1)}×/Woche · {fWeeklyDisplay > 3 ? 'hoher Wochendruck' : fWeeklyDisplay >= 1 ? 'gleichmässig verteilt' : 'über lange Zeit verteilt'}
                        </div>
                      </div>
                    </div>
                    {presence && (
                      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 22, position: 'relative', zIndex: 1, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                        <span style={{ fontSize: 17, lineHeight: 1.3 }}>📍</span>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                          {campaignWindow.modus === 'display_only'
                            ? <><strong style={{ color: 'white' }}>Nur Online-Display</strong> — bei kurzer Laufzeit kein DOOH-Vorlauf möglich.</>
                            : presence.showScreenCount
                            ? <>Sichtbar auf rund <strong style={{ color: 'white' }}>{fmtNum(presence.screenCount)}</strong> Bildschirmen im öffentlichen Raum — und online.</>
                            : <>Sichtbar im öffentlichen Raum deiner Region — und online.</>}
                          <span style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>{anchor.text}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Laufzeit-Trade-off-Hinweis (nur bei >28d) */}
                  {campaignWindow.effectiveLaufzeitDays > REFERENZ_LAUFZEIT_DAYS && (
                    <div style={{ background: T.infoBg, border: '1px solid #D0D6F0', borderRadius: 11, padding: '11px 16px', marginBottom: 12, fontSize: 13, color: T.infoText, lineHeight: 1.5 }}>
                      Längere Laufzeit verteilt dein Budget auf mehr Wochen — du erreichst etwas weniger Personen, dafür bist du länger präsent.
                    </div>
                  )}

                  {/* Wohlwollende Bestätigung */}
                  <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', background: T.goodBg, border: '1px solid #C5DDC5', borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: T.good, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, marginTop: 1 }}>✓</div>
                    <div>
                      <div style={{ fontWeight: 600, color: T.good, marginBottom: 2, fontSize: 14 }}>{confirm.title}</div>
                      <div style={{ color: T.slate, fontSize: 14, lineHeight: 1.5 }}>{confirm.text}</div>
                    </div>
                  </div>
                </>
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
              const nextDisabled = mode === 'paket'
                ? selectedPkg === null
                : !(doneSteps[0] && doneSteps[1] && doneSteps[2]);
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
                  {nextDisabled && mode === 'custom' && (
                    <div style={{ fontSize: 13, color: T.slate, marginTop: 6, textAlign: 'right' as const }}>
                      Schliesse die drei Schritte ab, dann geht&apos;s weiter.
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

        </div>
      </div>
    </section>
  );
}
