'use client';

import { useState } from 'react';
import { useFlow, type BudgetModus } from '../FlowContext';
import { MIN_BUDGET } from '@/lib/eckwerte-logik';
import styles from '../Shell.module.css';

const OPTS: Array<{ id: BudgetModus; label: string }> = [
  { id: 'haben',     label: 'Wir haben ein Budget' },
  { id: 'empfehlung', label: 'Empfehlt uns die richtige Grösse' },
];

export function Budget() {
  const { budget, setBudget } = useFlow();
  const { modus, betragChf } = budget;

  // Raw string for the input to allow free typing
  const [inputStr, setInputStr] = useState(betragChf ? String(betragChf) : '');

  function commitBetrag(raw: string) {
    const n = parseInt(raw.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n >= MIN_BUDGET) {
      setBudget({ betragChf: n });
      setInputStr(String(n));
    } else if (!isNaN(n)) {
      setBudget({ betragChf: MIN_BUDGET });
      setInputStr(String(MIN_BUDGET));
    }
  }

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Budget
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Habt ihr ein Budget — oder sollen wir empfehlen?
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 28, maxWidth: 520 }}>
          Mit Empfehlung schlagen wir die sinnvolle Grösse für eure Lage vor.
        </p>
      </div>

      <div className={styles.rv} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, marginBottom: 14, '--i': 1 } as React.CSSProperties}>
        {OPTS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setBudget({ modus: opt.id })}
            style={{
              display: 'flex', alignItems: 'center', gap: 13,
              border: `1.5px solid ${modus === opt.id ? '#6B4FBB' : '#E6E1F2'}`,
              borderRadius: 15, padding: '17px 18px', cursor: 'pointer',
              background: modus === opt.id ? '#F6F3FC' : '#fff',
              boxShadow: modus === opt.id ? 'inset 0 0 0 1px #6B4FBB' : 'none',
              transition: 'all .18s', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${modus === opt.id ? '#6B4FBB' : '#E6E1F2'}`,
              background: modus === opt.id ? '#6B4FBB' : 'transparent',
              boxShadow: modus === opt.id ? 'inset 0 0 0 3.5px #fff' : 'none',
              transition: 'all .16s',
            }} />
            <span style={{ fontSize: 16, fontWeight: 500, color: '#2D1F52' }}>{opt.label}</span>
          </button>
        ))}
      </div>

      {modus === 'haben' && (
        <div className={styles.rv} style={{ maxWidth: 480, marginTop: 14, '--i': 2 } as React.CSSProperties}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            border: '1.5px solid #E6E1F2', borderRadius: 14, padding: '14px 17px', background: '#fff',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#857DA0', fontSize: 22, flexShrink: 0 }}>
              CHF
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={inputStr}
              onChange={e => setInputStr(e.target.value)}
              onBlur={e => commitBetrag(e.target.value)}
              placeholder="6000"
              style={{
                border: 'none', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22,
                color: '#2D1F52', width: '100%', background: 'transparent', outline: 'none',
              }}
            />
          </div>
          <p style={{ fontSize: 13, color: '#857DA0', marginTop: 9, lineHeight: 1.5 }}>
            Minimum CHF {MIN_BUDGET.toLocaleString('de-CH')}. Wir sagen ehrlich, ob es für euer Gebiet reicht.
          </p>
        </div>
      )}
    </div>
  );
}
