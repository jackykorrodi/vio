'use client';

import { useState, useRef } from 'react';
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

// ── Region data ───────────────────────────────────────────────────────────────

interface Region { name: string; type: 'schweiz' | 'kanton' | 'stadt'; stimm: number; }

const SCHWEIZ: Region[] = [
  { name: 'Gesamte Schweiz', type: 'schweiz', stimm: 5571000 },
];
const KANTONE: Region[] = [
  { name: 'Zürich',          type: 'kanton', stimm: 1077300 },
  { name: 'Bern',            type: 'kanton', stimm: 735000 },
  { name: 'Luzern',          type: 'kanton', stimm: 299600 },
  { name: 'Uri',             type: 'kanton', stimm: 25900 },
  { name: 'Schwyz',          type: 'kanton', stimm: 116200 },
  { name: 'Obwalden',        type: 'kanton', stimm: 27300 },
  { name: 'Nidwalden',       type: 'kanton', stimm: 30800 },
  { name: 'Glarus',          type: 'kanton', stimm: 28700 },
  { name: 'Zug',             type: 'kanton', stimm: 91700 },
  { name: 'Freiburg',        type: 'kanton', stimm: 235900 },
  { name: 'Solothurn',       type: 'kanton', stimm: 198100 },
  { name: 'Basel-Stadt',     type: 'kanton', stimm: 128100 },
  { name: 'Basel-Landschaft',type: 'kanton', stimm: 199400 },
  { name: 'Schaffhausen',    type: 'kanton', stimm: 57200 },
  { name: 'Appenzell A.Rh.', type: 'kanton', stimm: 40800 },
  { name: 'Appenzell I.Rh.', type: 'kanton', stimm: 11500 },
  { name: 'St. Gallen',      type: 'kanton', stimm: 340900 },
  { name: 'Graubünden',      type: 'kanton', stimm: 138900 },
  { name: 'Aargau',          type: 'kanton', stimm: 453400 },
  { name: 'Thurgau',         type: 'kanton', stimm: 185700 },
  { name: 'Tessin',          type: 'kanton', stimm: 249600 },
  { name: 'Waadt',           type: 'kanton', stimm: 516900 },
  { name: 'Wallis',          type: 'kanton', stimm: 215200 },
  { name: 'Neuenburg',       type: 'kanton', stimm: 119800 },
  { name: 'Genf',            type: 'kanton', stimm: 330000 },
  { name: 'Jura',            type: 'kanton', stimm: 52800 },
];
const STAEDTE: Region[] = [
  { name: 'Zürich (Stadt)',    type: 'stadt', stimm: 310000 },
  { name: 'Genf (Stadt)',      type: 'stadt', stimm: 152000 },
  { name: 'Basel (Stadt)',     type: 'stadt', stimm: 128000 },
  { name: 'Bern (Stadt)',      type: 'stadt', stimm: 112000 },
  { name: 'Lausanne',          type: 'stadt', stimm: 94000 },
  { name: 'Winterthur',        type: 'stadt', stimm: 85000 },
  { name: 'Luzern (Stadt)',    type: 'stadt', stimm: 65000 },
  { name: 'St. Gallen (Stadt)',type: 'stadt', stimm: 56000 },
  { name: 'Lugano',            type: 'stadt', stimm: 48000 },
  { name: 'Biel/Bienne',       type: 'stadt', stimm: 45000 },
  { name: 'Thun',              type: 'stadt', stimm: 38000 },
  { name: 'Köniz',             type: 'stadt', stimm: 31000 },
  { name: 'La Chaux-de-Fonds', type: 'stadt', stimm: 30000 },
  { name: 'Schaffhausen (Stadt)', type: 'stadt', stimm: 28000 },
  { name: 'Fribourg (Stadt)',  type: 'stadt', stimm: 25000 },
  { name: 'Chur',              type: 'stadt', stimm: 23000 },
  { name: 'Vernier',           type: 'stadt', stimm: 22000 },
  { name: 'Uster',             type: 'stadt', stimm: 21000 },
  { name: 'Sion',              type: 'stadt', stimm: 20000 },
  { name: 'Emmen',             type: 'stadt', stimm: 19000 },
];
const ALL_REGIONS: Region[] = [...SCHWEIZ, ...KANTONE, ...STAEDTE];

