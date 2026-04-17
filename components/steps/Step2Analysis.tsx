'use client';

import { useEffect, useRef, useState } from 'react';
import { BriefingData } from '@/lib/types';

const C = {
  primary: '#6B4FBB',
  pl: '#EDE8FF',
  pd: '#8B6FD4',
  taupe: '#1A1430',
  muted: '#7A7596',
  border: 'rgba(107,79,187,0.12)',
  bg: '#FDFCFF',
  white: '#FFFFFF',
} as const;

const page: React.CSSProperties = {
  maxWidth: '860px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const card: React.CSSProperties = {
  background: C.white,
  borderRadius: '20px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(107,79,187,0.06)',
  padding: '24px 28px',
  marginBottom: '14px',
};

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

interface AnalysisStep {
  icon: string;
  label: string;
  sub: string;
}

const STEPS: AnalysisStep[] = [
  { icon: '', label: 'Website gelesen', sub: '' },
  { icon: '', label: 'Thema & Kontext erkannt', sub: 'KI analysiert Inhalte...' },
  { icon: '', label: 'Zielgruppe wird bestimmt', sub: 'KI gleicht mit Schweizer Daten ab...' },
  { icon: '', label: 'Potenzial berechnen', sub: 'BFS-Bevölkerungsdaten werden geladen' },
];

function Step2Analysis({ briefing, updateBriefing, nextStep, isActive }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = () => {
    abortRef.current?.abort();
    updateBriefing({ analysis: null });
    nextStep();
  };

  useEffect(() => {
    if (!isActive) return;
    let i = 0;
    const interval = setInterval(() => { i += 1; setStepIndex(i); }, 1200);
    const cancelTimer = setTimeout(() => setShowCancel(true), 8000);

    const analyze = async () => {
      abortRef.current = new AbortController();
      try {
        const res = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: briefing.url, campaignType: briefing.campaignType }),
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        const waitForSteps = () => new Promise<void>(resolve => {
          const check = setInterval(() => { if (i >= 3) { clearInterval(check); resolve(); } }, 100);
        });
        await waitForSteps();
        clearInterval(interval);
        clearTimeout(cancelTimer);
        setStepIndex(4);
        await new Promise(r => setTimeout(r, 600));
        console.log('Step2 saving:', JSON.stringify(data?.headlines), JSON.stringify(data?.themeColor));
        updateBriefing({ analysis: data });
        nextStep();
      } catch (e: unknown) {
        clearInterval(interval);
        clearTimeout(cancelTimer);
        if (e instanceof Error && e.name === 'AbortError') return;
        setError('Analyse fehlgeschlagen. Bitte versuche es erneut.');
      }
    };

    analyze();
    return () => { clearInterval(interval); clearTimeout(cancelTimer); abortRef.current?.abort(); };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.min(((stepIndex + 1) / STEPS.length) * 100, 100);
  const domain = briefing.url ? briefing.url.replace(/^https?:\/\//, '').split('/')[0] : 'deine-website.ch';

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 2
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Einen Moment bitte.
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Wir lesen deine Website. Das dauert weniger als ein Espresso.
        </p>

        {/* Analysis card */}
        <div style={card}>
          {/* Progress bar */}
          <div style={{ background: C.border, borderRadius: '100px', height: '3px', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: `linear-gradient(90deg,${C.primary},${C.pd})`, borderRadius: '100px', width: `${progress}%`, transition: 'width .6s' }} />
          </div>

          {/* Steps */}
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '13px 0',
                  borderBottom: i < STEPS.length - 1 ? `1px solid ${C.border}` : 'none',
                  opacity: done || active ? 1 : 0.28,
                  transition: 'opacity .4s',
                }}
              >
                <div
                  style={{
                    width: '33px',
                    height: '33px',
                    borderRadius: '50%',
                    background: done ? '#EBF7F2' : active ? C.pl : C.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0,
                    animation: active ? 'pulse 1.2s infinite' : 'none',
                  }}
                >
                  {done ? '✓' : step.icon}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: C.taupe }}>{step.label}</div>
                  <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                    {i === 0 ? `${domain}` : step.sub}
                  </div>
                </div>
              </div>
            );
          })}

          {error && (
            <div style={{ paddingTop: '16px' }}>
              <p style={{ color: C.primary, fontSize: '14px', marginBottom: '8px' }}>{error}</p>
              <button
                onClick={handleCancel}
                style={{ fontSize: '13px', color: C.muted, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Zielgruppe manuell eingeben
              </button>
            </div>
          )}

          {showCancel && !error && (
            <div style={{ paddingTop: '16px' }}>
              <button
                onClick={handleCancel}
                style={{ fontSize: '12px', color: C.muted, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Analyse überspringen → Zielgruppe manuell eingeben
              </button>
            </div>
          )}
        </div>

        {/* ibox */}
        <div style={{ background: C.taupe, borderRadius: '20px', padding: '24px 28px', marginTop: '14px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '19px', color: '#fff', fontWeight: 400, marginBottom: '8px' }}>
            Was passiert gerade?
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: '10px' }}>
            Unsere KI liest deine Website wie ein erfahrener Mediaplaner – und übersetzt den Inhalt in eine präzise Zielgruppe. Automatisch, ohne Fragebogen.
          </p>
          {[
            'Firecrawl liest den vollständigen Websiteinhalt',
            'KI erkennt Thema, Ton, Region und Zielgruppe',
            'BFS-Zahlen ergeben das erreichbare Potenzial',
          ].map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: '5px' }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)' }}>{pt}</span>
            </div>
          ))}
        </div>

        <style>{`@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.1);}}`}</style>
      </div>
    </section>
  );
}

export default Step2Analysis;
