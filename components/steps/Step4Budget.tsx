'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BriefingData } from '@/lib/types';

// Dynamic import avoids SSR issues with D3/canvas
const SwissMap = dynamic(() => import('./SwissMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 340,
        background: '#FAF7F2',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8A8490',
        fontSize: 13,
      }}
    >
      Karte wird geladen…
    </div>
  ),
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#C1666B', pd: '#A84E53', pl: '#F9ECEC',
  taupe: '#5C4F3D', muted: '#8A8490', border: '#EDE8E0',
  bg: '#FAF7F2', white: '#FFFFFF', green: '#3A9E7A',
} as const;

// ─── Canton population data ───────────────────────────────────────────────────
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

// ─── Tier definitions ─────────────────────────────────────────────────────────
const TIERS = [
  { id: 0, name: 'Sichtbar',   weeks: 1, freq: 3, cpm: 28, popFrac: 0.14 },
  { id: 1, name: 'Empfohlen',  weeks: 2, freq: 5, cpm: 32, popFrac: 0.25 },
  { id: 2, name: 'Präsenz',    weeks: 4, freq: 7, cpm: 38, popFrac: 0.35 },
] as const;

// ─── Budget helpers ────────────────────────────────────────────────────────────
function calcTierBudget(pop: number, tier: typeof TIERS[number]): number {
  const targetReach = pop * tier.popFrac;
  const raw = (targetReach * tier.freq / 1000) * tier.cpm;
  return Math.max(2500, Math.round(raw / 500) * 500);
}

function calcReachFromBudget(budget: number, freq: number, cpm: number): number {
  return Math.round((budget / cpm) * 1000 / freq);
}

