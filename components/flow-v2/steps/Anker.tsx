'use client';

import { useEffect } from 'react';
import { useFlow, type KampagnenArt, type Ebene, type WahlSonntag } from '../FlowContext';
import GeoSearch from '../GeoSearch';
import styles from '../Shell.module.css';
import type { Region } from '@/lib/regions';
import { SCHWEIZ, KANTONE } from '@/lib/regions';
import { klassifiziereMehrereRegionen } from '@/lib/region-buchbarkeit';

// ── Static data ───────────────────────────────────────────────────────────────

// TODO: Replace with live Urnengang-Quelle (BK/ch.ch API)
const WAHLSONNTAGE: WahlSonntag[] = [
  { date: '2026-09-27', label: '27. September 2026', meta: 'Eidg. · kantonal · kommunal' },
  { date: '2026-11-29', label: '29. November 2026', meta: 'Kantonal · kommunal' },
  { date: '2027-03-07', label: '7. März 2027',       meta: 'Eidg. · kantonal · kommunal' },
  { date: '2027-06-13', label: '13. Juni 2027',       meta: 'Eidg. · kantonal · kommunal' },
  { date: '2027-09-26', label: '26. September 2027',  meta: 'Eidg. · kantonal · kommunal' },
  { date: '2027-11-28', label: '28. November 2027',   meta: 'Kantonal · kommunal' },
];

const ARTEN: Array<{ id: KampagnenArt; label: string }> = [
  { id: 'volksinitiative', label: 'Volksinitiative' },
  { id: 'referendum',      label: 'Referendum' },
  { id: 'kandidatur',      label: 'Kandidatur' },
  { id: 'propositur',      label: 'Propositur' },
];

const EBENEN: Array<{ id: Ebene; label: string }> = [
  { id: 'eidgenoessisch', label: 'Eidgenössisch' },
  { id: 'kantonal',       label: 'Kantonal' },
  { id: 'kommunal',       label: 'Kommunal' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#2D1F52', marginBottom: 9 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chips<T extends string>({
  options, value, onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            fontSize: 14.5, padding: '10px 17px', borderRadius: 99,
            border: `1.5px solid ${value === o.id ? '#6B4FBB' : '#E6E1F2'}`,
            background: value === o.id ? '#6B4FBB' : '#fff',
            color: value === o.id ? '#fff' : '#2D1F52',
            cursor: 'pointer', transition: 'all .18s', fontFamily: 'inherit',
            boxShadow: value === o.id ? '0 6px 16px -6px rgba(107,79,187,.5)' : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Quick-picks per Ebene ─────────────────────────────────────────────────────

function QuickPicks({ ebene, selected, onAdd, onRemove }: {
  ebene: Ebene | null;
  selected: Region[];
  onAdd: (r: Region) => void;
  onRemove: (r: Region) => void;
}) {
  const selNames = new Set(selected.map(r => `${r.name}:${r.kanton}`));

  if (ebene === 'eidgenoessisch') {
    const r = SCHWEIZ[0];
    const key = `${r.name}:${r.kanton}`;
    const active = selNames.has(key);
    return (
      <button
        onClick={() => active ? onRemove(r) : onAdd(r)}
        style={{
          border: `1.5px solid ${active ? '#6B4FBB' : '#E6E1F2'}`,
          borderRadius: 14, padding: '12px 18px', background: active ? '#F6F3FC' : '#fff',
          boxShadow: active ? 'inset 0 0 0 1px #6B4FBB' : 'none',
          cursor: 'pointer', fontSize: 14.5, fontFamily: 'inherit',
          color: '#2D1F52', transition: 'all .18s', marginBottom: 14, display: 'block',
        }}
      >
        {active ? '✓ ' : ''}Gesamte Schweiz wählen
      </button>
    );
  }

  if (ebene === 'kantonal') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {KANTONE.map(r => {
          const key = `${r.name}:${r.kanton}`;
          const active = selNames.has(key);
          return (
            <button
              key={key}
              onClick={() => active ? onRemove(r) : onAdd(r)}
              style={{
                fontSize: 13, padding: '7px 14px', borderRadius: 99,
                border: `1.5px solid ${active ? '#6B4FBB' : '#E6E1F2'}`,
                background: active ? '#6B4FBB' : '#fff',
                color: active ? '#fff' : '#2D1F52',
                cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
              }}
            >
              {r.name}
            </button>
          );
        })}
      </div>
    );
  }

  return null; // kommunal: nur Suche
}

// ── Buchbar-Check display ─────────────────────────────────────────────────────

