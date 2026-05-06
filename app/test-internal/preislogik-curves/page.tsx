'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { calculateImpact } from '@/lib/preislogik';
import { KANTONE, STAEDTE } from '@/lib/regions';
import type { Region } from '@/lib/regions';

// ─── Types ───────────────────────────────────────────────────────────────────

type SollRow = {
  budget: number;
  laufzeit: number;
  level: 1 | 2 | 3;
  reach_abs: number;
  reach_pct: number;
  f_weekly: number;
  status_code: string;
};

type RegionKey = 'zug' | 'bern' | 'waedenswil' | 'adliswil';

// ─── Soll-Daten (aus public/vio-regelkatalog-politik-v3-3.md, Sektion 7) ─────

const SOLL: Record<RegionKey, SollRow[]> = {
  zug: [
    { budget:  4000, laufzeit: 14, level: 2, reach_abs: 14002, reach_pct: 16.5, f_weekly:  3.7, status_code: 'sprint_14d_thin_budget' },
    { budget:  6000, laufzeit: 28, level: 1, reach_abs:  9971, reach_pct: 11.7, f_weekly:  3.9, status_code: 'optimal_28d_standard' },
    { budget:  8000, laufzeit: 28, level: 2, reach_abs: 17519, reach_pct: 20.6, f_weekly:  2.9, status_code: '28d_broad_reach_low_frequency' },
    { budget: 12000, laufzeit: 28, level: 2, reach_abs: 18403, reach_pct: 21.7, f_weekly:  4.2, status_code: 'optimal_28d_standard' },
    { budget: 20000, laufzeit: 28, level: 3, reach_abs: 31707, reach_pct: 37.3, f_weekly:  4.1, status_code: 'optimal_28d_standard' },
    { budget: 30000, laufzeit: 28, level: 3, reach_abs: 32220, reach_pct: 37.9, f_weekly:  6.0, status_code: 'optimal_28d_standard' },
  ],
  bern: [
    { budget:  4000, laufzeit: 14, level: 1, reach_abs: 15819, reach_pct:  2.0, f_weekly:  3.3, status_code: 'sprint_14d_thin_budget' },
    { budget:  6000, laufzeit: 14, level: 1, reach_abs: 19224, reach_pct:  2.4, f_weekly:  4.0, status_code: 'sprint_14d_thin_budget' },
    { budget:  8000, laufzeit: 14, level: 2, reach_abs: 31638, reach_pct:  4.0, f_weekly:  3.3, status_code: 'sprint_14d_thin_budget' },
    { budget: 12000, laufzeit: 14, level: 2, reach_abs: 38447, reach_pct:  4.8, f_weekly:  4.0, status_code: 'sprint_14d_grosser_pool' },
    { budget: 20000, laufzeit: 14, level: 3, reach_abs: 70996, reach_pct:  8.9, f_weekly:  3.6, status_code: 'sprint_14d_grosser_pool' },
    { budget: 30000, laufzeit: 14, level: 3, reach_abs: 83239, reach_pct: 10.4, f_weekly:  4.7, status_code: 'sprint_14d_grosser_pool' },
  ],
  waedenswil: [
    { budget:  4000, laufzeit: 28, level: 2, reach_abs:  9673, reach_pct: 44.0, f_weekly:  3.9, status_code: 'optimal_28d_standard' },
    { budget:  6000, laufzeit: 28, level: 3, reach_abs: 14017, reach_pct: 63.7, f_weekly:  4.0, status_code: 'optimal_28d_standard' },
    { budget:  8000, laufzeit: 28, level: 3, reach_abs: 14223, reach_pct: 64.7, f_weekly:  5.3, status_code: 'optimal_28d_standard' },
    { budget: 12000, laufzeit: 28, level: 3, reach_abs: 14294, reach_pct: 65.0, f_weekly:  7.8, status_code: 'optimal_28d_standard' },
    { budget: 20000, laufzeit: 42, level: 3, reach_abs: 14300, reach_pct: 65.0, f_weekly:  8.7, status_code: 'aufbau_42d_thin_budget' },
    { budget: 30000, laufzeit: 42, level: 3, reach_abs: 14300, reach_pct: 65.0, f_weekly: 13.1, status_code: 'dominanzmodus' },
  ],
  adliswil: [
    { budget:  4000, laufzeit: 28, level: 3, reach_abs: 8780, reach_pct: 62.7, f_weekly:  3.5, status_code: 'optimal_28d_standard' },
    { budget:  6000, laufzeit: 28, level: 3, reach_abs: 9040, reach_pct: 64.6, f_weekly:  5.1, status_code: 'optimal_28d_standard' },
    { budget:  8000, laufzeit: 28, level: 3, reach_abs: 9089, reach_pct: 64.9, f_weekly:  6.7, status_code: 'optimal_28d_standard' },
    { budget: 12000, laufzeit: 42, level: 3, reach_abs: 9100, reach_pct: 65.0, f_weekly:  6.7, status_code: 'aufbau_42d_thin_budget' },
    { budget: 20000, laufzeit: 42, level: 3, reach_abs: 9100, reach_pct: 65.0, f_weekly: 11.2, status_code: 'dominanzmodus' },
    { budget: 30000, laufzeit: 42, level: 3, reach_abs: 9100, reach_pct: 65.0, f_weekly: 16.7, status_code: 'dominanzmodus_stark' },
  ],
};