// ── Helper functions ──────────────────────────────────────────────────────────

function calcDaysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function calcPotenzial(stimm: number, days: number) {
  const erreichbar = Math.round(stimm * 0.35);
  const rawBudget = (erreichbar * 3 * 32) / 1000;
  const rounded = Math.round(rawBudget / 500) * 500;
  const budget = Math.min(50000, Math.max(2500, rounded));
  const laufzeit = days > 28 ? 4 : days >= 14 ? 2 : 1;
  return { erreichbar, budget, laufzeit };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCHF(n: number): string {
  return `CHF ${n.toLocaleString('de-CH')}`;
}

// ── Analysis steps ────────────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  { icon: '🔍', label: 'Website gelesen', getSub: (domain: string) => domain },
  { icon: '🧠', label: 'Thema & Kontext erkannt', getSub: () => 'KI analysiert Inhalte...' },
  { icon: '🎯', label: 'Zielgruppe bestimmt', getSub: () => 'KI gleicht mit Schweizer Daten ab...' },
  { icon: '📊', label: 'Potenzial berechnet', getSub: () => 'BFS-Bevölkerungsdaten werden geladen' },
];

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
  const [region, setRegion] = useState<Region | null>(null);
  const [regionQuery, setRegionQuery] = useState(briefing.politikRegion || '');
  const [regionOpen, setRegionOpen] = useState(false);
  const [votingDate, setVotingDate] = useState(briefing.votingDate || '');
  const [kampagnenTyp, setKampagnenTyp] = useState<'ja' | 'nein' | 'kandidat' | 'event' | null>(briefing.politikType || null);

  const campaignType = briefing.campaignType;
  const accordionOpen = !!campaignType;

  const progress = Math.min(((analysisStepIdx + 1) / ANALYSIS_STEPS.length) * 100, 100);
  const domain = url.replace(/^https?:\/\//, '').split('/')[0] || 'deine-website.ch';

  const filteredRegions = regionQuery.trim()
    ? ALL_REGIONS.filter(r => r.name.toLowerCase().includes(regionQuery.toLowerCase()))
    : ALL_REGIONS;

  // Politik potenzial calc
  const politikReady = !!(region && votingDate && kampagnenTyp);
  const daysUntilVoting = votingDate ? calcDaysUntil(votingDate) : 0;
  const potenzial = region ? calcPotenzial(region.stimm, daysUntilVoting) : null;

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

  const handlePolitikWeiter = () => {
    if (!region || !votingDate || !kampagnenTyp) return;
    const days = calcDaysUntil(votingDate);
    const { budget, laufzeit } = calcPotenzial(region.stimm, days);
    updateBriefing({
      politikRegion: region.name,
      politikRegionType: region.type === 'schweiz' ? 'schweiz' : region.type === 'kanton' ? 'kanton' : 'stadt',
      stimmberechtigte: region.stimm,
      votingDate,
      daysUntil: days,
      politikType: kampagnenTyp,
      recommendedBudget: budget,
      recommendedLaufzeit: laufzeit,
    });
    onPolitikDone();
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
            maxHeight: accordionOpen ? '600px' : '0px',
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

          {/* Politik content */}
          {campaignType === 'politik' && (
            <div style={{ paddingTop: '4px' }}>
              <div style={card}>

                {/* Region dropdown */}
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <div style={clabel}>Region / Wahlkreis</div>
                  <input
                    type="text"
                    value={regionQuery}
                    placeholder="Kanton, Stadt oder Schweiz suchen..."
                    onChange={e => { setRegionQuery(e.target.value); setRegionOpen(true); setRegion(null); }}
                    onFocus={() => setRegionOpen(true)}
                    onBlur={() => setTimeout(() => setRegionOpen(false), 200)}
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
                    }}
                  />
                  {regionOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0, right: 0,
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(44,44,62,.12)',
                      maxHeight: '240px',
                      overflowY: 'auto',
                      zIndex: 100,
                    }}>
                      {(['schweiz', 'kanton', 'stadt'] as const).map(groupType => {
                        const groupLabel = groupType === 'schweiz' ? 'Schweiz' : groupType === 'kanton' ? 'Kantone' : 'Städte';
                        const items = filteredRegions.filter(r => r.type === groupType);
                        if (items.length === 0) return null;
                        return (
                          <div key={groupType}>
                            <div style={{
                              padding: '8px 14px 4px',
                              fontSize: '10px', fontWeight: 700, letterSpacing: '.1em',
                              color: C.muted, textTransform: 'uppercase',
                            }}>
                              {groupLabel}
                            </div>
                            {items.map(r => (
                              <div
                                key={r.name}
                                onMouseDown={() => { setRegion(r); setRegionQuery(r.name); setRegionOpen(false); }}
                                style={{
                                  padding: '10px 14px',
                                  fontSize: '14px', color: C.taupe,
                                  cursor: 'pointer',
                                  transition: 'background .15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                {r.name}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Date picker */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={clabel}>Abstimmungs- oder Wahltag</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="date"
                      min={todayStr()}
                      value={votingDate}
                      onChange={e => setVotingDate(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: `1.5px solid ${C.border}`,
                        fontSize: '15px',
                        fontFamily: 'var(--font-outfit), sans-serif',
                        color: C.taupe,
                        backgroundColor: C.white,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    />
                    {votingDate && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '6px 14px',
                        borderRadius: '100px',
                        backgroundColor: '#F9EDEA',
                        color: '#B3502A',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}>
                        Noch {calcDaysUntil(votingDate)} Tage
                      </span>
                    )}
                  </div>
                </div>

                {/* Kampagnentyp */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={clabel}>Kampagnentyp</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { value: 'ja' as const, ico: '✅', name: 'JA-Kampagne' },
                      { value: 'nein' as const, ico: '❌', name: 'NEIN-Kampagne' },
                      { value: 'kandidat' as const, ico: '🙋', name: 'Kandidatenwahl' },
                      { value: 'event' as const, ico: '📣', name: 'Event & Mobilisierung' },
                    ].map(opt => {
                      const active = kampagnenTyp === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => setKampagnenTyp(opt.value)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: `2px solid ${active ? C.primary : C.border}`,
                            background: active ? C.pl : C.bg,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all .2s',
                          }}
                        >
                          <span style={{ fontSize: '18px' }}>{opt.ico}</span>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: C.taupe }}>{opt.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Potenzialberechnung */}
                {politikReady && potenzial && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '10px', marginBottom: '12px',
                    }}>
                      {[
                        { label: 'Stimmberechtigte', value: region!.stimm.toLocaleString('de-CH') },
                        { label: 'Erreichbare Personen', value: potenzial.erreichbar.toLocaleString('de-CH') },
                        { label: 'Empf. Budget', value: formatCHF(potenzial.budget) },
                        { label: 'Empf. Laufzeit', value: `${potenzial.laufzeit}W` },
                      ].map(stat => (
                        <div
                          key={stat.label}
                          style={{
                            background: C.pl,
                            borderRadius: '10px',
                            padding: '14px 16px',
                            border: `1px solid rgba(193,102,107,.15)`,
                          }}
                        >
                          <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                            {stat.label}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: C.taupe }}>
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
                      Diese Werte werden als Voreinstellung für Budget und Laufzeit übernommen.
                    </p>
                  </div>
                )}

                {/* Weiter button */}
                {politikReady && (
                  <button
                    type="button"
                    onClick={handlePolitikWeiter}
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
                    Weiter →
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
    </section>
  );
}
