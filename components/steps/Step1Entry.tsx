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
  console.log('Step1Entry props:', { onPolitikDone: typeof onPolitikDone, onAnalysisDone: typeof onAnalysisDone });
  const [url, setUrl] = useState(briefing.url?.replace(/^https:\/\//, '').replace(/^www\./, '') || '');
  const [phase, setPhase] = useState<'idle' | 'analyzing'>('idle');
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);
  const [analysisError, setAnalysisError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const abortRef = useRef<AbortController | null>(null);


  const campaignType = briefing.campaignType;
  const accordionOpen = !!campaignType;

  const progress = Math.min(((analysisStepIdx + 1) / ANALYSIS_STEPS.length) * 100, 100);
  const domain = url.replace(/^https?:\/\//, '').split('/')[0] || 'deine-website.ch';

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
            maxHeight: accordionOpen ? '1200px' : '0px',
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

          {/* Politik content — region/date details handled in Step 2 */}
          {campaignType === 'politik' && (
            <div style={{ paddingTop: '4px' }}>
              <div style={card}>
                <p style={{ fontSize: '14px', color: C.muted, marginBottom: '20px', lineHeight: 1.6 }}>
                  Im nächsten Schritt wählst du deine Zielregion(en), das Abstimmungsdatum und den Kampagnentyp.
                </p>
                <button
                  type="button"
                  onClick={() => { console.log('Politik button clicked, onPolitikDone:', typeof onPolitikDone); onPolitikDone(); }}
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
                  Weiter zu Schritt 2 →
                </button>
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
