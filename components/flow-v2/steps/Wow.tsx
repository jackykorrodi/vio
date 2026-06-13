'use client';

import { useFlow } from '../FlowContext';
import { bewerteEckwerte, empfehleBudget } from '@/lib/eckwerte-logik';
import styles from '../Shell.module.css';

const isoMinus = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() - days * 86_400_000).toISOString().slice(0, 10);

const CHANNELS: Array<{
  label: string;
  cards: Array<{ title: string; sub: string }>;
}> = [
  {
    label: 'Im öffentlichen Raum',
    cards: [
      { title: 'Stelen im Stadtraum', sub: 'An belebten Standorten — Bahnhöfe, Einkaufszentren, Bushaltestellen.' },
      { title: 'Euer Gebiet im Fokus', sub: 'Schwerpunkt in buchbaren Gemeinden eurer Auswahl.' },
    ],
  },
  {
    label: 'Im Privaten',
    cards: [
      { title: 'Schweizer Leitmedien', sub: 'Neben redaktionellen Inhalten auf führenden CH-Nachrichten-Portalen.' },
      { title: 'Lokal und Regional', sub: 'Neben Lokal- und Pendler-News dort, wo euer Gebiet sich informiert.' },
    ],
  },
];

export function Wow() {
  const { mode, anker, budget, einschaetzung, eckwerte } = useFlow();

  const termin = anker.wahlsonntag?.date ?? null;

  let reach: number | null = null;

  if (mode === 'geführt') {
    const t = termin ? new Date(termin) : null;
    const { laufzeit, budgetJustiert } = einschaetzung;
    const start = t ? new Date(t.getTime() - laufzeit * 86_400_000) : null;
    const ende = t;
    if (start && ende && anker.regions.length > 0) {
      const base = (budget.modus === 'haben' && budget.betragChf !== null)
        ? budget.betragChf
        : empfehleBudget({ start, ende, regions: anker.regions });
      const effective = budgetJustiert ?? base;
      reach = bewerteEckwerte({ budgetChf: effective, start, ende, regions: anker.regions }).reachLow;
    }
  } else {
    const endeStr = (!eckwerte.impDatesTouched && termin) ? termin : eckwerte.ende;
    const startStr = (!eckwerte.impDatesTouched && termin) ? isoMinus(termin, 28) : eckwerte.start;
    if (startStr && endeStr && anker.regions.length > 0) {
      reach = bewerteEckwerte({
        budgetChf: eckwerte.budgetChf,
        start: new Date(startStr),
        ende: new Date(endeStr),
        regions: anker.regions,
      }).reachLow;
    }
  }

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Vorschau
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          So wirkt eure Kampagne.
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 28, maxWidth: 520 }}>
          Wirkung entsteht durch Präsenz an den richtigen Orten — zur richtigen Zeit.
        </p>
      </div>

      {reach !== null && (
        <div className={styles.rv} style={{ background: '#F6F3FC', borderRadius: 16, padding: '18px 22px', marginBottom: 28, maxWidth: 520, border: '1px solid #EFEBF9', '--i': 1 } as React.CSSProperties}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: '#6B4FBB', letterSpacing: '-.02em' }}>
            ca. {reach.toLocaleString('de-CH')}+
          </span>
          <p style={{ fontSize: 14, color: '#2D1F52', marginTop: 4 }}>Stimmberechtigte in eurer Auswahl</p>
        </div>
      )}

      <div className={styles.rv} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520, '--i': 2 } as React.CSSProperties}>
        {CHANNELS.map(ch => (
          <div key={ch.label}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 10 }}>
              {ch.label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ch.cards.map(card => (
                <div key={card.title} style={{ background: '#FFFEFB', border: '1.5px solid #E6E1F2', borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#2D1F52', marginBottom: 4 }}>
                    {card.title}
                  </p>
                  <p style={{ fontSize: 13.5, color: '#857DA0', lineHeight: 1.5 }}>
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: '#857DA0', marginTop: 20, lineHeight: 1.5, maxWidth: 520 }}>
        Euer Sujet erscheint dort, wo eure Zielgruppe ist — abgestimmt auf Gebiet und Zeitraum.
      </p>
    </div>
  );
}
