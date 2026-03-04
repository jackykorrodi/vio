'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { calculateReach, formatNumber, formatCHF } from '@/lib/calculations';
import { MIN_BUDGET, MAX_BUDGET } from '@/lib/constants';

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
  green: '#3A9E7A',
} as const;

const page: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const card: React.CSSProperties = {
  background: C.white,
  borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(44,44,62,.07)',
  padding: '20px 22px',
  marginBottom: '14px',
};

const clabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.1em',
  color: C.muted,
  textTransform: 'uppercase',
  marginBottom: '10px',
};

const LAUFZEITEN = [
  { value: 1, label: '1W' },
  { value: 2, label: '2W' },
  { value: 4, label: '4W' },
  { value: 8, label: '8W' },
];

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatDateDE(d: Date): string {
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

export default function Step4Budget({ briefing, updateBriefing, nextStep }: Props) {
  const [budget, setBudget] = useState(briefing.budget || 15000);
  const [laufzeit, setLaufzeit] = useState(briefing.laufzeit || 4);
  const [startDate, setStartDate] = useState(todayStr());

  // Logarithmic slider
  const logMin = Math.log(MIN_BUDGET);
  const logMax = Math.log(MAX_BUDGET);
  const sliderValue = ((Math.log(budget) - logMin) / (logMax - logMin)) * 100;

  const handleSlider = (val: number) => {
    const logVal = logMin + (val / 100) * (logMax - logMin);
    setBudget(Math.round(Math.exp(logVal) / 100) * 100);
  };

  const reach = calculateReach(budget, laufzeit);
  const endDate = addDays(startDate, laufzeit * 7);
  const dateLabel = `${formatDateDE(new Date(startDate + 'T12:00:00'))} – ${formatDateDE(endDate)} (${laufzeit} ${laufzeit === 1 ? 'Woche' : 'Wochen'})`;

  const doohBudget = Math.round(budget * 0.7);
  const displayBudget = Math.round(budget * 0.3);

  const handleNext = () => {
    updateBriefing({ budget, laufzeit, reach: reach.uniquePeople });
    nextStep();
  };

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 4
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Wie viel soll deine Kampagne leisten?
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Budget und Laufzeit bestimmen deine Reichweite. Live-Berechnung während du schiebst.
        </p>

        {/* Budget card */}
        <div style={card}>
          <div style={clabel}>Budget</div>
          <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '38px', letterSpacing: '-.03em', marginBottom: '2px', color: C.taupe }}>
            {formatCHF(budget)}
          </div>
          <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>
            70% DOOH · 30% Display
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={e => handleSlider(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.primary, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.muted, fontWeight: 500, marginTop: '5px' }}>
            <span>{formatCHF(MIN_BUDGET)}</span>
            <span>{formatCHF(MAX_BUDGET)}</span>
          </div>
        </div>

        {/* Date + Laufzeit card */}
        <div style={card}>
          <div style={clabel}>Laufzeit</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '4px' }}>
            <div>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>Startdatum</div>
              <input
                type="date"
                value={startDate}
                min={todayStr()}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${C.border}`,
                  fontSize: '14px',
                  color: C.taupe,
                  fontFamily: 'var(--font-outfit), sans-serif',
                  backgroundColor: C.bg,
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>Anzahl Wochen</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {LAUFZEITEN.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLaufzeit(l.value)}
                    style={{
                      padding: '8px 15px',
                      borderRadius: '100px',
                      border: `1.5px solid ${laufzeit === l.value ? C.primary : C.border}`,
                      backgroundColor: laufzeit === l.value ? C.primary : C.white,
                      color: laufzeit === l.value ? '#fff' : C.muted,
                      fontSize: '13px',
                      fontWeight: laufzeit === l.value ? 600 : 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-outfit), sans-serif',
                      transition: 'all .15s',
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Date result */}
          <div style={{ background: C.pl, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.pd, fontWeight: 500, marginTop: '10px' }}>
            📅 {dateLabel}
          </div>
        </div>

        {/* ZG-Breite card */}
        <div style={card}>
          <div style={clabel}>Zielgruppen-Breite</div>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={35}
            style={{ width: '100%', accentColor: C.primary, cursor: 'pointer', marginBottom: '5px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.muted, fontWeight: 500 }}>
            <span>← Breit · mehr Reichweite</span>
            <span>Präzise · treffsicherer →</span>
          </div>
        </div>

        {/* Reach box */}
        <div style={{ background: 'linear-gradient(135deg,#EBF7F2,#D4F0E6)', border: '1px solid #A8DFC8', borderRadius: '14px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '14px' }}>
          <div style={{ fontSize: '34px' }}>👥</div>
          <div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '42px', color: C.green, letterSpacing: '-.03em', lineHeight: 1 }}>
              {formatNumber(reach.uniquePeople)}
            </div>
            <div style={{ fontSize: '13px', color: C.green, marginTop: '4px', fontWeight: 500 }}>
              erreichbare Personen · Ø 3× Kontakt/Woche
            </div>
          </div>
        </div>

        {/* ibox */}
        <div style={{ background: C.taupe, borderRadius: '14px', padding: '20px 22px', marginBottom: '14px' }}>
          <h3 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '19px', color: '#fff', fontWeight: 400, marginBottom: '8px' }}>
            So arbeitet dein Budget
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: '10px' }}>
            70% geht in DOOH-Screens (Aussenwerbung, digitale Screens), 30% in Display-Werbung online.
          </p>
          {[
            `DOOH: ${formatCHF(doohBudget)} · ca. ${formatNumber(reach.doohImpressions)} Impressionen`,
            `Display: ${formatCHF(displayBudget)} · ca. ${formatNumber(reach.displayImpressions)} Impressionen`,
            'Ø Kontaktfrequenz: 3× pro Person und Woche',
          ].map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: '5px' }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)' }}>{pt}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleNext}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: C.primary, color: '#fff', border: 'none',
            borderRadius: '100px', padding: '15px 32px',
            fontFamily: 'var(--font-outfit), sans-serif', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,102,107,.3)',
            transition: 'all .18s', marginTop: '8px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
        >
          Weiter zu den Werbemitteln →
        </button>
      </div>
    </section>
  );
}
