'use client';

import { useFlow, type WerbemittelOption } from '../FlowContext';
import styles from '../Shell.module.css';

interface OptDef {
  id: WerbemittelOption | null;
  title: string;
  sub: string;
  formats: string;
  tag?: string;
  tagColor?: string;
  disabled?: boolean;
}

const OPTS: OptDef[] = [
  {
    id: 'o1',
    title: 'Motion',
    sub: 'Animiertes Sujet — bewegt, fällt auf, läuft in wenigen Sekunden.',
    formats: 'Animierter Loop · 6–10 Sek.',
  },
  {
    id: 'o2',
    title: 'Plakat-Motiv',
    sub: 'Klare Botschaft, präzise platziert — bewährt und gut skalierbar.',
    formats: '16:9 · 9:16 · 1:1',
    tag: 'Empfohlen',
    tagColor: '#15A37E',
  },
  {
    id: null,
    title: 'Kombination',
    sub: 'Motion + Plakat-Motiv — volle Bandbreite. In Vorbereitung.',
    formats: '',
    tag: 'Bald',
    tagColor: '#857DA0',
    disabled: true,
  },
];

export function Werbemittel() {
  const { werbemittel, setWerbemittel } = useFlow();
  const { option } = werbemittel;

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Werbemittel
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Wie soll eure Botschaft aussehen?
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 28, maxWidth: 520 }}>
          Wählt das Sujet-Format. Wir passen alle Grössen an — ihr liefert einmal.
        </p>
      </div>

      <div className={styles.rv} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520, '--i': 1 } as React.CSSProperties}>
        {OPTS.map((opt, i) => {
          const isSelected = opt.id !== null && option === opt.id;
          return (
            <button
              key={i}
              onClick={opt.disabled || opt.id === null ? undefined : () => setWerbemittel({ option: opt.id! })}
              style={{
                border: `1.5px solid ${isSelected ? '#6B4FBB' : '#E6E1F2'}`,
                borderRadius: 18, padding: '18px 20px',
                cursor: opt.disabled ? 'default' : 'pointer',
                background: isSelected ? '#F6F3FC' : opt.disabled ? '#FAFAFA' : '#fff',
                boxShadow: isSelected ? 'inset 0 0 0 1px #6B4FBB' : 'none',
                textAlign: 'left', fontFamily: 'inherit',
                opacity: opt.disabled ? 0.52 : 1,
                position: 'relative',
                transition: 'all .18s',
              }}
            >
              {opt.tag && (
                <span style={{
                  position: 'absolute', top: -10, right: 16,
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                  background: opt.tagColor ?? '#6B4FBB', color: '#fff',
                  padding: '3px 11px', borderRadius: 99,
                }}>
                  {opt.tag}
                </span>
              )}
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#2D1F52', marginBottom: 5 }}>
                {opt.title}
              </p>
              <p style={{ fontSize: 14.5, color: '#857DA0', lineHeight: 1.5, marginBottom: opt.formats ? 7 : 0 }}>
                {opt.sub}
              </p>
              {opt.formats && (
                <p style={{ fontSize: 12.5, color: '#6B4FBB', fontWeight: 600 }}>
                  {opt.formats}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <p className={styles.rv} style={{ fontSize: 13, color: '#857DA0', marginTop: 14, lineHeight: 1.5, maxWidth: 520, '--i': 2 } as React.CSSProperties}>
        Euer Sujet liefert ihr nach der Buchung — 5 Arbeitstage vor Kampagnenstart.
      </p>
    </div>
  );
}