function BuchbarCheck({ status, screens }: { status: 'idle' | 'checking' | 'ok'; screens: number }) {
  if (status === 'idle') return null;

  return (
    <div style={{
      marginTop: 16, borderRadius: 15, border: `1.5px solid ${status === 'ok' ? '#15A37E' : '#E6E1F2'}`,
      overflow: 'hidden', background: '#fff', maxWidth: 560,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '15px 17px',
        background: status === 'ok' ? '#E3F4EE' : 'transparent',
      }}>
        {status === 'checking' ? (
          <span style={{
            width: 19, height: 19, borderRadius: '50%', flexShrink: 0,
            border: '2.5px solid #EFEBF9', borderTopColor: '#6B4FBB',
            animation: 'spin .7s linear infinite', display: 'inline-block',
          }} />
        ) : (
          <span style={{
            width: 21, height: 21, borderRadius: '50%', background: '#15A37E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 12, color: '#fff',
          }}>✓</span>
        )}
        <span style={{ fontWeight: 600, fontSize: 14.5, color: status === 'ok' ? '#15A37E' : '#2D1F52' }}>
          {status === 'checking' ? 'Prüfe Buchbarkeit …' : `Buchbar · ${screens} digitale Standorte`}
        </span>
      </div>
    </div>
  );
}

// ── Main Anker step ───────────────────────────────────────────────────────────

export function Anker() {
  const { anker, setAnker } = useFlow();

  const regions = anker.regions;
  const regionKey = regions.map(r => `${r.name}:${r.kanton}`).join(',');

  // Debounced buchbar-check when regions change
  useEffect(() => {
    if (regions.length === 0) {
      setAnker({ checkStatus: 'idle', checkScreens: 0 });
      return;
    }
    setAnker({ checkStatus: 'checking', checkScreens: 0 });
    const t = window.setTimeout(() => {
      const klass = klassifiziereMehrereRegionen(regions);
      setAnker({ checkStatus: 'ok', checkScreens: klass.politScreens });
    }, 600);
    return () => window.clearTimeout(t);
    // regionKey encodes regions; setAnker is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey, setAnker]);

  function addRegion(r: Region) {
    setAnker({ regions: [...anker.regions, r] });
  }
  function removeRegion(r: Region) {
    const key = `${r.name}:${r.kanton}`;
    setAnker({ regions: anker.regions.filter(x => `${x.name}:${x.kanton}` !== key) });
  }

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Schritt 1 · Anlass
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Worum geht es bei eurer Abstimmung?
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 32, maxWidth: 520 }}>
          Art, politische Ebene, Gebiet und Abstimmungstermin.
        </p>
      </div>

      {/* Art + Ebene */}
      <div className={styles.rv} style={{ '--i': 1 } as React.CSSProperties}>
        <Field label="Art der Vorlage">
          <Chips options={ARTEN} value={anker.art} onChange={art => setAnker({ art })} />
        </Field>
        <Field label="Politische Ebene">
          <Chips options={EBENEN} value={anker.ebene} onChange={ebene => setAnker({ ebene })} />
        </Field>
      </div>

      {/* Geo */}
      <div className={styles.rv} style={{ '--i': 2 } as React.CSSProperties}>
        <Field label="Zielgebiet">
          <QuickPicks
            ebene={anker.ebene}
            selected={anker.regions}
            onAdd={addRegion}
            onRemove={removeRegion}
          />
          <GeoSearch
            selected={anker.regions}
            onAdd={addRegion}
            onRemove={removeRegion}
          />
          <BuchbarCheck status={anker.checkStatus} screens={anker.checkScreens} />
        </Field>
      </div>

      {/* Wahlsonntag */}
      <div className={styles.rv} style={{ '--i': 3 } as React.CSSProperties}>
        <Field label="Abstimmungstermin">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 460 }}>
            {WAHLSONNTAGE.map(ws => {
              const active = anker.wahlsonntag?.date === ws.date;
              return (
                <button
                  key={ws.date}
                  onClick={() => setAnker({ wahlsonntag: ws })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: `1.5px solid ${active ? '#6B4FBB' : '#E6E1F2'}`,
                    borderRadius: 14, padding: '13px 17px', cursor: 'pointer',
                    background: active ? '#F6F3FC' : '#fff',
                    boxShadow: active ? 'inset 0 0 0 1px #6B4FBB' : 'none',
                    transition: 'all .18s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: '#2D1F52' }}>{ws.label}</span>
                  <span style={{ fontSize: 11.5, color: active ? '#6B4FBB' : '#857DA0' }}>{ws.meta}</span>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: '#857DA0', marginTop: 10, lineHeight: 1.5 }}>
            TODO: Urnengang-Quelle (BK/ch.ch) für vollständige Liste
          </p>
        </Field>
      </div>
    </div>
  );
}
