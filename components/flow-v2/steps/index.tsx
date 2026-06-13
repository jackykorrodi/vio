'use client';

import { useFlow, type Mode } from '../FlowContext';
export { Anker } from './Anker';
export { Wen } from './Wen';
export { Budget } from './Budget';
export { Einschaetzung } from './Einschaetzung';
export { Eckwerte } from './Eckwerte';
export { Werbemittel } from './Werbemittel';
export { Wow } from './Wow';
export { Abschluss } from './Abschluss';

// ── Shared step chrome ───────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
      {children}
    </p>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
      {children}
    </h1>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 30, maxWidth: 520 }}>
      {children}
    </p>
  );
}

function Placeholder() {
  return (
    <div style={{ background: '#F6F3FC', border: '1.5px dashed #C5BAE4', borderRadius: 14, padding: '20px 22px', color: '#857DA0', fontSize: 14, lineHeight: 1.6 }}>
      Inhalt folgt
    </div>
  );
}

// ── Weiche ───────────────────────────────────────────────────────────────────

const MODUS_CARDS: Array<{ mode: Mode; title: string; desc: string; tag?: string }> = [
  {
    mode:  'geführt',
    title: 'Geführt',
    desc:  'VIO schlägt Budget und Laufzeit vor — ihr justiert, was nicht passt.',
    tag:   'Beim ersten Mal',
  },
  {
    mode:  'impact',
    title: 'Impactbuchung',
    desc:  'Ihr setzt Gebiet, Zeitraum und Budget selbst. Buchbar ist es immer.',
  },
];

export function Weiche() {
  const { mode, setMode } = useFlow();

  return (
    <div>
      <Eyebrow>Schritt 2 · Einstieg</Eyebrow>
      <StepTitle>Wie möchtet ihr planen?</StepTitle>
      <Sub>Wählt euren Einstieg — ihr könnt jederzeit wechseln.</Sub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 540 }}>
        {MODUS_CARDS.map(card => (
          <button
            key={card.mode}
            onClick={() => setMode(card.mode)}
            style={{
              border: `1.5px solid ${mode === card.mode ? '#6B4FBB' : '#E6E1F2'}`,
              borderRadius: 20,
              padding: 22,
              cursor: 'pointer',
              background: mode === card.mode ? '#F6F3FC' : '#fff',
              boxShadow: mode === card.mode ? 'inset 0 0 0 1px #6B4FBB' : 'none',
              textAlign: 'left',
              position: 'relative',
              transition: 'all 0.18s',
              fontFamily: 'inherit',
            }}
          >
            {card.tag && (
              <span style={{
                position: 'absolute', top: -10, right: 18,
                fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em',
                textTransform: 'uppercase', background: '#6B4FBB', color: '#fff',
                padding: '3px 11px', borderRadius: 99,
              }}>
                {card.tag}
              </span>
            )}
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: '#2D1F52', marginBottom: 6 }}>
              {card.title}
            </p>
            <p style={{ fontSize: 14.5, color: '#857DA0', lineHeight: 1.5 }}>
              {card.desc}
            </p>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: '#857DA0', marginTop: 16, lineHeight: 1.5, maxWidth: 540 }}>
        {mode === 'geführt'
          ? 'Geführt gewählt — VIO schlägt vor, ihr entscheidet.'
          : 'Impactbuchung gewählt — ihr setzt alle Eckwerte selbst.'}
      </p>
    </div>
  );
}


