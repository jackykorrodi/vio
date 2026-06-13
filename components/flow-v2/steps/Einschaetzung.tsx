'use client';

import { useState } from 'react';
import { useFlow } from '../FlowContext';
import { empfehleBudget, bewerteEckwerte, MIN_BUDGET } from '@/lib/eckwerte-logik';
import styles from '../Shell.module.css';
import type { Risiko } from '@/lib/eckwerte-logik';

// ── Konstanten ────────────────────────────────────────────────────────────────

const LAUF_OPTS: Array<{ lauf: 14 | 28 | 42; label: string }> = [
  { lauf: 14, label: 'Kurz & dicht' },
  { lauf: 28, label: 'Empfohlen' },
  { lauf: 42, label: 'Lang & stetig' },
];

const RISIKO_COLOR: Record<Risiko, string> = {
  niedrig: '#15A37E',
  mittel:  '#C98A2B',
  hoch:    '#BC5640',
};

const RISIKO_TEXT: Record<Risiko, string> = {
  niedrig: 'niedrig',
  mittel:  'mittel',
  hoch:    'hoch',
};

const fmtChf = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;

// ── Stepper-Button ────────────────────────────────────────────────────────────

const stepperBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 9,
  border: '1.5px solid #E6E1F2', background: '#fff',
  fontSize: 20, lineHeight: '1', cursor: 'pointer',
  color: '#6B4FBB', fontFamily: 'var(--font-display)',
  transition: 'border-color .15s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function Einschaetzung() {
  const { anker, budget, einschaetzung, setEinschaetzung, goTo, steps } = useFlow();
  const { laufzeit, budgetJustiert } = einschaetzung;
  const [whyOpen, setWhyOpen] = useState(false);

  // Zeitraum aus Wahlsonntag ableiten
  const termin = anker.wahlsonntag ? new Date(anker.wahlsonntag.date) : null;
  const start   = termin ? new Date(termin.getTime() - laufzeit * 86_400_000) : null;
  const ende    = termin;

  // Basis-Budget: «haben» → eigener Betrag; sonst empfehleBudget
  const baseBudget: number = (() => {
    if (budget.modus === 'haben' && budget.betragChf !== null) return budget.betragChf;
    if (!start || !ende || anker.regions.length === 0) return MIN_BUDGET;
    return empfehleBudget({ start, ende, regions: anker.regions });
  })();

  const effectiveBudget = budgetJustiert ?? baseBudget;

  const result = (start && ende && anker.regions.length > 0)
    ? bewerteEckwerte({ budgetChf: effectiveBudget, start, ende, regions: anker.regions })
    : null;

  const isEmpfehlungUntouched = budget.modus === 'empfehlung' && budgetJustiert === null;
  const risiko   = result?.risiko ?? 'niedrig';
  const dotColor = RISIKO_COLOR[risiko];

  function stepBudget(delta: number) {
    setEinschaetzung({ budgetJustiert: Math.max(MIN_BUDGET, effectiveBudget + delta) });
  }

  const ankerIdx = steps.indexOf('anker');

  const LAUFZEIT_LANG: Record<14 | 28 | 42, string> = {
    14: 'Kompakt in den letzten zwei Wochen — dicht, wenn alle entscheiden.',
    28: 'Schwerpunkt ab Versand der Stimmunterlagen, rund drei Wochen vor dem Termin.',
    42: 'Früh aufbauen und bis zum Termin stetig präsent bleiben.',
  };

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Der Moment
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Unsere Einschätzung steht.
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 28, maxWidth: 520 }}>
          Sie ist rechts in euer Dossier — Zielbild, Ausgangslage, Empfehlung. Auf eure Angaben zugeschnitten.
        </p>
      </div>

      {/* Point-right-Nudge */}
      <div className={styles.rv} style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: '#F6F3FC', border: '1px solid #EFEBF9',
        borderRadius: 16, padding: '16px 18px', marginBottom: 28, maxWidth: 540,
        '--i': 1,
      } as React.CSSProperties}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M4 12h15m0 0l-6-6m6 6l-6 6" stroke="#6B4FBB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: '#2D1F52' }}>
          Lest die Einschätzung im Dossier. Wenn etwas nicht passt, justiert hier — die Konsequenz seht ihr sofort.
        </p>
      </div>

      {/* Justier-Karte */}
      <div className={styles.rv} style={{ border: '1.5px solid #E6E1F2', borderRadius: 18, background: '#fff', padding: '6px 20px', maxWidth: 540, '--i': 2 } as React.CSSProperties}>

        {/* Budget-Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #E6E1F2', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: '#2D1F52' }}>Budget</span>
            {isEmpfehlungUntouched && (
              <span style={{ display: 'block', fontSize: 11.5, color: '#857DA0', marginTop: 2 }}>unsere Empfehlung</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <button onClick={() => stepBudget(-500)} style={stepperBtnStyle}>−</button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, minWidth: 106, textAlign: 'center' }}>
              {fmtChf(effectiveBudget)}
            </span>
            <button onClick={() => stepBudget(500)} style={stepperBtnStyle}>+</button>
          </div>
        </div>

        {/* Laufzeit-Zeile */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #E6E1F2', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: '#2D1F52' }}>Laufzeit</span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#857DA0', marginTop: 3, lineHeight: 1.4 }}>
              Gleiche Summe, anders verteilt: kurz heisst dichter, lang heisst dünner.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {LAUF_OPTS.map(({ lauf, label }) => (
              <button
                key={lauf}
                onClick={() => setEinschaetzung({ laufzeit: lauf })}
                style={{
                  border: `1.5px solid ${laufzeit === lauf ? '#6B4FBB' : '#E6E1F2'}`,
                  background: laufzeit === lauf ? '#F6F3FC' : '#fff',
                  borderRadius: 9, padding: '8px 11px', fontSize: 12.5,
                  cursor: 'pointer', fontFamily: 'inherit',
                  color: laufzeit === lauf ? '#6B4FBB' : '#2D1F52',
                  fontWeight: laufzeit === lauf ? 600 : 400,
                  transition: 'all .15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Gebiet-Zeile */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0', gap: 12 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#2D1F52' }}>Gebiet</span>
          <button
            onClick={() => goTo(ankerIdx)}
            style={{ fontSize: 13.5, color: '#6B4FBB', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 }}
          >
            ← im ersten Schritt anpassen
          </button>
        </div>
      </div>

      {/* Adj-Note + Aufklapper + Footer */}
      <div className={styles.rv} style={{ '--i': 3 } as React.CSSProperties}>
        {result && (
          <p style={{ fontSize: 13, color: '#857DA0', marginTop: 14, lineHeight: 1.5, maxWidth: 540 }}>
            Mit dieser Einstellung: {laufzeit} Tage Laufzeit, Risiko unterzugehen{' '}
            <span style={{ color: dotColor, fontWeight: 600 }}>{RISIKO_TEXT[risiko]}</span>.
            {result.risiko !== 'niedrig' && (
              <> Was hilft: {result.hebel.join(' · ')}.</>
            )}
          </p>
        )}

        {result && (
          <div style={{ marginTop: 14, maxWidth: 540 }}>
            <button
              onClick={() => setWhyOpen(!whyOpen)}
              style={{ fontSize: 12, color: '#857DA0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
            >
              Warum diese Empfehlung?{' '}
              <span style={{ color: '#6B4FBB' }}>{whyOpen ? '−' : '+'}</span>
            </button>
            {whyOpen && (
              <p style={{ fontSize: 12.5, color: '#857DA0', lineHeight: 1.55, marginTop: 7 }}>
                {LAUFZEIT_LANG[laufzeit]}{' '}
                {isEmpfehlungUntouched
                  ? 'Der Betrag ist unsere Empfehlung für eure Lage.'
                  : result.ratio < 1
                    ? 'Der Betrag ist knapp — der Fokus auf die Hochburgen hält ihn tragfähig.'
                    : ''}
              </p>
            )}
          </div>
        )}

        <p style={{ fontSize: 12.5, color: '#857DA0', marginTop: 18, lineHeight: 1.5, maxWidth: 540 }}>
          Unser Rat, nicht euer Befehl. Wir regeln Präsenz und Standorte im Hintergrund.
        </p>
      </div>
    </div>
  );
}
