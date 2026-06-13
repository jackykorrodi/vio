'use client';

import { useState, useRef, useEffect } from 'react';
import type { Region } from '@/lib/regions';
import { ALL_REGIONS } from '@/lib/regions';
import { isBuchbar } from '@/lib/region-buchbarkeit';

const TYPE_LABELS: Record<Region['type'], string> = {
  schweiz: 'Schweiz',
  kanton:  'Kanton',
  stadt:   'Stadt',
};

interface Props {
  selected: Region[];
  onAdd: (r: Region) => void;
  onRemove: (r: Region) => void;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[äöü]/g, c => ({ ä: 'a', ö: 'o', ü: 'u' }[c] ?? c));
}

export default function GeoSearch({ selected, onAdd, onRemove }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedNames = new Set(selected.map(r => `${r.name}:${r.kanton}`));

  const results = query.trim().length < 2
    ? []
    : ALL_REGIONS
        .filter(r => normalize(r.name).includes(normalize(query.trim())))
        .slice(0, 8);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(r: Region) {
    if (!isBuchbar(r)) return;
    const key = `${r.name}:${r.kanton}`;
    if (!selectedNames.has(key)) onAdd(r);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', maxWidth: 560 }}>
      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Kanton, Stadt oder Gebiet suchen …"
        style={{
          width: '100%',
          border: '1.5px solid #E6E1F2',
          borderRadius: 14,
          padding: '14px 16px',
          fontSize: 15,
          color: '#2D1F52',
          background: '#fff',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocusCapture={e => {
          (e.target as HTMLInputElement).style.borderColor = '#6B4FBB';
          (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px #EFEBF9';
        }}
        onBlurCapture={e => {
          (e.target as HTMLInputElement).style.borderColor = '#E6E1F2';
          (e.target as HTMLInputElement).style.boxShadow = 'none';
        }}
      />

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '1.5px solid #E6E1F2', borderRadius: 14,
          boxShadow: '0 18px 40px -18px rgba(45,31,82,.35)',
          zIndex: 20, overflow: 'hidden',
        }}>
          {results.map(r => {
            const key = `${r.name}:${r.kanton}`;
            const buchbar = isBuchbar(r);
            const already = selectedNames.has(key);

            return (
              <button
                key={key}
                onMouseDown={e => { e.preventDefault(); handleSelect(r); }}
                disabled={!buchbar || already}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '11px 15px', fontSize: 14,
                  background: 'transparent', border: 'none', cursor: buchbar && !already ? 'pointer' : 'default',
                  color: buchbar ? '#2D1F52' : '#B6AECB',
                  fontFamily: 'inherit', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => {
                  if (buchbar && !already) (e.currentTarget as HTMLButtonElement).style.background = '#F6F3FC';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span>{r.name}{already ? ' ✓' : !buchbar ? ' — keine Flächen' : ''}</span>
                <span style={{ fontSize: 11, color: buchbar ? '#857DA0' : '#B6AECB', letterSpacing: '.04em' }}>
                  {TYPE_LABELS[r.type]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {selected.map(r => (
            <span
              key={`${r.name}:${r.kanton}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#6B4FBB', color: '#fff', borderRadius: 99,
                padding: '8px 10px 8px 15px', fontSize: 13.5,
              }}
            >
              {r.name}
              <button
                onClick={() => onRemove(r)}
                style={{
                  border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff',
                  width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
                  fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
                aria-label={`${r.name} entfernen`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
