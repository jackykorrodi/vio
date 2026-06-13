'use client';

import { useFlow, type FokusLevel, type Partei, type MilieuTyp } from '../FlowContext';
import styles from '../Shell.module.css';

export const FOKUS_LABELS: string[] = [
  'vor allem die eigene Basis',
  'eher die eigene Basis',
  'ausgewogen',
  'eher Unentschlossene',
  'vor allem Unentschlossene',
];

const PARTEIEN: Array<{ id: Partei; label: string }> = [
  { id: 'SVP',   label: 'SVP' },
  { id: 'SP',    label: 'SP' },
  { id: 'Mitte', label: 'Die Mitte' },
  { id: 'FDP',   label: 'FDP' },
  { id: 'Grüne', label: 'Grüne' },
  { id: 'GLP',   label: 'GLP' },
  { id: 'EVP',   label: 'EVP' },
];

const MILIEU_OPTS: Array<{ id: MilieuTyp; label: string }> = [
  { id: 'laendlich', label: 'Ländlich-konservativ' },
  { id: 'urban',     label: 'Urbane Junge' },
  { id: 'mitte',     label: 'Akademische Mitte' },
  { id: 'familien',  label: 'Familien & Pendler' },
  { id: 'aeltere',   label: 'Ältere / Pensionierte' },
];

export const MILIEU_LABEL: Record<MilieuTyp, string> = {
  laendlich: 'Ländlich-konservativ',
  urban:     'Urbane Junge',
  mitte:     'Akademische Mitte',
  familien:  'Familien & Pendler',
  aeltere:   'Ältere / Pensionierte',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ToggleTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, border: 'none', background: active ? '#fff' : 'transparent',
        fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 600 : 500,
        padding: 10, borderRadius: 9, cursor: 'pointer',
        color: active ? '#2D1F52' : '#857DA0',
        boxShadow: active ? '0 1px 3px rgba(45,31,82,.12)' : 'none',
        transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

function Pill({ label, active, disabled, onToggle }: {
  label: string; active: boolean; disabled: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        border: `1.5px solid ${active ? '#6B4FBB' : '#E6E1F2'}`,
        borderRadius: 13, padding: '11px 15px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 14.5, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
        background: active ? '#F6F3FC' : '#fff',
        color: disabled ? '#C5BAE4' : '#2D1F52',
        boxShadow: active ? 'inset 0 0 0 1px #6B4FBB' : 'none',
        opacity: disabled ? 0.4 : 1,
        transition: 'all .16s',
      }}
    >
      {label}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Wen() {
  const { wen, setWen } = useFlow();
  const { fokus, zgMode, partei, milieu } = wen;

  function toggleItem<T>(arr: T[], val: T, max: number): T[] {
    const idx = arr.indexOf(val);
    if (idx >= 0) return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
    if (arr.length >= max) return arr;
    return [...arr, val];
  }

  const atMax = zgMode === 'partei' ? partei.length >= 2 : milieu.length >= 2;

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Wen wollt ihr erreichen
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Wen wollt ihr bewegen?
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 30, maxWidth: 520 }}>
          Das steuert, wo wir präsent sind — und wie wir die Gebiete gewichten.
        </p>
      </div>

      {/* Fokus-Slider */}
      <div className={styles.rv} style={{ marginBottom: 30, '--i': 1 } as React.CSSProperties}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 10, color: '#2D1F52' }}>
          Worauf legt ihr den Schwerpunkt?
        </span>
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={fokus}
          onChange={e => setWen({ fokus: Number(e.target.value) as FokusLevel })}
          className={styles.slider}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#857DA0', marginBottom: 12 }}>
          <span>eigene Basis</span>
          <span>Unentschlossene</span>
        </div>
        <div style={{
          textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
          color: '#6B4FBB', background: '#F6F3FC', borderRadius: 12, padding: '11px 16px',
        }}>
          {FOKUS_LABELS[fokus]}
        </div>
        <p style={{ fontSize: 12.5, color: '#857DA0', lineHeight: 1.45, marginTop: 9 }}>
          Kein «beides» — eine klare Tendenz hilft uns, die Gebiete richtig zu gewichten.
        </p>
      </div>

      {/* ZG Toggle */}
      <div className={styles.rv} style={{ '--i': 2 } as React.CSSProperties}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#2D1F52' }}>
          Und wen konkret?
        </span>
        <div style={{ display: 'flex', background: '#F6F3FC', borderRadius: 12, padding: 3, marginBottom: 14, maxWidth: 380 }}>
          <ToggleTab label="Nach Partei" active={zgMode === 'partei'} onClick={() => setWen({ zgMode: 'partei' })} />
          <ToggleTab label="Nach Milieu" active={zgMode === 'milieu'} onClick={() => setWen({ zgMode: 'milieu' })} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
          {zgMode === 'partei'
            ? PARTEIEN.map(p => (
                <Pill
                  key={p.id}
                  label={p.label}
                  active={partei.includes(p.id)}
                  disabled={atMax && !partei.includes(p.id)}
                  onToggle={() => setWen({ partei: toggleItem(partei, p.id, 2) })}
                />
              ))
            : MILIEU_OPTS.map(m => (
                <Pill
                  key={m.id}
                  label={m.label}
                  active={milieu.includes(m.id)}
                  disabled={atMax && !milieu.includes(m.id)}
                  onToggle={() => setWen({ milieu: toggleItem(milieu, m.id, 2) })}
                />
              ))
          }
        </div>
        <p style={{ fontSize: 12.5, color: '#857DA0', lineHeight: 1.45, marginTop: 9 }}>
          Daraus finden wir die passenden Gemeinden — aus den Nationalratswahlen 2023. Max. 2.
        </p>
      </div>
    </div>
  );
}
