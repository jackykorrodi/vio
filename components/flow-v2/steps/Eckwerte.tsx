'use client';

import { useState } from 'react';
import { useFlow, type FokusLevel, type Partei, type MilieuTyp } from '../FlowContext';
import { bewerteEckwerte, MIN_BUDGET } from '@/lib/eckwerte-logik';
import type { Risiko } from '@/lib/eckwerte-logik';
import GeoSearch from '../GeoSearch';
import styles from '../Shell.module.css';
import { FOKUS_LABELS } from './Wen';

// ── Konstanten ────────────────────────────────────────────────────────────────

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

const RISIKO_COLOR: Record<Risiko, string> = {
  niedrig: '#15A37E',
  mittel:  '#C98A2B',
  hoch:    '#BC5640',
};

const fmtChf = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;

const isoMinus = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() - days * 86_400_000).toISOString().slice(0, 10);

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ label, active, disabled, onToggle }: {
  label: string; active: boolean; disabled: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      style={{
        border: `1.5px solid ${active ? '#6B4FBB' : '#E6E1F2'}`,
        borderRadius: 13, padding: '9px 13px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 14, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
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

// ── Main ──────────────────────────────────────────────────────────────────────

export function Eckwerte() {
  const { anker, setAnker, eckwerte, setEckwerte, wen, setWen } = useFlow();
  const [wenOpen, setWenOpen] = useState(false);

  const termin = anker.wahlsonntag?.date ?? null;
  const effectiveEnde = (!eckwerte.impDatesTouched && termin) ? termin : (eckwerte.ende ?? '');
  const effectiveStart = (!eckwerte.impDatesTouched && termin)
    ? isoMinus(termin, 28)
    : (eckwerte.start ?? '');

  const laufTage = effectiveStart && effectiveEnde
    ? Math.max(1, Math.round((new Date(effectiveEnde).getTime() - new Date(effectiveStart).getTime()) / 86_400_000))
    : null;

  let zeitraumHinweis = laufTage ? `${laufTage} Tage` : '';
  if (termin && effectiveEnde && zeitraumHinweis) {
    const diffDays = Math.round((new Date(termin).getTime() - new Date(effectiveEnde).getTime()) / 86_400_000);
    if (diffDays === 0) zeitraumHinweis += ' · bis zum Abstimmungstermin';
    else if (diffDays < 0) zeitraumHinweis += ' · Hinweis: endet nach dem Abstimmungstermin';
    else zeitraumHinweis += ` · endet ${diffDays} Tage vor dem Termin`;
  }

  const result = (effectiveStart && effectiveEnde && anker.regions.length > 0)
    ? bewerteEckwerte({
        budgetChf: eckwerte.budgetChf,
        start: new Date(effectiveStart),
        ende: new Date(effectiveEnde),
        regions: anker.regions,
      })
    : null;

  function toggleItem<T>(arr: T[], val: T, max: number): T[] {
    const idx = arr.indexOf(val);
    if (idx >= 0) return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
    if (arr.length >= max) return arr;
    return [...arr, val];
  }

  const atMax = wen.zgMode === 'partei' ? wen.partei.length >= 2 : wen.milieu.length >= 2;

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Eckwerte
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Ihr wisst, was ihr wollt.
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 28, maxWidth: 520 }}>
          Budget, Zeitraum und Gebiet bestimmt ihr selbst. Wir sagen ehrlich, wenn etwas nicht aufgeht — buchen könnt ihr immer.
        </p>
      </div>

      {/* Budget */}
      <div className={styles.rv} style={{ marginBottom: 28, '--i': 1 } as React.CSSProperties}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#2D1F52', marginBottom: 8 }}>Budget</span>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#6B4FBB', marginBottom: 6 }}>
          {fmtChf(eckwerte.budgetChf)}
        </div>
        <input
          type="range"
          min={MIN_BUDGET}
          max={30000}
          step={500}
          value={eckwerte.budgetChf}
          onChange={e => setEckwerte({ budgetChf: Number(e.target.value) })}
          className={styles.slider}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#C5BAE4', marginTop: 2 }}>
          <span>{fmtChf(MIN_BUDGET)}</span>
          <span>CHF 30&apos;000</span>
        </div>
      </div>

      {/* Zeitraum */}
      <div className={styles.rv} style={{ marginBottom: 28, '--i': 2 } as React.CSSProperties}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#2D1F52', marginBottom: 10 }}>Zeitraum</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'block', fontSize: 11, color: '#857DA0', marginBottom: 4, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Von</span>
            <input
              type="date"
              value={effectiveStart}
              onChange={e => { if (e.target.value) setEckwerte({ start: e.target.value, impDatesTouched: true }); }}
              style={dateInputStyle}
            />
          </div>
          <span style={{ color: '#C5BAE4', fontSize: 18, paddingBottom: 10 }}>→</span>
          <div>
            <span style={{ display: 'block', fontSize: 11, color: '#857DA0', marginBottom: 4, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Bis</span>
            <input
              type="date"
              value={effectiveEnde}
              onChange={e => { if (e.target.value) setEckwerte({ ende: e.target.value, impDatesTouched: true }); }}
              style={dateInputStyle}
            />
          </div>
        </div>
        {zeitraumHinweis && (
          <p style={{ fontSize: 13, color: '#857DA0', marginTop: 8, lineHeight: 1.4 }}>{zeitraumHinweis}</p>
        )}
      </div>

      {/* Gebiet + Ergebnis + Aufklapper */}
      <div className={styles.rv} style={{ '--i': 3 } as React.CSSProperties}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#2D1F52', marginBottom: 10 }}>Gebiet</span>
          <GeoSearch
            selected={anker.regions}
            onAdd={r => setAnker({ regions: [...anker.regions, r], checkStatus: 'idle', checkScreens: 0 })}
            onRemove={r => setAnker({ regions: anker.regions.filter(x => !(x.name === r.name && x.kanton === r.kanton)), checkStatus: 'idle', checkScreens: 0 })}
          />
        </div>

        {result && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: '#F6F3FC', border: '1px solid #EFEBF9',
          borderRadius: 14, padding: '13px 15px', marginBottom: 22, maxWidth: 520,
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: RISIKO_COLOR[result.risiko], flexShrink: 0, marginTop: 4, display: 'block' }} />
          <div>
            <span style={{ fontSize: 13.5, color: '#2D1F52', lineHeight: 1.5, display: 'block' }}>
              ca. {result.reachLow.toLocaleString('de-CH')}+ Stimmberechtigte
            </span>
            {result.risiko !== 'niedrig' && (
              <span style={{ fontSize: 12.5, color: '#857DA0', display: 'block', marginTop: 3 }}>
                Was hilft: {result.hebel.join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Aufklapper: Wen wollt ihr bewegen? */}
      <div style={{ maxWidth: 520 }}>
        <button
          onClick={() => setWenOpen(!wenOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: `1.5px solid ${wenOpen ? '#6B4FBB' : '#E6E1F2'}`,
            borderRadius: wenOpen ? '14px 14px 0 0' : 14, padding: '13px 16px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 15, color: wenOpen ? '#6B4FBB' : '#2D1F52',
            width: '100%', transition: 'all .18s', textAlign: 'left',
          }}
        >
          <span style={{ flex: 1, fontWeight: 600 }}>Wen wollt ihr bewegen?</span>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{wenOpen ? '−' : '+'}</span>
        </button>

        {wenOpen && (
          <div style={{
            border: '1.5px solid #6B4FBB', borderTop: 'none',
            borderRadius: '0 0 14px 14px', padding: '18px 16px', background: '#FFFEFB',
          }}>
            {/* Fokus-Slider */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#2D1F52', marginBottom: 8 }}>
                Worauf legt ihr den Schwerpunkt?
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={wen.fokus}
                onChange={e => setWen({ fokus: Number(e.target.value) as FokusLevel })}
                className={styles.slider}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#857DA0', marginBottom: 8 }}>
                <span>eigene Basis</span>
                <span>Unentschlossene</span>
              </div>
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: '#6B4FBB', background: '#F6F3FC', borderRadius: 10, padding: '8px 12px' }}>
                {FOKUS_LABELS[wen.fokus]}
              </div>
            </div>

            {/* Partei / Milieu */}
            <div>
              <div style={{ display: 'flex', background: '#F6F3FC', borderRadius: 12, padding: 3, marginBottom: 12, maxWidth: 320 }}>
                <ToggleTab label="Nach Partei" active={wen.zgMode === 'partei'} onClick={() => setWen({ zgMode: 'partei' })} />
                <ToggleTab label="Nach Milieu" active={wen.zgMode === 'milieu'} onClick={() => setWen({ zgMode: 'milieu' })} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {wen.zgMode === 'partei'
                  ? PARTEIEN.map(p => (
                      <Pill
                        key={p.id} label={p.label}
                        active={wen.partei.includes(p.id)}
                        disabled={atMax && !wen.partei.includes(p.id)}
                        onToggle={() => setWen({ partei: toggleItem(wen.partei, p.id, 2) })}
                      />
                    ))
                  : MILIEU_OPTS.map(m => (
                      <Pill
                        key={m.id} label={m.label}
                        active={wen.milieu.includes(m.id)}
                        disabled={atMax && !wen.milieu.includes(m.id)}
                        onToggle={() => setWen({ milieu: toggleItem(wen.milieu, m.id, 2) })}
                      />
                    ))
                }
              </div>
              <p style={{ fontSize: 12, color: '#857DA0', marginTop: 8, lineHeight: 1.45 }}>Max. 2.</p>
            </div>
          </div>
        )}
      </div>
      </div>{/* end rv(3) */}
    </div>
  );
}

const dateInputStyle: React.CSSProperties = {
  border: '1.5px solid #E6E1F2',
  borderRadius: 12, padding: '10px 14px',
  fontFamily: 'inherit', fontSize: 15, color: '#2D1F52',
  background: '#fff', outline: 'none',
};
