'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
} as const;

const page: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const card: React.CSSProperties = {
  background: C.white,
  borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(44,44,62,.07)',
  padding: '20px 22px',
  marginBottom: '14px',
};

const clabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.1em',
  color: C.muted,
  textTransform: 'uppercase',
  marginBottom: '10px',
};

// ── Analysis steps ────────────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  { icon: '🔍', label: 'Website gelesen', getSub: (domain: string) => domain },
  { icon: '🧠', label: 'Thema & Kontext erkannt', getSub: () => 'KI analysiert Inhalte...' },
  { icon: '🎯', label: 'Zielgruppe bestimmt', getSub: () => 'KI gleicht mit Schweizer Daten ab...' },
  { icon: '📊', label: 'Potenzial berechnet', getSub: () => 'BFS-Bevölkerungsdaten werden geladen' },
];

// ── Politik helpers ───────────────────────────────────────────────────────────

function calcDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function politikTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Dropdown row ──────────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  onAnalysisDone: () => void;
  onPolitikDone: () => void;
  onRestartBriefing: (url: string) => void;
  isActive: boolean;
}

export default function Step1Entry({ briefing, updateBriefing, onAnalysisDone, onPolitikDone, onRestartBriefing }: Props) {
  const [url, setUrl] = useState(briefing.url?.replace(/^https:\/\//, '').replace(/^www\./, '') || '');
  const [phase, setPhase] = useState<'idle' | 'analyzing'>('idle');
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);
  const [analysisError, setAnalysisError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Politik state
  const [selectedRegions, setSelectedRegions] = useState<Region[]>(() =>
    (briefing.selectedRegions ?? []) as Region[]
  );
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [votingDate, setVotingDate] = useState(briefing.votingDate ?? '');
  const [politikType, setPolitikType] = useState<'ja' | 'nein' | 'kandidat' | 'event' | null>(
    briefing.politikType ?? null
  );

  const campaignType = briefing.campaignType;
  const accordionOpen = !!campaignType;

  const progress = Math.min(((analysisStepIdx + 1) / ANALYSIS_STEPS.length) * 100, 100);
  const domain = url.replace(/^https?:\/\//, '').split('/')[0] || 'deine-website.ch';

  // Politics computed values — grouped so all three sections always visible
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => !selectedRegions.some(s => s.name === r.name));
    const schweiz = pool.filter(r => r.type === 'schweiz');
    const kantone = pool.filter(r => r.type === 'kanton');
    const staedte = pool.filter(r => r.type === 'stadt')
      .sort((a, b) => b.stimm - a.stimm);
    return { schweiz, kantone, staedte };
  }, [query, selectedRegions]);

  const hasResults = searchResults.schweiz.length + searchResults.kantone.length + searchResults.staedte.length > 0;

  const totalStimm = selectedRegions.reduce((sum, r) => sum + r.stimm, 0);
  const allPolitikFilled = selectedRegions.length >= 1 && !!votingDate && !!politikType;

  const updateDropdownPos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  const openDropdown = () => {
    updateDropdownPos();
    setDropdownOpen(true);
  };

  // Close dropdown on resize
  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('resize', close);
    };
  }, [dropdownOpen]);

  const addRegion = (r: Region) => {
    if (selectedRegions.length >= 10) return;
    setSelectedRegions(prev => [...prev, r]);
    setQuery('');
    // Keep dropdown open and re-focus input
    setTimeout(() => {
      inputRef.current?.focus();
      updateDropdownPos();
    }, 0);
  };

  const removeRegion = (name: string) => {
    setSelectedRegions(prev => prev.filter(r => r.name !== name));
  };

  const handlePolitikWeiter = () => {
    if (!allPolitikFilled) return;
    const days = calcDaysUntil(votingDate);
    const tiers = [
      { rate: 0.14, freq: 3, weeks: 1 },
      { rate: 0.25, freq: 5, weeks: 2 },
      { rate: 0.35, freq: 7, weeks: 4 },
    ].filter(t => t.weeks === 1 || t.weeks * 7 <= days);
    const recommended = tiers[Math.min(1, tiers.length - 1)];
    const targetReach = Math.round(totalStimm * recommended.rate);
    const impressions = targetReach * recommended.freq;
    const raw = (impressions / 1000) * 40;
    const budget = Math.max(2500, Math.round(raw / 500) * 500);
    const laufzeit = recommended.weeks;
    const startD = new Date(votingDate + 'T12:00:00');
    startD.setDate(startD.getDate() - laufzeit * 7);
    const today = new Date();
    const actualStart = startD < today ? today : startD;
    const start = actualStart.toISOString().split('T')[0];
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
      totalStimmber: totalStimm,
      stimmberechtigte: totalStimm,
      politikRegion: selectedRegions[0]?.name ?? '',
      politikRegionType: (selectedRegions[0]?.type ?? 'kanton') as 'kanton' | 'stadt' | 'schweiz',
      recommendedBudget: budget,
      recommendedLaufzeit: laufzeit,
      startDate: start,
    });
    onPolitikDone();
  };

  const handleAnalyze = () => {
    let cleanUrl = url.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (!cleanUrl) return;
    cleanUrl = 'https://' + cleanUrl;
    onRestartBriefing(cleanUrl);
    setPhase('analyzing');
    setAnalysisStepIdx(0);
    setAnalysisError('');
    setShowCancel(false);

    let i = 0;
    const interval = setInterval(() => { i += 1; setAnalysisStepIdx(i); }, 1200);
    const cancelTimer = setTimeout(() => setShowCancel(true), 8000);
    abortRef.current = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl, campaignType: briefing.campaignType }),
          signal: abortRef.current!.signal,
        });
        const data = await res.json();
        await new Promise<void>(resolve => {
          const check = setInterval(() => { if (i >= 3) { clearInterval(check); resolve(); } }, 100);
        });
        clearInterval(interval);
        clearTimeout(cancelTimer);
        setAnalysisStepIdx(4);
        await new Promise(r => setTimeout(r, 600));
        updateBriefing({ analysis: data });
        onAnalysisDone();
      } catch (e: unknown) {
        clearInterval(interval);
        clearTimeout(cancelTimer);
        if (e instanceof Error && e.name === 'AbortError') return;
        setAnalysisError('Analyse fehlgeschlagen. Bitte versuche es erneut.');
        setPhase('idle');
      }
    })();
  };

  const handleCancelAnalysis = () => {
    abortRef.current?.abort();
    setPhase('idle');
    updateBriefing({ analysis: null });
    onAnalysisDone();
  };

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 1
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '30px',
            fontWeight: 400,
            letterSpacing: '-.02em',
            lineHeight: 1.25,
            marginBottom: '6px',
            color: C.taupe,
          }}
        >
          Wie möchtest du werben?
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Wähle deinen Kampagnentyp und gib die nötigen Angaben ein.
        </p>

        {/* Type cards */}
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { value: 'b2c' as const, ico: '👥', name: 'Privatkunden (B2C)', desc: 'Menschen, Haushalte, Bevölkerung' },
              { value: 'b2b' as const, ico: '🏢', name: 'Geschäftskunden (B2B)', desc: 'Firmen, Entscheider, Fachleute' },
              { value: 'politik' as const, ico: '🗳️', name: 'Politische Kampagne', desc: 'Abstimmungen, Wahlen, Mobilisierung' },
            ].map(opt => {
              const active = campaignType === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => updateBriefing({ campaignType: opt.value })}
                  style={{
                    padding: '18px',
                    borderRadius: '10px',
                    border: `2px solid ${active ? C.primary : C.border}`,
                    background: active ? C.pl : C.bg,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{opt.ico}</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: C.taupe }}>{opt.name}</div>
                  <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{opt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accordion body — smooth open/close */}
        <div
          style={{
            maxHeight: accordionOpen ? '1800px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 300ms ease',
          }}
        >
          {/* B2C / B2B content */}
          {campaignType !== 'politik' && (
            <div style={{ paddingTop: '4px' }}>
              {phase === 'idle' && (
                <div style={card}>
                  <div style={clabel}>Deine Website-URL</div>
                  <input
                    type="url"
                    value={url}
                    placeholder="https://deine-website.ch"
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: `1.5px solid ${C.border}`,
                      fontSize: '15px',
                      fontFamily: 'var(--font-outfit), sans-serif',
                      color: C.taupe,
                      backgroundColor: C.white,
                      outline: 'none',
                      marginBottom: '14px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: C.primary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '100px',
                      padding: '15px 32px',
                      fontFamily: 'var(--font-outfit), sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(193,102,107,.3)',
                      transition: 'all .18s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
                  >
                    Analysieren und weiter →
                  </button>
                </div>
              )}

              {phase === 'analyzing' && (
                <div style={card}>
                  {/* Progress bar */}
                  <div style={{
                    width: '100%', height: '4px', background: C.border,
                    borderRadius: '2px', marginBottom: '20px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${C.primary}, ${C.pd})`,
                      borderRadius: '2px',
                      transition: 'width .4s ease',
                    }} />
                  </div>

                  {/* Steps list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ANALYSIS_STEPS.map((step, idx) => {
                      const isDone = analysisStepIdx > idx;
                      const isActive = analysisStepIdx === idx;
                      const opacity = isDone || isActive ? 1 : 0.28;

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            opacity,
                            transition: 'opacity .3s',
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isDone ? '#EBF7F2' : isActive ? C.pl : C.border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              flexShrink: 0,
                              animation: isActive ? 'pulse 1.2s ease-in-out infinite' : 'none',
                            }}
                          >
                            {isDone ? '✓' : step.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: C.taupe }}>{step.label}</div>
                            <div style={{ fontSize: '12px', color: C.muted, marginTop: '1px' }}>{step.getSub(domain)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Error */}
                  {analysisError && (
                    <div style={{ marginTop: '16px', fontSize: '13px', color: C.pd }}>
                      {analysisError}{' '}
                      <button
                        type="button"
                        onClick={handleCancelAnalysis}
                        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', padding: 0 }}
                      >
                        Analyse überspringen
                      </button>
                    </div>
                  )}

                  {/* Cancel */}
                  {showCancel && !analysisError && (
                    <div style={{ marginTop: '16px', fontSize: '13px', color: C.muted }}>
                      <button
                        type="button"
                        onClick={handleCancelAnalysis}
                        style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', padding: 0 }}
                      >
                        Analyse überspringen → Zielgruppe manuell eingeben
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Politik content — full form */}
          {campaignType === 'politik' && (
            <div style={{ paddingTop: '4px' }}>
              <div style={card}>

                {/* ── Region picker ──────────────────────────────────────── */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={clabel}>Region / Wahlkreis</div>

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

                  {selectedRegions.length > 0 && (
                    <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px' }}>
                      Total: <strong style={{ color: C.taupe }}>{totalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
                    </div>
                  )}

                  {selectedRegions.length < 10 && (
                    <div>
                      <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        placeholder="Kanton oder Gemeinde suchen..."
                        onChange={e => { setQuery(e.target.value); openDropdown(); }}
                        onFocus={() => openDropdown()}
                        onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 16px',
                          borderRadius: '8px', border: `1.5px solid ${C.border}`,
                          fontSize: '15px', fontFamily: 'var(--font-outfit), sans-serif',
                          color: C.taupe, backgroundColor: C.white, outline: 'none',
                        }}
                      />
                    </div>
                  )}
                  {selectedRegions.length >= 10 && (
                    <p style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>Maximal 10 Regionen ausgewählt.</p>
                  )}
                </div>

                {/* ── Voting date ────────────────────────────────────────── */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={clabel}>Abstimmungs- oder Wahltag</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="date"
                      min={politikTodayStr()}
                      value={votingDate}
                      onChange={e => setVotingDate(e.target.value)}
                      style={{ padding: '12px 16px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '15px', fontFamily: 'var(--font-outfit), sans-serif', color: C.taupe, backgroundColor: C.white, outline: 'none', cursor: 'pointer' }}
                    />
                    {votingDate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: '100px', backgroundColor: '#F9EDEA', color: '#B3502A', fontSize: '13px', fontWeight: 600 }}>
                        Noch {calcDaysUntil(votingDate)} Tage
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Kampagnentyp ───────────────────────────────────────── */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={clabel}>Kampagnentyp</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {([
                      { value: 'ja' as const, ico: '✅', name: 'JA-Kampagne' },
                      { value: 'nein' as const, ico: '❌', name: 'NEIN-Kampagne' },
                      { value: 'kandidat' as const, ico: '🙋', name: 'Kandidatenwahl' },
                      { value: 'event' as const, ico: '📣', name: 'Event & Mobilisierung' },
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

                {/* ── Weiter ─────────────────────────────────────────────── */}
                {allPolitikFilled && (
                  <button
                    type="button"
                    onClick={handlePolitikWeiter}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: C.primary, color: '#fff', border: 'none', borderRadius: '100px',
                      padding: '15px 32px', fontFamily: 'var(--font-outfit), sans-serif',
                      fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(193,102,107,.3)', transition: 'all .18s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
                  >
                    Weiter zu Budget & Reichweite →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
          {['🔒 Deine Daten bleiben bei uns', '⚡ Bereit in 15 Sekunden', '🇨🇭 Nur Schweizer Medien'].map(t => (
            <span key={t} style={{ fontSize: '12px', color: C.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {t}
            </span>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.8; }
        }
      `}</style>

      {dropdownOpen && hasResults && dropdownPos && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(44,44,62,.12)',
          maxHeight: '380px',
          overflowY: 'scroll',
          zIndex: 99999,
        }}>
          {searchResults.schweiz.length > 0 && (
            <div>
              <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Schweiz</div>
              {searchResults.schweiz.map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
            </div>
          )}
          {searchResults.kantone.length > 0 && (
            <div>
              <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Kantone</div>
              {searchResults.kantone.map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
            </div>
          )}
          {searchResults.staedte.length > 0 && (
            <div>
              <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Städte & Gemeinden</div>
              {searchResults.staedte.map(r => <RegionRow key={r.name} r={r} onSelect={addRegion} />)}
            </div>
          )}
        </div>,
        document.body
      )}
    </section>
  );
}