// ─── Date helper ──────────────────────────────────────────────────────────────
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

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

  const regionName = isPolitik
    ? (briefing.politikRegion ?? 'Gesamte Schweiz')
    : (briefing.analysis?.region?.[0] ?? 'Gesamte Schweiz');

  const popData = CANTON_POP[regionName] ?? CANTON_POP['Gesamte Schweiz'];
  const popSize = isPolitik ? (briefing.stimmberechtigte ?? popData.stimm) : popData.bev;

  // Tier budgets
  const tierBudgets = TIERS.map(t => calcTierBudget(popSize, t));

  // Initial values
  const initBudget = briefing.recommendedBudget ?? tierBudgets[1];
  const initTier = tierBudgets.reduce((best, tb, i) =>
    Math.abs(tb - initBudget) < Math.abs(tierBudgets[best] - initBudget) ? i : best, 1);

  const [budget, setBudget] = useState(initBudget);
  const [tierSelected, setTierSelected] = useState(initTier);
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

  const activeTier = TIERS[tierSelected];
  const currentFreq = activeTier.freq;
  const currentLaufzeit = activeTier.weeks;
  const currentReach = calcReachFromBudget(budget, currentFreq, activeTier.cpm);
  const reachFraction = Math.min(1, currentReach / popSize);

  const handleTierSelect = (tierIdx: number) => {
    setTierSelected(tierIdx);
    setBudget(tierBudgets[tierIdx]);
  };

  const handleSliderChange = (val: number) => {
    setBudget(val);
    const closest = tierBudgets.reduce((best, tb, i) =>
      Math.abs(tb - val) < Math.abs(tierBudgets[best] - val) ? i : best, 0);
    setTierSelected(closest);
  };

  const handleNext = () => {
    updateBriefing({
      budget,
      laufzeit: currentLaufzeit,
      startDate,
      reach: currentReach,
      freq: currentFreq,
      tierSelected,
      b2bReach: null,
    });
    nextStep();
  };

  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;
  const fmtN = (n: number) => Math.round(n).toLocaleString('de-CH');

  const personLabel = isPolitik ? 'Stimmberechtigte' : 'Personen';
  const popLabel = isPolitik ? 'Stimmberechtigte' : 'Bevölkerung';

  // Campaign type pill
  const ctBadgeLabel =
    briefing.campaignType === 'b2c' ? 'B2C' :
    briefing.campaignType === 'b2b' ? 'B2B' :
    'Politische Kampagne';
  const ctBadgeColor =
    briefing.campaignType === 'politik' ? '#7C3AED' : C.primary;

  const sliderMin = 2500;
  const sliderMax = 50000;

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Eyebrow ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 18, height: 2, background: C.primary, borderRadius: 2 }} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
            color: C.primary, textTransform: 'uppercase',
          }}>
            Schritt 3
          </span>
        </div>

        {/* ── Heading ── */}
        <h1 style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: 30, fontWeight: 400, letterSpacing: '-.02em',
          lineHeight: 1.25, marginBottom: 20, color: C.taupe,
        }}>
          Wie weit soll deine Kampagne strahlen?
        </h1>

        {/* ── Context bar ── */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '12px 18px',
          marginBottom: 14,
          display: 'flex',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: C.taupe,
        }}>
          {/* Campaign type badge */}
          <span style={{
            background: ctBadgeColor,
            color: '#fff',
            borderRadius: 100,
            padding: '3px 11px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.04em',
          }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          {TIERS.map((t, i) => {
            const isActive = tierSelected === i;
            const tierReach = calcReachFromBudget(tierBudgets[i], t.freq, t.cpm);
            return (
              <div
                key={t.id}
                onClick={() => handleTierSelect(i)}
                style={{
                  border: isActive ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                  background: isActive ? C.pl : C.white,
                  borderRadius: 14,
                  padding: '16px 14px',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  position: 'relative',
                  userSelect: 'none',
                }}
              >
                {/* "Empfohlen" badge on middle card */}
                {i === 1 && (
                  <div style={{
                    position: 'absolute', top: -10, left: '50%',
                    transform: 'translateX(-50%)',
                    background: C.pl,
                    border: `1px solid ${C.pd}`,
                    color: C.pd,
                    borderRadius: 100,
                    padding: '2px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    whiteSpace: 'nowrap' as const,
                  }}>
                    Empfohlen
                  </div>
                )}

                {/* Tier name */}
                <div style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 18, fontWeight: 400, color: C.taupe,
                  marginBottom: 4,
                }}>
                  {t.name}
                </div>

                {/* Budget */}
                <div style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 26, color: C.primary,
                  letterSpacing: '-.02em', lineHeight: 1,
                  marginBottom: 4,
                }}>
                  {fmtCHF(tierBudgets[i])}
                </div>

                {/* Weeks · Freq */}
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                  · {t.weeks}W · {t.freq}× Frequenz
                </div>

                {/* Reach subline */}
                <div style={{
                  fontSize: 11, color: isActive ? C.pd : C.muted,
                  lineHeight: 1.4,
                }}>
                  ~{fmtN(tierReach)} {personLabel} sehen dich {t.freq}×
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Headline stat ── */}
        <div style={{
          background: C.pl,
          borderRadius: 12,
          padding: '16px 22px',
          marginBottom: 14,
        }}>
          <div style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 22, color: C.taupe, fontWeight: 400, lineHeight: 1.3,
          }}>
            ~{fmtN(currentReach)} {personLabel} sehen deine Kampagne {currentFreq}×&nbsp;
            — über {currentLaufzeit} {currentLaufzeit === 1 ? 'Woche' : 'Wochen'}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Das entspricht {Math.round(reachFraction * 100)}% der {personLabel} in {regionName}
          </div>
        </div>

        {/* ── Budget slider ── */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '20px 22px',
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
            color: C.muted, textTransform: 'uppercase', marginBottom: 10,
          }}>
            Budget feinjustieren
          </div>

          <div style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 32, color: C.taupe, letterSpacing: '-.03em',
            marginBottom: 10,
          }}>
            {fmtCHF(budget)}
          </div>

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={500}
            value={budget}
            onChange={e => handleSliderChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.primary, cursor: 'pointer' }}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 5,
          }}>
            <span>{fmtCHF(sliderMin)}</span>
            <span>{fmtCHF(sliderMax)}</span>
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 14,
          padding: '16px 22px 20px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
            color: C.muted, textTransform: 'uppercase', marginBottom: 12,
          }}>
            Reichweite visualisieren
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SwissMap
              highlightRegion={regionName}
              campaignType={briefing.campaignType}
              reachFraction={reachFraction}
              width={560}
              height={340}
            />
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', gap: 20, marginTop: 12,
            fontSize: 12, color: C.muted, alignItems: 'center',
          }}>
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

          {/* Card 1: Population */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>
              {popLabel}
            </div>
            <div style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 22, color: C.taupe, letterSpacing: '-.02em',
            }}>
              {fmtN(popSize)}
            </div>
          </div>

          {/* Card 2: Laufzeit + Startdatum */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>
              Laufzeit · Kampagnenstart
            </div>
            <div style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 18, color: C.taupe, marginBottom: 8, lineHeight: 1.3,
            }}>
              {currentLaufzeit} {currentLaufzeit === 1 ? 'Woche' : 'Wochen'} · {formatDateDE(startDate)}
            </div>
            <input
              type="date"
              value={startDate}
              min={todayStr()}
              onChange={e => setStartDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `1.5px solid ${C.border}`,
                fontSize: 12,
                color: C.taupe,
                fontFamily: 'var(--font-outfit), sans-serif',
                backgroundColor: C.white,
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Card 3: Frequency */}
          <div style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>
              Ø Kontaktfrequenz
            </div>
            <div style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 22, color: C.taupe, letterSpacing: '-.02em',
            }}>
              {currentFreq}× pro Person / Woche
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <button
          type="button"
          onClick={handleNext}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.primary, color: '#fff', border: 'none',
            borderRadius: 100, padding: '15px 32px',
            fontFamily: 'var(--font-outfit), sans-serif',
            fontSize: 16, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(193,102,107,.3)',
            transition: 'all .18s',
            marginTop: 8,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.pd;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.primary;
            e.currentTarget.style.transform = 'none';
          }}
        >
          Weiter zu den Werbemitteln →
        </button>

      </div>
    </section>
  );
}