// ─── Regionen ────────────────────────────────────────────────────────────────

const REGIONS: Record<RegionKey, Region> = {
  zug:        KANTONE.find(k => k.kanton === 'ZG')!,
  bern:       KANTONE.find(k => k.kanton === 'BE')!,
  waedenswil: STAEDTE.find(s => s.name === 'Wädenswil')!,
  adliswil:   STAEDTE.find(s => s.name === 'Adliswil')!,
};

const REGION_META: Record<RegionKey, {
  label: string;
  specPool: number;
  klasse: string;
  note?: string;
}> = {
  zug:        { label: 'Kanton Zug',  specPool:  85000, klasse: 'voll' },
  bern:       { label: 'Kanton Bern', specPool: 800000, klasse: 'voll',             note: 'stimm 775k ≠ Spec-Pool 800k (~3%)' },
  waedenswil: { label: 'Wädenswil',   specPool:  22000, klasse: 'display-dominant', note: 'stimm 16k ≠ Spec-Pool 22k (~38% — Spec vermutlich pop-basiert)' },
  adliswil:   { label: 'Adliswil',    specPool:  14000, klasse: 'begrenzt',         note: 'stimm 13k ≠ Spec-Pool 14k (~7%)' },
};

const BUDGETS: number[] = [4000, 6000, 8000, 12000, 20000, 30000];
const ALL_KEYS: RegionKey[] = ['zug', 'bern', 'waedenswil', 'adliswil'];

// ─── Diff-Helfer ─────────────────────────────────────────────────────────────

function numDiff(soll: number, ist: number): string {
  if (soll === 0) return ist === 0 ? '🟢' : '🔴';
  const pct = Math.abs(ist - soll) / soll * 100;
  if (pct <= 5) return '🟢';
  if (pct <= 15) return '🟡';
  return '🔴';
}

function exactDiff(soll: number | string, ist: number | string): string {
  return soll === ist ? '🟢' : '🔴';
}

function fmt(n: number): string {
  return new Intl.NumberFormat('de-CH').format(Math.round(n));
}

// ─── Ist-Berechnung ───────────────────────────────────────────────────────────

function computeIst(budget: number, region: Region) {
  const r = calculateImpact({ budget, regions: [region], mode: 'budgetFirst' });
  return {
    laufzeit:    r.laufzeitDays,
    level:       r.capLevel,
    reach_abs:   r.reachMitte,
    reach_pct:   r.stimmTotal > 0 ? Math.round(r.reachMitte / r.stimmTotal * 1000) / 10 : 0,
    f_weekly:    r.frequencyWeekly,
    status_code: r.hinweise[0]?.code ?? 'ok',
  };
}

