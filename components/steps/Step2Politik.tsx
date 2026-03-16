'use client';

import { useState, useRef, useEffect } from 'react';
import { BriefingData } from '@/lib/types';

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
  green: '#3A9E7A',
} as const;

const page: React.CSSProperties = { maxWidth: '720px', margin: '0 auto', padding: '40px 20px 80px' };
const card: React.CSSProperties = { background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(44,44,62,.07)', padding: '20px 22px', marginBottom: '14px' };
const clabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '10px' };

// ── Region data ─────────────────────────────────────────────────────────────
interface Region { name: string; type: 'schweiz' | 'kanton' | 'stadt'; pop: number; stimm: number }

const SCHWEIZ: Region[] = [
  { name: 'Gesamte Schweiz', type: 'schweiz', pop: 8816000, stimm: 5571000 },
];

const KANTONE: Region[] = [
  { name: 'Zürich',                   type: 'kanton', pop: 1539000, stimm: 1077300 },
  { name: 'Bern',                      type: 'kanton', pop: 1050000, stimm:  735000 },
  { name: 'Luzern',                    type: 'kanton', pop:  428000, stimm:  299600 },
  { name: 'Uri',                       type: 'kanton', pop:   37000, stimm:   25900 },
  { name: 'Schwyz',                    type: 'kanton', pop:  166000, stimm:  116200 },
  { name: 'Obwalden',                  type: 'kanton', pop:   39000, stimm:   27300 },
  { name: 'Nidwalden',                 type: 'kanton', pop:   44000, stimm:   30800 },
  { name: 'Glarus',                    type: 'kanton', pop:   41000, stimm:   28700 },
  { name: 'Zug',                       type: 'kanton', pop:  131000, stimm:   91700 },
  { name: 'Freiburg',                  type: 'kanton', pop:  337000, stimm:  235900 },
  { name: 'Solothurn',                 type: 'kanton', pop:  283000, stimm:  198100 },
  { name: 'Basel-Stadt',               type: 'kanton', pop:  196000, stimm:  137200 },
  { name: 'Basel-Landschaft',          type: 'kanton', pop:  296000, stimm:  207200 },
  { name: 'Schaffhausen',              type: 'kanton', pop:   83000, stimm:   58100 },
  { name: 'Appenzell Ausserrhoden',    type: 'kanton', pop:   56000, stimm:   39200 },
  { name: 'Appenzell Innerrhoden',     type: 'kanton', pop:   17000, stimm:   11900 },
  { name: 'St. Gallen',                type: 'kanton', pop:  520000, stimm:  364000 },
  { name: 'Graubünden',                type: 'kanton', pop:  202000, stimm:  141400 },
  { name: 'Aargau',                    type: 'kanton', pop:  720000, stimm:  504000 },
  { name: 'Thurgau',                   type: 'kanton', pop:  289000, stimm:  202300 },
  { name: 'Tessin',                    type: 'kanton', pop:  355000, stimm:  248500 },
  { name: 'Waadt',                     type: 'kanton', pop:  820000, stimm:  574000 },
  { name: 'Wallis',                    type: 'kanton', pop:  352000, stimm:  246400 },
  { name: 'Neuenburg',                 type: 'kanton', pop:  177000, stimm:  123900 },
  { name: 'Genf',                      type: 'kanton', pop:  516000, stimm:  361200 },
  { name: 'Jura',                      type: 'kanton', pop:   73000, stimm:   51100 },
];

const STAEDTE: Region[] = [
  { name: 'Zürich Stadt',       type: 'stadt', pop: 440000, stimm: 308000 },
  { name: 'Genf Stadt',         type: 'stadt', pop: 204000, stimm: 142800 },
  { name: 'Basel Stadt',        type: 'stadt', pop: 177000, stimm: 123900 },
  { name: 'Lausanne',           type: 'stadt', pop: 147000, stimm: 102900 },
  { name: 'Bern Stadt',         type: 'stadt', pop: 134000, stimm:  93800 },
  { name: 'Winterthur',         type: 'stadt', pop: 116000, stimm:  81200 },
  { name: 'Luzern Stadt',       type: 'stadt', pop:  82000, stimm:  57400 },
  { name: 'St. Gallen Stadt',   type: 'stadt', pop:  80000, stimm:  56000 },
  { name: 'Lugano',             type: 'stadt', pop:  64000, stimm:  44800 },
  { name: 'Biel/Bienne',        type: 'stadt', pop:  57000, stimm:  39900 },
  { name: 'Thun',               type: 'stadt', pop:  44000, stimm:  30800 },
  { name: 'Köniz',              type: 'stadt', pop:  43000, stimm:  30100 },
  { name: 'Freiburg Stadt',     type: 'stadt', pop:  38000, stimm:  26600 },
  { name: 'Schaffhausen Stadt', type: 'stadt', pop:  36000, stimm:  25200 },
  { name: 'Chur',               type: 'stadt', pop:  36000, stimm:  25200 },
  { name: 'Uster',              type: 'stadt', pop:  36000, stimm:  25200 },
  { name: 'Sion',               type: 'stadt', pop:  34000, stimm:  23800 },
  { name: 'Zug Stadt',          type: 'stadt', pop:  30000, stimm:  21000 },
  { name: 'Vernier',            type: 'stadt', pop:  36000, stimm:  25200 },
  { name: 'Aarau',              type: 'stadt', pop:  23000, stimm:  16100 },
];

