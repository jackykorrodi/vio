'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { initialBriefing, BriefingData } from '@/lib/types';
import Step1Entry from '@/components/steps/Step1Entry';

import Step3Audience from '@/components/steps/Step3Audience';
import Step4Budget from '@/components/steps/Step4Budget';
import Step5Creative from '@/components/steps/Step5Creative';
import Step5AdCreator from '@/components/steps/Step5AdCreator';
import Step6Contact from '@/components/steps/Step6Contact';
import Step7Confirmation from '@/components/steps/Step7Confirmation';
import Step8Dashboard from '@/components/steps/Step8Dashboard';

const C = {
  primary: '#6B4FBB',
  muted: '#7A7596',
  border: 'rgba(107,79,187,0.12)',
  bg: '#FDFCFF',
} as const;

// Internal step numbers: 1=entry, 2=politik, 3=audience, 4=budget, 5=creative, 6=contact, 7=confirm, 8=dashboard
const INTERNAL_STEPS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CampaignFlow() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url') || '';
  const resumeParam = searchParams.get('resume') || '';
  const typeParam = searchParams.get('type') || '';

  const [currentStep, setCurrentStep] = useState(1);
  // Sub-phase for step 5: 'creative' shows option cards, 'adcreator' shows the Ad Creator preview
  const [step5Phase, setStep5Phase] = useState<'creative' | 'adcreator'>('creative');
  const [briefing, setBriefing] = useState<BriefingData>({
    ...initialBriefing,
    url: urlParam,
    campaignType: (typeParam as 'b2c' | 'b2b' | 'politik') || 'b2c',
  });
  const [resumeLoaded, setResumeLoaded] = useState(false);

  const updateBriefing = useCallback((data: Partial<BriefingData>) => {
    setBriefing(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = () => setCurrentStep(prev => prev + 1);

  const prevStep = () => {
    if (currentStep === 5 && step5Phase === 'adcreator') {
      setStep5Phase('creative');
      return;
    }
    if (currentStep === 3) { setCurrentStep(1); return; }
    if (currentStep === 2) { setCurrentStep(1); return; }
    if (currentStep === 4 && briefing.campaignType === 'politik') { setCurrentStep(1); return; }
    setCurrentStep(prev => prev - 1);
  };

  // Reset full flow when user submits a new URL from step 1.
  const onRestartBriefing = (url: string) => {
    setBriefing(prev => ({ ...initialBriefing, url, campaignType: prev.campaignType }));
    setStep5Phase('creative');
  };

  const onAnalysisDone = () => setCurrentStep(3);
  const onPolitikDone = () => setCurrentStep(4);

  // Restore politik prefill from homepage sessionStorage
  useEffect(() => {
    if (typeParam !== 'politik') return;
    try {
      const stored = sessionStorage.getItem('vio_politik_prefill');
      if (!stored) return;
      sessionStorage.removeItem('vio_politik_prefill');
      const data = JSON.parse(stored) as Partial<BriefingData>;
      setBriefing(prev => ({ ...prev, ...data }));
      if (data.selectedRegions?.length && data.votingDate && data.politikType) {
        setCurrentStep(4);
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore session from ?resume= param (base64 encoded partial BriefingData)
  useEffect(() => {
    if (!resumeParam) return;
    try {
      const decoded = JSON.parse(atob(resumeParam)) as Partial<BriefingData> & { _targetStep?: number };
      const { _targetStep, ...briefingData } = decoded;
      setBriefing(prev => ({ ...prev, ...briefingData }));
      setCurrentStep(_targetStep ?? 5);
      setResumeLoaded(true);
    } catch { /* ignore malformed resume param */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate sessionId the first time the user reaches Step 5
  useEffect(() => {
    if (currentStep === 5 && !briefing.sessionId) {
      updateBriefing({ sessionId: crypto.randomUUID() });
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on every step transition.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--off-white)', position: 'relative' }}>

      {/* ── Watercolor background blobs ─────────────────────────────────── */}
      {[
        { color: 'rgba(184,169,232,0.18)', size: 500, x: '10%',  y: '15%',  dur: 26, k: 'blob0' },
        { color: 'rgba(200,223,248,0.16)', size: 440, x: '75%',  y: '10%',  dur: 31, k: 'blob1' },
        { color: 'rgba(212,168,67,0.08)',  size: 320, x: '85%',  y: '65%',  dur: 28, k: 'blob3' },
        { color: 'rgba(184,169,232,0.14)', size: 380, x: '5%',   y: '70%',  dur: 24, k: 'blob4' },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'fixed',
          width: `${b.size}px`, height: `${b.size}px`,
          left: b.x, top: b.y,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
          filter: 'blur(88px)',
          animation: `${b.k} ${b.dur}s ease-in-out alternate infinite`,
          zIndex: 0, pointerEvents: 'none',
        }} />
      ))}

      {/* ── Nav bar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(253,252,255,.92)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.border}`,
        height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 28px',
      }}>
        <a href="/" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '24px', fontWeight: 800,
          color: C.primary, textDecoration: 'none', letterSpacing: '-.02em',
        }}>
          VIO
        </a>

        {/* Step indicator — violet dots + lines */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {INTERNAL_STEPS.map((internalStep, i) => {
            const displayStep = i + 1;
            const done = currentStep > internalStep;
            const active = currentStep === internalStep;
            const future = currentStep < internalStep;
            return (
              <div key={internalStep} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{
                    width: '14px', height: '2px', borderRadius: '2px',
                    background: done ? C.primary : 'rgba(107,79,187,0.15)',
                    flexShrink: 0, margin: '0 1px',
                    transition: 'background .3s',
                  }} />
                )}
                <button
                  type="button"
                  onClick={() => { if (done) setCurrentStep(internalStep); }}
                  title={done ? `Zurück zu Schritt ${displayStep}` : undefined}
                  style={{
                    width: active ? '28px' : '22px',
                    height: active ? '28px' : '22px',
                    borderRadius: '50%', border: 'none', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: active ? C.primary
                      : done ? 'rgba(107,79,187,0.20)'
                      : 'rgba(107,79,187,0.08)',
                    opacity: future ? 0.45 : 1,
                    cursor: done ? 'pointer' : 'default',
                    transition: 'all .25s',
                    flexShrink: 0,
                    fontSize: active ? '12px' : '10px', fontWeight: 700,
                    color: active ? '#fff' : done ? C.primary : C.muted,
                    fontFamily: 'var(--font-display)',
                    outline: 'none',
                  }}
                  onMouseEnter={e => { if (done) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={e => { if (done) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.backgroundColor = 'rgba(107,79,187,0.20)'; e.currentTarget.style.color = C.primary; } }}
                >
                  {done ? '✓' : displayStep}
                </button>
              </div>
            );
          })}
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px', color: C.muted, fontWeight: 500, marginLeft: '10px',
          }}>
            {Math.max(1, INTERNAL_STEPS.indexOf(currentStep) + 1)}/{INTERNAL_STEPS.length}
          </span>
        </div>
      </nav>

      {/* ── Back button (ghost, violet text) ── */}
      {currentStep >= 2 && currentStep <= 6 && (
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '18px 24px 0', position: 'relative', zIndex: 1 }}>
          <button
            onClick={prevStep}
            style={{
              background: 'none', border: 'none', padding: '6px 0',
              fontFamily: 'var(--font-display)',
              fontSize: '13px', fontWeight: 600, color: C.primary,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '.65'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            ← Zurück
          </button>
        </div>
      )}

      {/* ── Welcome-back banner (resume flow) ── */}
      {resumeLoaded && (
        <div style={{
          maxWidth: '860px', margin: '12px auto 0', padding: '0 20px',
        }}>
          <div style={{
            background: '#E8F5F2', border: '1px solid #2A7F7F',
            borderRadius: '10px', padding: '12px 18px',
            fontSize: '13px', color: '#2A7F7F', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span>✓</span>
            Willkommen zurück – dein letzter Stand wurde geladen.
          </div>
        </div>
      )}

      {/* ── Steps — simple conditional render, no framer-motion ── */}

      {currentStep === 1 && (
        <Step1Entry
          briefing={briefing}
          updateBriefing={updateBriefing}
          onAnalysisDone={onAnalysisDone}
          onPolitikDone={onPolitikDone}
          onRestartBriefing={onRestartBriefing}
          isActive
        />
      )}

      {currentStep === 3 && (
        <Step3Audience
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
          isActive
        />
      )}

      {currentStep === 4 && (
        <Step4Budget
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
          isActive
        />
      )}

      {currentStep === 5 && step5Phase === 'creative' && (
        <Step5Creative
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
          onUploadSelected={() => setStep5Phase('adcreator')}
          isActive
        />
      )}

      {currentStep === 5 && step5Phase === 'adcreator' && (
        <Step5AdCreator
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
          isActive
        />
      )}

      {currentStep === 6 && (
        <Step6Contact
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
          goToStep={setCurrentStep}
          isActive
        />
      )}

      {currentStep === 7 && (
        <Step7Confirmation briefing={briefing} nextStep={nextStep} />
      )}

      {currentStep === 8 && (
        <Step8Dashboard
          briefing={briefing}
          onBack={() => setCurrentStep(7)}
          onSubmitSuccess={() => setCurrentStep(7)}
        />
      )}

    </main>
  );
}