// ─── Komponente ──────────────────────────────────────────────────────────────

export default function PreislogikCurves() {
  const [activeKey, setActiveKey] = useState<RegionKey>('zug');

  const region  = REGIONS[activeKey];
  const meta    = REGION_META[activeKey];
  const sollRows = SOLL[activeKey];
  const istRows  = BUDGETS.map(b => computeIst(b, region));

  // Global match-counter (laufzeit + level exakt, alle 4 Regionen × 6 Budgets = 24)
  let matchCount = 0;
  ALL_KEYS.forEach(key => {
    BUDGETS.forEach((budget, i) => {
      const ist  = computeIst(budget, REGIONS[key]);
      const soll = SOLL[key][i];
      if (ist.laufzeit === soll.laufzeit && ist.level === soll.level) matchCount++;
    });
  });
  const matchPct = Math.round(matchCount / 24 * 100);

  // ─── Styles ──────────────────────────────────────────────────────────────

  const base: CSSProperties = {
    fontFamily: "'Jost', sans-serif",
    fontSize: 13,
    color: '#1A0F3B',
  };

  const th = (extra: CSSProperties = {}): CSSProperties => ({
    ...base,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#9B8FBF',
    padding: '10px 12px',
    textAlign: 'left',
    background: '#F8F7FB',
    borderBottom: '1px solid rgba(107,79,187,0.12)',
    whiteSpace: 'nowrap',
    ...extra,
  });

  const td = (extra: CSSProperties = {}): CSSProperties => ({
    ...base,
    padding: '5px 12px',
    borderBottom: '1px solid rgba(107,79,187,0.05)',
    verticalAlign: 'middle',
    ...extra,
  });

  const mono = (extra: CSSProperties = {}): CSSProperties =>
    td({ fontFamily: 'monospace', ...extra });

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700, color: '#1A0F3B',
          letterSpacing: '-0.01em', marginBottom: 4,
        }}>
          Preislogik Sandbox v3.3 — Ist vs. Soll
        </h1>
        <p style={{ ...base, fontSize: 13, color: '#5A556F', marginBottom: 28, lineHeight: 1.6 }}>
          <code>lib/preislogik.ts</code> (heutige Logik) ↔{' '}
          <code>public/vio-regelkatalog-politik-v3-3.md</code> (Finale Spec)
          <br />
          <code>mode=&apos;budgetFirst&apos;</code>, ohne <code>laufzeitDays</code> → Optimizer aktiv · Diff: 🟢 ≤5% · 🟡 5–15% · 🔴 &gt;15% oder falsch
        </p>

        {/* Region-Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {ALL_KEYS.map(key => {
            const active = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                style={{
                  padding: '6px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${active ? '#6B4FBB' : 'rgba(107,79,187,0.2)'}`,
                  background: active ? '#6B4FBB' : 'white',
                  color: active ? 'white' : '#5A556F',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                {REGION_META[key].label}
              </button>
            );
          })}
        </div>

        {/* Meta-Bar */}
        <div style={{
          display: 'flex', gap: 24, marginBottom: 20, padding: '10px 16px',
          background: 'white', border: '1px solid rgba(107,79,187,0.10)',
          borderRadius: 10, flexWrap: 'wrap',
        }}>
          {([
            ['Stimm (Daten)', fmt(region.stimm)],
            ['Pool (Spec)',   fmt(meta.specPool)],
            ['Klasse',        meta.klasse],
            ['Typ',           region.type],
            ['Kanton',        region.kanton],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <span style={{
                display: 'block', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: '#9B8FBF', marginBottom: 2,
              }}>
                {label}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#1A0F3B' }}>
                {val}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(107,79,187,0.12)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
            <thead>
              <tr>
                <th style={th()}>Budget</th>
                <th style={th()}>Metrik</th>
                <th style={th({ color: '#6B7280' })}>Soll v3.3</th>
                <th style={th({ color: '#1A0F3B' })}>Ist heute</th>
                <th style={th({ textAlign: 'center' })}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {sollRows.flatMap((soll, i) => {
                const ist = istRows[i];
                const sep: CSSProperties = i > 0 ? { borderTop: '2px solid rgba(107,79,187,0.10)' } : {};

                const rows: { label: string; sollVal: string; istVal: string; diff: string }[] = [
                  {
                    label: 'Laufzeit',
                    sollVal: `${soll.laufzeit}d`,
                    istVal:  `${ist.laufzeit}d`,
                    diff:    exactDiff(soll.laufzeit, ist.laufzeit),
                  },
                  {
                    label: 'Cap-Level',
                    sollVal: `L${soll.level}`,
                    istVal:  `L${ist.level}`,
                    diff:    exactDiff(soll.level, ist.level),
                  },
                  {
                    label: 'Reach abs',
                    sollVal: fmt(soll.reach_abs),
                    istVal:  fmt(ist.reach_abs),
                    diff:    numDiff(soll.reach_abs, ist.reach_abs),
                  },
                  {
                    label: 'Reach %',
                    sollVal: `${soll.reach_pct.toFixed(1)}%`,
                    istVal:  `${ist.reach_pct.toFixed(1)}%`,
                    diff:    numDiff(soll.reach_pct, ist.reach_pct),
                  },
                  {
                    label: 'f_weekly',
                    sollVal: `${soll.f_weekly.toFixed(1)}×`,
                    istVal:  `${ist.f_weekly.toFixed(1)}×`,
                    diff:    numDiff(soll.f_weekly, ist.f_weekly),
                  },
                  {
                    label: 'Status',
                    sollVal: soll.status_code,
                    istVal:  ist.status_code,
                    diff:    '—',
                  },
                ];

                return rows.map((row, mi) => (
                  <tr key={`${i}-${mi}`}>
                    {mi === 0 && (
                      <td rowSpan={6} style={mono({
                        ...sep,
                        fontWeight: 700,
                        verticalAlign: 'top',
                        paddingTop: 10,
                        borderRight: '1px solid rgba(107,79,187,0.10)',
                        whiteSpace: 'nowrap',
                        color: '#1A0F3B',
                      })}>
                        CHF {fmt(soll.budget)}
                      </td>
                    )}
                    <td style={td({
                      ...(mi === 0 ? sep : {}),
                      fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: '#9B8FBF', whiteSpace: 'nowrap',
                    })}>
                      {row.label}
                    </td>
                    <td style={mono({ ...(mi === 0 ? sep : {}), color: '#6B7280' })}>
                      {row.sollVal}
                    </td>
                    <td style={mono({ ...(mi === 0 ? sep : {}), fontWeight: 600 })}>
                      {row.istVal}
                    </td>
                    <td style={td({ ...(mi === 0 ? sep : {}), textAlign: 'center', fontSize: 15 })}>
                      {row.diff}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        {/* Fussnote */}
        {meta.note && (
          <p style={{ ...base, fontSize: 11, color: '#9B8FBF', marginTop: 10 }}>
            ⚠ Hinweis: {meta.note}
          </p>
        )}

        {/* Footer: Match-Counter */}
        <div style={{
          marginTop: 16, padding: '12px 16px',
          background: 'white', border: '1px solid rgba(107,79,187,0.10)',
          borderRadius: 10, display: 'flex', alignItems: 'center',
          gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
            color: matchCount >= 18 ? '#166534' : matchCount >= 10 ? '#92400E' : '#991B1B',
          }}>
            {matchCount}/24 🟢
          </span>
          <span style={{ ...base, fontSize: 13, color: '#5A556F' }}>
            Zeilen match (Laufzeit + Level exakt) — {matchPct}% Match-Quote über alle 4 Regionen
          </span>
        </div>

      </div>
    </div>
  );
}