const ALL_REGIONS: Region[] = [...SCHWEIZ, ...KANTONE, ...STAEDTE];

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntilDate(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function calcPotenzial(stimm: number, days: number, votingDate: string) {
  const erreichbar = Math.round(stimm * 0.35);
  const raw = (erreichbar * 3 * 32) / 1000;
  const budget = Math.max(2500, Math.min(50000, Math.round(raw / 500) * 500));
  const laufzeit = days > 28 ? 4 : days >= 14 ? 2 : 1;
  const startD = new Date(votingDate + 'T12:00:00');
  startD.setDate(startD.getDate() - laufzeit * 7);
  const start = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-${String(startD.getDate()).padStart(2, '0')}`;
  return { erreichbar, budget, laufzeit, start };
}

function fmt(n: number) { return n.toLocaleString('de-CH'); }
function fmtCHF(n: number) { return `CHF ${n.toLocaleString('de-CH')}`; }

const MONTHS_DE = ['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sep.','Okt.','Nov.','Dez.'];
function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  onComplete: () => void;  // jumps to Step 4 (Budget)
  isActive: boolean;
}

// ── Searchable region combobox ────────────────────────────────────────────────
function RegionSelect({ value, onChange }: { value: Region | null; onChange: (r: Region) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = query.toLowerCase();
  const filtered = ALL_REGIONS.filter(r => !q || r.name.toLowerCase().includes(q));
  const fSchweiz  = filtered.filter(r => r.type === 'schweiz');
  const fKantone  = filtered.filter(r => r.type === 'kanton');
  const fStaedte  = filtered.filter(r => r.type === 'stadt');

  function select(r: Region) {
    onChange(r);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={open ? query : (value?.name ?? '')}
        placeholder="Kanton oder Stadt suchen…"
        onFocus={() => { setQuery(''); setOpen(true); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: `1.5px solid ${open ? C.primary : C.border}`,
          fontSize: 14, color: C.taupe, fontFamily: 'var(--font-outfit), sans-serif',
          backgroundColor: C.white, outline: 'none', cursor: 'text', boxSizing: 'border-box',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: C.white, border: `1.5px solid ${C.border}`, borderTop: 'none',
          borderRadius: '0 0 10px 10px', maxHeight: 280, overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(44,44,62,.12)',
        }}>
          {[
            { label: 'Gesamtgebiet', items: fSchweiz },
            { label: 'Kantone', items: fKantone },
            { label: 'Städte', items: fStaedte },
          ].filter(g => g.items.length > 0).map(group => (
            <div key={group.label}>
              <div style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: C.muted, textTransform: 'uppercase', background: C.bg }}>
                {group.label}
              </div>
              {group.items.map(r => (
                <div
                  key={r.name}
                  onMouseDown={() => select(r)}
                  style={{
                    padding: '9px 14px', fontSize: 14, color: C.taupe, cursor: 'pointer',
                    background: value?.name === r.name ? C.pl : C.white,
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.pl; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = value?.name === r.name ? C.pl : C.white; }}
                >
                  {r.name}
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>
                    {fmt(r.stimm)} Stimmber.
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Step2Politik({ briefing, updateBriefing, onComplete }: Props) {
  const [region, setRegion] = useState<Region | null>(null);
  const [votingDate, setVotingDate] = useState('');
  const [politikType, setPolitikType] = useState<'ja' | 'nein' | 'kandidat' | 'event' | null>(null);

  const days = votingDate ? daysUntilDate(votingDate) : 0;
  const allFilled = region !== null && votingDate !== '' && politikType !== null;
  const potenzial = allFilled ? calcPotenzial(region.stimm, days, votingDate) : null;

  const TYPEN = [
    { value: 'ja'       as const, ico: '✅', title: 'JA-Kampagne',           desc: 'Für eine Vorlage, Initiative oder ein Projekt' },
    { value: 'nein'     as const, ico: '❌', title: 'NEIN-Kampagne',          desc: 'Gegen eine Vorlage, Initiative oder ein Projekt' },
    { value: 'kandidat' as const, ico: '🗳️', title: 'Kandidatenwahl',         desc: 'Für eine Person oder Liste bei einer Wahl' },
    { value: 'event'    as const, ico: '📣', title: 'Event & Mobilisierung',  desc: 'Kundgebung, Veranstaltung, Mobilisierung' },
  ];

  function handleWeiter() {
    if (!allFilled || !potenzial || !region) return;
    updateBriefing({
      politikType: politikType!,
      politikRegion: region.name,
      politikRegionType: region.type,
      stimmberechtigte: region.stimm,
      votingDate,
      daysUntil: days,
      recommendedBudget: potenzial.budget,
      recommendedLaufzeit: potenzial.laufzeit,
      budget: potenzial.budget,
      laufzeit: potenzial.laufzeit,
      startDate: potenzial.start,
    });
    onComplete();
  }

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 18, height: 2, background: C.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 2
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 6, color: C.taupe }}>
          Deine politische Kampagne.
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
          Gib Region, Abstimmungsdatum und Kampagnentyp ein – wir berechnen das Potenzial automatisch.
        </p>

        {/* ── 1. Region ──────────────────────────────────────────────────── */}
        <div style={card}>
          <div style={clabel}>1. Region</div>
          <RegionSelect value={region} onChange={setRegion} />
          {region && (
            <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                Bevölkerung: <strong style={{ color: C.taupe }}>{fmt(region.pop)}</strong>
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>
                Stimmberechtigte: <strong style={{ color: C.primary }}>{fmt(region.stimm)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ── 2. Abstimmungsdatum ────────────────────────────────────────── */}
        <div style={card}>
          <div style={clabel}>2. Abstimmungs- oder Wahltag</div>
          <input
            type="date"
            value={votingDate}
            min={todayStr()}
            onChange={e => setVotingDate(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${votingDate ? C.primary : C.border}`,
              fontSize: 14, color: C.taupe, fontFamily: 'var(--font-outfit), sans-serif',
              backgroundColor: C.white, outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
            }}
          />
          {votingDate && (
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, background: C.pl, borderRadius: 100, padding: '5px 14px' }}>
              <span style={{ fontSize: 13, color: C.pd, fontWeight: 600 }}>
                🗓 Noch {days} {days === 1 ? 'Tag' : 'Tage'} bis zur Abstimmung
              </span>
            </div>
          )}
        </div>

        {/* ── 3. Kampagnentyp ────────────────────────────────────────────── */}
        <div style={card}>
          <div style={clabel}>3. Kampagnentyp</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {TYPEN.map(t => {
              const active = politikType === t.value;
              return (
                <div
                  key={t.value}
                  onClick={() => setPolitikType(t.value)}
                  style={{
                    padding: 16, borderRadius: 10,
                    border: `2px solid ${active ? C.primary : C.border}`,
                    background: active ? C.pl : C.bg,
                    cursor: 'pointer', transition: 'all .2s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{t.ico}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.taupe }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Potenzialberechnung ─────────────────────────────────────── */}
        {allFilled && potenzial && region && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>
              Potenzialberechnung
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { label: 'Stimmberechtigte',    value: fmt(region.stimm),         sub: 'in der gewählten Region',       hi: false },
                { label: 'Erreichbare Personen', value: `~${fmt(potenzial.erreichbar)}`, sub: '35% der Stimmberechtigten',    hi: true  },
                { label: 'Empf. Budget',          value: fmtCHF(potenzial.budget),  sub: 'gerundet auf nächste CHF 500',  hi: true  },
                { label: 'Empf. Laufzeit',        value: `${potenzial.laufzeit} ${potenzial.laufzeit === 1 ? 'Woche' : 'Wochen'}`, sub: days > 28 ? '4 Wochen – genug Vorlauf' : days >= 14 ? '2 Wochen – knapper Zeitplan' : '1 Woche – Endspurt', hi: false },
                { label: 'Kampagnenstart',        value: fmtDate(potenzial.start),  sub: `${potenzial.laufzeit * 7} Tage vor der Abstimmung`, hi: false, wide: true },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    gridColumn: (s as { wide?: boolean }).wide ? '1 / -1' : undefined,
                    background: s.hi ? C.primary : C.white,
                    border: `1px solid ${s.hi ? C.primary : C.border}`,
                    borderRadius: 12, padding: '14px 18px',
                    boxShadow: '0 1px 4px rgba(44,44,62,.07)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: s.hi ? 'rgba(255,255,255,.7)' : C.muted, marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 400, color: s.hi ? '#fff' : C.taupe, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: s.hi ? 'rgba(255,255,255,.65)' : C.muted, marginTop: 4 }}>
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleWeiter}
          disabled={!allFilled}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: allFilled ? C.primary : C.border,
            color: allFilled ? '#fff' : C.muted,
            border: 'none', borderRadius: 100, padding: '15px 32px',
            fontFamily: 'var(--font-outfit), sans-serif', fontSize: 16, fontWeight: 600,
            cursor: allFilled ? 'pointer' : 'default',
            boxShadow: allFilled ? '0 4px 16px rgba(193,102,107,.3)' : 'none',
            transition: 'all .18s', marginTop: 8,
          }}
          onMouseEnter={e => { if (allFilled) { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
          onMouseLeave={e => { if (allFilled) { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; } }}
        >
          Weiter zu Budget & Reichweite →
        </button>
      </div>
    </section>
  );
}
