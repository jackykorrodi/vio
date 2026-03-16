'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BriefingData } from '@/lib/types';

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

// ─── Tier definitions (dynamic budget) ───────────────────────────────────────
const BLENDED_CPM = 40; // (0.70×50) + (0.30×15) weighted average

const TIER_DEFS = [
  { id: 0 as const, label: 'Sichtbar',  rate: 0.14, freq: 3, lzWeeks: 1, lzLabel: '1 Woche'  },
  { id: 1 as const, label: 'Empfohlen', rate: 0.25, freq: 5, lzWeeks: 2, lzLabel: '2 Wochen' },
  { id: 2 as const, label: 'Präsenz',   rate: 0.35, freq: 7, lzWeeks: 4, lzLabel: '4 Wochen' },
];

function calcTierBudget(stimmber: number, rate: number, freq: number): number {
  const targetReach = stimmber * rate;
  const impressions = targetReach * freq;
  const raw = (impressions / 1000) * BLENDED_CPM;
  return Math.max(2500, Math.round(raw / 500) * 500);
}

// ─── Reach calculation (CPM formula, capped at stimmber) ─────────────────────
function calcReach(budget: number, freq: number, stimmber: number): { lo: number; hi: number; mid: number; pct: number } {
  const doohImp    = (budget * 0.70 / 50) * 1000;
  const displayImp = (budget * 0.30 / 15) * 1000;
  const rawReach   = (doohImp + displayImp) / freq;
  const reach      = Math.min(rawReach, stimmber);
  const lo  = Math.round(reach * 0.85 / 1000) * 1000;
  const hi  = Math.min(Math.round(reach * 1.15 / 1000) * 1000, stimmber);
  const mid = Math.round(reach / 1000) * 1000;
  const pct = Math.min(Math.round(reach / Math.max(1, stimmber) * 100), 100);
  return { lo, hi, mid, pct };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function formatDateDE(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  return `${date.getDate()}. ${MONTHS_DE[date.getMonth()]} ${date.getFullYear()}`;
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

  // Tier filtering by daysUntil (politik only)
  const daysUntil = isPolitik ? (briefing.daysUntil ?? 999) : 999;
  const maxAllowedWeeks = !isPolitik ? 4 : (daysUntil < 14 ? 1 : daysUntil < 28 ? 2 : 4);
  const visibleTiers = TIER_DEFS.filter(t => t.lzWeeks <= maxAllowedWeeks);

  // Compute dynamic budgets for each tier based on popSize
  const tierBudgets: Record<0 | 1 | 2, number> = {
    0: calcTierBudget(popSize, TIER_DEFS[0].rate, TIER_DEFS[0].freq),
    1: calcTierBudget(popSize, TIER_DEFS[1].rate, TIER_DEFS[1].freq),
    2: calcTierBudget(popSize, TIER_DEFS[2].rate, TIER_DEFS[2].freq),
  };

  // Default to Empfohlen (id=1) if visible, else highest visible
  const defaultTier = visibleTiers[Math.min(1, visibleTiers.length - 1)];

  const [budget, setBudget] = useState<number>(() => tierBudgets[defaultTier.id]);
  const [tierSelected, setTierSelected] = useState<0 | 1 | 2>(defaultTier.id);
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

  const activeTier     = TIER_DEFS[tierSelected];
  const currentFreq    = activeTier.freq;
  const currentLzWeeks = activeTier.lzWeeks;
  const currentLzLabel = activeTier.lzLabel;

  // Slider max: praesenz budget × 2, at least 20000
  const sliderMax = Math.max(tierBudgets[2] * 2, 20000);

  // Reach korridor from current budget + selected tier's freq, capped at popSize
  const { lo, hi, mid, pct } = calcReach(budget, currentFreq, popSize);
  const reachFraction = Math.min(1, mid / Math.max(1, popSize));

  const handleTierSelect = (id: 0 | 1 | 2) => {
    setTierSelected(id);
    setBudget(tierBudgets[id]);
  };

  // Slider only changes budget — keeps selected tier's laufzeit/freq
  const handleSliderChange = (val: number) => {
    setBudget(val);
  };

  const handleNext = () => {
    updateBriefing({
      budget,
      laufzeit: currentLzWeeks,
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
  const popLabel    = isPolitik ? 'Stimmberechtigte' : 'Bevölkerung';

  const ctBadgeLabel = briefing.campaignType === 'b2c' ? 'B2C' : briefing.campaignType === 'b2b' ? 'B2B' : 'Politische Kampagne';
  const ctBadgeColor = briefing.campaignType === 'politik' ? '#7C3AED' : C.primary;

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Eyebrow ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 18, height: 2, background: C.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 3
          </span>
        </div>

        {/* ── Heading ── */}
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 20, color: C.taupe }}>
          Wie weit soll deine Kampagne strahlen?
        </h1>

        {/* ── Context bar ── */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 18px', marginBottom: 14, display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 10, fontSize: 13, color: C.taupe }}>
          <span style={{ background: ctBadgeColor, color: '#fff', borderRadius: 100, padding: '3px 11px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em' }}>
            {ctBadgeLabel}
          </span>
          {regionName && (
            <span style={{ color: C.taupe }}>
              📍 <strong>{regionName}</strong>
              &nbsp;·&nbsp;
              {popSize.toLocaleString('de-CH')}&nbsp;{isPolitik ? 'Stimmberechtigte' : 'Personen'}
            </span>
          )}
          {isPolitik && briefing.daysUntil != null && (
            <span style={{ color: '#7A5500', background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: 8, padding: '3px 10px' }}>
              🗳️ Abstimmung in <strong>{briefing.daysUntil}</strong> Tagen
            </span>
          )}
        </div>

        {/* ── Three tier cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleTiers.length}, 1fr)`, gap: 12, marginBottom: 14 }}>
          {visibleTiers.map((t) => {
            const isActive = tierSelected === t.id;
            const tBudget = tierBudgets[t.id];
            const { lo: tLo, hi: tHi, pct: tPct } = calcReach(tBudget, t.freq, popSize);
            return (
              <div
                key={t.id}
                onClick={() => handleTierSelect(t.id)}
                style={{
                  border: isActive ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                  background: isActive ? C.pl : C.white,
                  borderRadius: 14, padding: '16px 14px',
                  cursor: 'pointer', transition: 'all .15s',
                  position: 'relative', userSelect: 'none',
                }}
              >
                {/* "Empfohlen" badge on tier id=1 */}
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
                  {t.lzLabel} · {t.freq}× Frequenz
                </div>
                <div style={{ fontSize: 11, color: isActive ? C.pd : C.muted, lineHeight: 1.4 }}>
                  ~{fmtRange(tLo, tHi)} {personLabel} ({tPct}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Short-notice note ── */}
        {isPolitik && daysUntil < 14 && (
          <div style={{ fontSize: 12, color: '#7A5500', background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            ⚠️ Zu kurzfristig für längere Kampagnen — nur 1-Woche-Buchung verfügbar.
          </div>
        )}

        {/* ── Headline stat (korridor) ── */}
        <div style={{ background: C.pl, borderRadius: 12, padding: '16px 22px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, color: C.taupe, fontWeight: 400, lineHeight: 1.3 }}>
            {fmtRange(lo, hi)}&nbsp;{personLabel} sehen deine Kampagne&nbsp;{currentFreq}×&nbsp;— über {currentLzLabel}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Das entspricht ca. {pct}% der {personLabel} in {regionName}
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

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>{popLabel}</div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, color: C.taupe, letterSpacing: '-.02em' }}>
              {fmtN(popSize)}
            </div>
          </div>

          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>Laufzeit · Kampagnenstart</div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 18, color: C.taupe, marginBottom: 8, lineHeight: 1.3 }}>
              {currentLzLabel} · {formatDateDE(startDate)}
            </div>
            <input
              type="date"
              value={startDate}
              min={todayStr()}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 12, color: C.taupe, fontFamily: 'var(--font-outfit), sans-serif', backgroundColor: C.white, outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>Ø Kontaktfrequenz</div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, color: C.taupe, letterSpacing: '-.02em' }}>
              {currentFreq}× pro Person / Woche
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
