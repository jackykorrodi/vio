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
    <section style={{ backgroundColor: 'var(--off-white)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Eyebrow ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: '#D4A843', textTransform: 'uppercase' }}>
            Schritt 2 · Politische Kampagne
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Wahlkreis & Kampagnenziel
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Wähle deine Zielregion(en), das Abstimmungsdatum und den Kampagnentyp.
        </p>

        <div style={card}>

          {/* ── Multi-region picker ─────────────────────────────────────────── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={clabel}>Region / Wahlkreis</div>

            {/* Selected tags */}
            {selectedRegions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '8px' }}>
                {selectedRegions.map(r => (
                  <span key={r.name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: C.pl, border: `1px solid ${C.primary}`,
                    color: C.pd, borderRadius: '100px',
                    padding: '5px 8px 5px 14px', fontSize: '13px', fontWeight: 600,
                  }}>
                    {r.name}
                    {r.type === 'stadt' && r.kanton && (
                      <span style={{ fontSize: '11px', color: '#7C3AED', background: '#EDE9FE', borderRadius: '100px', padding: '1px 7px' }}>
                        {r.kanton}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeRegion(r.name)}
                      style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                      aria-label={`${r.name} entfernen`}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Total */}
            {selectedRegions.length > 0 && (
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px' }}>
                Total: <strong style={{ color: C.taupe }}>{totalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
              </div>
            )}

            {/* Search input */}
            {selectedRegions.length < 10 && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={query}
                  placeholder="Kanton oder Gemeinde suchen..."
                  onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px 16px',
                    borderRadius: '8px', border: `1.5px solid ${C.border}`,
                    fontSize: '15px', fontFamily: 'var(--font-sans), sans-serif',
                    color: C.taupe, backgroundColor: C.white, outline: 'none',
                  }}
                />
                {dropdownOpen && searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: C.white, border: `1px solid ${C.border}`,
                    borderRadius: '10px', boxShadow: '0 8px 24px rgba(44,44,62,.12)',
                    maxHeight: '300px', overflowY: 'auto', zIndex: 100,
                  }}>
                    {searchResults.filter(r => r.type === 'schweiz').length > 0 && (
                      <div>
                        <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Schweiz</div>
                        {searchResults.filter(r => r.type === 'schweiz').map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'kanton').length > 0 && (
                      <div>
                        <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Kantone</div>
                        {searchResults.filter(r => r.type === 'kanton').map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'stadt').length > 0 && (
                      <div>
                        <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Städte & Gemeinden</div>
                        {searchResults.filter(r => r.type === 'stadt').map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedRegions.length >= 10 && (
              <p style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>Maximal 10 Regionen ausgewählt.</p>
            )}
          </div>

          {/* ── Voting date ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={clabel}>Abstimmungs- oder Wahltag</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="date"
                min={todayStr()}
                value={votingDate}
                onChange={e => setVotingDate(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '15px', fontFamily: 'var(--font-sans), sans-serif', color: C.taupe, backgroundColor: C.white, outline: 'none', cursor: 'pointer' }}
              />
              {votingDate && (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '100px', backgroundColor: '#F9EDEA', color: '#B3502A', fontSize: '13px', fontWeight: 600 }}>
                  Noch {calcDaysUntil(votingDate)} Tage
                </span>
              )}
            </div>
          </div>

          {/* ── Kampagnentyp ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '20px' }}>
            <div style={clabel}>Kampagnentyp</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {([
                { value: 'ja'       as const, ico: '✅', name: 'JA-Kampagne' },
                { value: 'nein'     as const, ico: '❌', name: 'NEIN-Kampagne' },
                { value: 'kandidat' as const, ico: '🙋', name: 'Kandidatenwahl' },
                { value: 'event'    as const, ico: '📣', name: 'Event & Mobilisierung' },
              ]).map(opt => {
                const active = politikType === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setPolitikType(opt.value)}
                    style={{ padding: '14px 16px', borderRadius: '10px', border: `2px solid ${active ? C.primary : C.border}`, background: active ? C.pl : C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all .2s' }}
                  >
                    <span style={{ fontSize: '18px' }}>{opt.ico}</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: C.taupe }}>{opt.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Potenzialberechnung ─────────────────────────────────────────── */}
          {allFilled && potenzial && (
            <div style={{ marginBottom: '20px' }}>
              <div style={clabel}>Potenzialberechnung</div>
              {daysUntil < 14 && (
                <div style={{ fontSize: '12px', color: '#7A5500', background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                  ⚠️ Weniger als 14 Tage bis zur Abstimmung — nur 1-Wochen-Kampagne möglich.
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {[
                  { label: 'Stimmberechtigte',    value: totalStimm.toLocaleString('de-CH') },
                  { label: 'Erreichbare Personen', value: `~${potenzial.erreichbar.toLocaleString('de-CH')}` },
                  { label: 'Empf. Budget',         value: `CHF ${potenzial.budget.toLocaleString('de-CH')}` },
                  { label: 'Empf. Laufzeit',       value: `${potenzial.laufzeit} ${potenzial.laufzeit === 1 ? 'Woche' : 'Wochen'}` },
                  { label: 'Kampagnenstart',        value: formatDateDE(potenzial.start) },
                ].map(stat => (
                  <div key={stat.label} style={{ background: C.pl, borderRadius: '10px', padding: '14px 16px', border: `1px solid rgba(107,79,187,.15)` }}>
                    <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '.08em' }}>{stat.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: C.taupe }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
                Diese Werte werden als Voreinstellung für Budget und Laufzeit übernommen.
              </p>
            </div>
          )}

          {/* ── Weiter ─────────────────────────────────────────────────────── */}
          {allFilled && (
            <button
              type="button"
              onClick={handleWeiter}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: C.primary, color: '#fff', border: 'none', borderRadius: '100px', padding: '15px 32px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '16px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(107,79,187,.3)', transition: 'all .18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
            >
              Weiter zu Budget & Reichweite →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
