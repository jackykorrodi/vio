'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#6B4FBB', pd: '#8B6FD4', pl: '#EDE8FF',
  taupe: '#2D1F52', muted: '#7A7596', border: 'rgba(107,79,187,0.12)',
  bg: '#FDFCFF', white: '#FFFFFF',
} as const;

const card: React.CSSProperties = {
  background: C.white, borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(44,44,62,.07)',
  padding: '20px 22px', marginBottom: '14px',
};
const clabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '.1em',
  color: C.muted, textTransform: 'uppercase' as const, marginBottom: '10px',
};

// ─── Potenzial calculation ────────────────────────────────────────────────────
const BLENDED_CPM = 40; // (0.70×50) + (0.30×15)

function calcDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function calcPotenzial(totalStimm: number, days: number, votingDate: string) {
  const tiers = [
    { rate: 0.14, freq: 3, weeks: 1 },
    { rate: 0.25, freq: 5, weeks: 2 },
    { rate: 0.35, freq: 7, weeks: 4 },
  ].filter(t => t.weeks === 1 || t.weeks * 7 <= days);

  const recommended = tiers[Math.min(1, tiers.length - 1)];
  const targetReach = Math.round(totalStimm * recommended.rate);
  const impressions  = targetReach * recommended.freq;
  const raw          = (impressions / 1000) * BLENDED_CPM;
  const budget       = Math.max(2500, Math.round(raw / 500) * 500);
  const laufzeit     = recommended.weeks;

  const startD = new Date(votingDate + 'T12:00:00');
  startD.setDate(startD.getDate() - laufzeit * 7);
  const today = new Date();
  const actualStart = startD < today ? today : startD;
  const start = actualStart.toISOString().split('T')[0];

  return { erreichbar: targetReach, budget, laufzeit, start };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function formatDateDE(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  onComplete: () => void; // jumps to Step 4 (Budget)
  isActive: boolean;
}

// ─── Dropdown row ─────────────────────────────────────────────────────────────
function RegionRow({ r, onSelect }: { r: Region; onSelect: (r: Region) => void }) {
  return (
    <div
      onMouseDown={() => onSelect(r)}
      style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ flex: 1, fontSize: '14px', color: C.taupe }}>{r.name}</span>
      {r.type === 'stadt' && r.kanton ? (
        <span style={{ fontSize: '11px', color: '#7C3AED', background: '#EDE9FE', borderRadius: '100px', padding: '2px 8px', whiteSpace: 'nowrap' as const }}>
          {r.kanton}
        </span>
      ) : (
        <span style={{ fontSize: '11px', color: C.muted, background: C.border, borderRadius: '100px', padding: '2px 8px', whiteSpace: 'nowrap' as const }}>
          {r.type === 'schweiz' ? 'CH' : 'Kanton'}
        </span>
      )}
      <span style={{ fontSize: '12px', color: C.muted, whiteSpace: 'nowrap' as const }}>
        {r.stimm.toLocaleString('de-CH')}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step2Politik({ briefing, updateBriefing, onComplete }: Props) {
  const [selectedRegions, setSelectedRegions] = useState<Region[]>(() =>
    (briefing.selectedRegions ?? []) as Region[]
  );
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [votingDate, setVotingDate] = useState(briefing.votingDate ?? '');
  const [politikType, setPolitikType] = useState<'ja' | 'nein' | 'kandidat' | 'event' | null>(
    briefing.politikType ?? null
  );

  // ── Search results ─────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => !selectedRegions.some(s => s.name === r.name));
    const schweiz = pool.filter(r => r.type === 'schweiz');
    const kantone = pool.filter(r => r.type === 'kanton');
    const staedte = pool.filter(r => r.type === 'stadt')
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return [...schweiz, ...kantone, ...staedte].slice(0, 8);
  }, [query, selectedRegions]);

  const totalStimm = selectedRegions.reduce((sum, r) => sum + r.stimm, 0);
  const daysUntil  = votingDate ? calcDaysUntil(votingDate) : 0;
  const allFilled  = selectedRegions.length >= 1 && !!votingDate && !!politikType;
  const potenzial  = allFilled ? calcPotenzial(totalStimm, daysUntil, votingDate) : null;

  const addRegion = (r: Region) => {
    if (selectedRegions.length >= 10) return;
    setSelectedRegions(prev => [...prev, r]);
    setQuery('');
    setDropdownOpen(false);
  };

  const removeRegion = (name: string) => {
    setSelectedRegions(prev => prev.filter(r => r.name !== name));
  };

  const handleWeiter = () => {
    if (!allFilled || !potenzial) return;
    const days = calcDaysUntil(votingDate);
    updateBriefing({
      politikType: politikType!,
      votingDate,
      daysUntil: days,
      selectedRegions: selectedRegions.map(r => ({
        name: r.name,
        type: r.type,
        stimm: r.stimm,
        kanton: r.kanton,
      })),
      totalStimmber:    totalStimm,
      stimmberechtigte: totalStimm,
      politikRegion:    selectedRegions[0]?.name ?? '',
      politikRegionType: (selectedRegions[0]?.type ?? 'kanton') as 'kanton' | 'stadt' | 'schweiz',
      recommendedBudget:   potenzial.budget,
      recommendedLaufzeit: potenzial.laufzeit,
      startDate:           potenzial.start,
    });
    onComplete();
  };

  return (
    <section style={{ backgroundColor: '#FDFCFF', position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>

      {/* Background blobs */}
      {[
        { color: 'rgba(184,169,232,0.18)', size: 500, top: '-100px', right: '-80px' },
        { color: 'rgba(200,223,248,0.16)', size: 440, top: '300px', left: '-100px' },
        { color: 'rgba(212,168,67,0.08)',  size: 320, bottom: '10%', right: '10%' },
      ].map((b, i) => (
        <div key={i} style={{ position: 'fixed', width: `${b.size}px`, height: `${b.size}px`, top: (b as unknown as Record<string,string>).top, right: (b as unknown as Record<string,string>).right, bottom: (b as unknown as Record<string,string>).bottom, left: (b as unknown as Record<string,string>).left, background: `radial-gradient(circle,${b.color},transparent 65%)`, filter: 'blur(88px)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      ))}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Eyebrow ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: 18, height: 2, background: '#6B4FBB', borderRadius: 2 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#D4A843' }}>
            Schritt 1 · Politische Kampagne
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,2.4vw,34px)', fontWeight: 800, letterSpacing: '-.025em', color: '#2D1F52', marginBottom: '6px' }}>
          Wahlkreis & Kampagnenziel
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7596', fontWeight: 300, lineHeight: 1.6, marginBottom: '32px' }}>
          Wähle deine Zielregion(en), das Abstimmungsdatum und den Kampagnentyp.
        </p>

        {/* ── Main card ── */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '1px solid rgba(107,79,187,0.09)', boxShadow: '0 4px 24px rgba(107,79,187,0.06)' }}>

          {/* ── Multi-region picker ─────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '10px' }}>Region / Wahlkreis</div>

            {selectedRegions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '8px' }}>
                {selectedRegions.map(r => (
                  <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EDE8FF', border: '1px solid rgba(107,79,187,0.25)', borderRadius: '100px', padding: '5px 12px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: '#6B4FBB' }}>
                    {r.name}
                    {r.type === 'stadt' && r.kanton && (
                      <span style={{ fontSize: '11px', color: '#7C3AED', background: '#EDE9FE', borderRadius: '100px', padding: '1px 7px' }}>{r.kanton}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeRegion(r.name)}
                      style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(107,79,187,0.15)', border: 'none', color: '#6B4FBB', cursor: 'pointer', fontSize: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}
                      aria-label={`${r.name} entfernen`}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {selectedRegions.length > 0 && (
              <div style={{ fontSize: '12px', color: '#7A7596', marginBottom: '10px' }}>
                Total: <strong style={{ color: '#2D1F52' }}>{totalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
              </div>
            )}

            {selectedRegions.length < 10 && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={query}
                  placeholder="Kanton oder Gemeinde suchen..."
                  onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                  onFocus={e => { setDropdownOpen(true); e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,79,187,0.10)'; }}
                  onBlur={e => { setTimeout(() => setDropdownOpen(false), 200); e.currentTarget.style.borderColor = 'rgba(107,79,187,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                  style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid rgba(107,79,187,0.15)', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', fontFamily: 'var(--font-sans)', color: '#2D1F52', background: '#FDFCFF', outline: 'none', transition: 'border-color .2s, box-shadow .2s' }}
                />
                {dropdownOpen && searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid rgba(107,79,187,0.12)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(44,44,62,.12)', maxHeight: '300px', overflowY: 'auto' as const, zIndex: 100 }}>
                    {searchResults.filter(r => r.type === 'schweiz').length > 0 && (
                      <div>
                        <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: '#7A7596', textTransform: 'uppercase' as const }}>Schweiz</div>
                        {searchResults.filter(r => r.type === 'schweiz').map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'kanton').length > 0 && (
                      <div>
                        <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: '#7A7596', textTransform: 'uppercase' as const }}>Kantone</div>
                        {searchResults.filter(r => r.type === 'kanton').map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'stadt').length > 0 && (
                      <div>
                        <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: '#7A7596', textTransform: 'uppercase' as const }}>Städte & Gemeinden</div>
                        {searchResults.filter(r => r.type === 'stadt').map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedRegions.length >= 10 && (
              <p style={{ fontSize: '12px', color: '#7A7596', marginTop: '6px' }}>Maximal 10 Regionen ausgewählt.</p>
            )}
          </div>

          <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '24px 0' }} />

          {/* ── Voting date ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '10px' }}>Abstimmungs- oder Wahltag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="date"
                min={todayStr()}
                value={votingDate}
                onChange={e => setVotingDate(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,79,187,0.10)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                style={{ padding: '12px 16px', border: '1.5px solid rgba(107,79,187,0.15)', borderRadius: '12px', fontSize: '15px', fontFamily: 'var(--font-sans)', color: '#2D1F52', background: '#FDFCFF', outline: 'none', cursor: 'pointer', transition: 'border-color .2s, box-shadow .2s' }}
              />
              {votingDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', background: '#EDE8FF', color: '#6B4FBB', borderRadius: '100px', padding: '6px 14px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '12px' }}>
                  Noch {calcDaysUntil(votingDate)} Tage
                </span>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '24px 0' }} />

          {/* ── Kampagnentyp ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '10px' }}>Kampagnentyp</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {([
                {
                  value: 'ja' as const, name: 'JA-Kampagne',
                  iconBg: '#EDE8FF',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="#6B4FBB" strokeWidth="1.5"/>
                      <path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="#6B4FBB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                },
                {
                  value: 'nein' as const, name: 'NEIN-Kampagne',
                  iconBg: '#FEE2E2',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <circle cx="11" cy="11" r="8" stroke="#E05252" strokeWidth="1.5"/>
                      <path d="M8 8l6 6M14 8l-6 6" stroke="#E05252" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ),
                },
                {
                  value: 'kandidat' as const, name: 'Kandidatenwahl',
                  iconBg: '#FDF3DC',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <circle cx="11" cy="8" r="3.5" stroke="#D4A843" strokeWidth="1.5"/>
                      <path d="M4 19c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ),
                },
                {
                  value: 'event' as const, name: 'Event & Mobilisierung',
                  iconBg: '#EEF5FF',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="#4A78B0" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="11" cy="11" r="4" stroke="#4A78B0" strokeWidth="1.5"/>
                      <path d="M5.5 5.5l1.5 1.5M15 15l1.5 1.5M15 5.5L13.5 7M7 15l-1.5 1.5" stroke="#4A78B0" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ),
                },
              ]).map(opt => {
                const active = politikType === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setPolitikType(opt.value)}
                    style={{ background: active ? '#F5F2FF' : 'white', border: active ? '2px solid #6B4FBB' : '1.5px solid rgba(107,79,187,0.10)', borderRadius: '16px', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.28)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,79,187,0.10)'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.10)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: opt.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {opt.icon}
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: '#2D1F52' }}>{opt.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Potenzialberechnung ─────────────────────────────────────────── */}
          {allFilled && potenzial && (
            <>
              <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '24px 0' }} />
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '10px' }}>Potenzialberechnung</div>
                {daysUntil < 14 && (
                  <div style={{ background: '#FDF3DC', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '12px', padding: '12px 16px', color: '#9B7120', fontSize: '13px', fontWeight: 300, display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#D4A843" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M8 6v3.5" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="8" cy="11" r=".75" fill="#D4A843"/>
                    </svg>
                    Weniger als 14 Tage bis zur Abstimmung — nur 1-Wochen-Kampagne möglich.
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  {[
                    { label: 'Stimmberechtigte',     value: totalStimm.toLocaleString('de-CH') },
                    { label: 'Erreichbare Personen',  value: `~${potenzial.erreichbar.toLocaleString('de-CH')}` },
                    { label: 'Empf. Budget',          value: `CHF ${potenzial.budget.toLocaleString('de-CH')}` },
                    { label: 'Empf. Laufzeit',        value: `${potenzial.laufzeit} ${potenzial.laufzeit === 1 ? 'Woche' : 'Wochen'}` },
                    { label: 'Kampagnenstart',         value: formatDateDE(potenzial.start) },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#F5F2FF', border: '1px solid rgba(107,79,187,0.12)', borderRadius: '14px', padding: '16px 18px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#B8A9E8', marginBottom: '6px' }}>{stat.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#2D1F52' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#7A7596', lineHeight: 1.5 }}>
                  Diese Werte werden als Voreinstellung für Budget und Laufzeit übernommen.
                </p>
              </div>
            </>
          )}

          {/* ── Weiter ─────────────────────────────────────────────────────── */}
          {allFilled && (
            <button
              type="button"
              onClick={handleWeiter}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#6B4FBB', color: 'white', border: 'none', borderRadius: '100px', padding: '16px 32px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(107,79,187,0.28)', transition: 'all .18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#8B6FD4'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#6B4FBB'; e.currentTarget.style.transform = 'none'; }}
            >
              Weiter zu Budget & Reichweite →
            </button>
          )}

        </div>
      </div>
    </section>
  );
}
