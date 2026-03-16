'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { initialBriefing, BriefingData } from '@/lib/types';
import Step1Entry from '@/components/steps/Step1Entry';
import Step2Analysis from '@/components/steps/Step2Analysis';
import Step2Politik from '@/components/steps/Step2Politik';
import Step3Audience from '@/components/steps/Step3Audience';
import Step4Budget from '@/components/steps/Step4Budget';
import Step5Creative from '@/components/steps/Step5Creative';
import Step5AdCreator from '@/components/steps/Step5AdCreator';
import Step6Contact from '@/components/steps/Step6Contact';
import Step7Confirmation from '@/components/steps/Step7Confirmation';
import Step8Dashboard from '@/components/steps/Step8Dashboard';

const C = {
  primary: '#C1666B',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
} as const;

export default function CampaignFlow() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url') || '';
  const resumeParam = searchParams.get('resume') || '';

  const [currentStep, setCurrentStep] = useState(1);
  // Sub-phase for step 5: 'creative' shows option cards, 'adcreator' shows the Ad Creator preview
  const [step5Phase, setStep5Phase] = useState<'creative' | 'adcreator'>('creative');
  const [briefing, setBriefing] = useState<BriefingData>({
    ...initialBriefing,
    url: urlParam,
  });
  const [analysisRunKey, setAnalysisRunKey] = useState(0);
  const [resumeLoaded, setResumeLoaded] = useState(false);

  const updateBriefing = useCallback((data: Partial<BriefingData>) => {
    setBriefing(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = () => setCurrentStep(prev => prev + 1);

  // Steps 2 and 3 both go back to step 1.
  // Step 4 in politik goes back to step 2 (skipping step 3).
  // Step 5 adcreator phase goes back to the creative selection phase.
  const prevStep = () => {
    if (currentStep === 5 && step5Phase === 'adcreator') {
      setStep5Phase('creative');
      return;
    }
    if (currentStep === 4 && briefing.campaignType === 'politik') {
      setCurrentStep(2);
      return;
    }
    setCurrentStep(prev => (prev === 2 || prev === 3) ? 1 : prev - 1);
  };

  // Reset full flow when user submits a new URL from step 1.
  const onRestart = (url: string) => {
    setBriefing(prev => ({ ...initialBriefing, url, campaignType: prev.campaignType }));
    setAnalysisRunKey(k => k + 1);
    setStep5Phase('creative');
    setCurrentStep(2);
  };

  // Restore session from ?resume= param (base64 encoded partial BriefingData)
  useEffect(() => {
    if (!resumeParam) return;
    try {
      const decoded = JSON.parse(atob(resumeParam)) as Partial<BriefingData>;
      setBriefing(prev => ({ ...prev, ...decoded }));
      setCurrentStep(5);
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
    <main style={{ minHeight: '100vh', backgroundColor: C.bg }}>

      {/* ── Nav bar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: '#fff', borderBottom: `1px solid ${C.border}`,
        height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 28px',
        boxShadow: '0 1px 4px rgba(44,44,62,.07)',
      }}>
        <a
          href="/"
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '26px', fontWeight: 600, color: C.primary,
            textDecoration: 'none',
          }}
        >
          VIO
        </a>

        {/* Step indicator — completed steps are clickable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((step, i) => {
            const done = step < currentStep;
            const active = step === currentStep;
            const future = step > currentStep;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{
                    width: '16px', height: '1.5px',
                    background: done ? C.primary : C.border,
                    flexShrink: 0, margin: '0 1px',
                    transition: 'background .3s',
                  }} />
                )}
                <button
                  type="button"
                  onClick={() => { if (done) setCurrentStep(step); }}
                  title={done ? `Zurück zu Schritt ${step}` : undefined}
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: '50%', border: 'none', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: active ? C.primary : done ? C.primary : C.border,
                    opacity: future ? 0.4 : done ? 0.75 : 1,
                    cursor: done ? 'pointer' : 'default',
                    transition: 'all .25s',
                    flexShrink: 0,
                    fontSize: '11px', fontWeight: 700,
                    color: (active || done) ? '#fff' : C.muted,
                    fontFamily: 'var(--font-outfit), sans-serif',
                    outline: 'none',
                  }}
                  onMouseEnter={e => { if (done) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; } }}
                  onMouseLeave={e => { if (done) { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.transform = 'none'; } }}
                >
                  {done ? '✓' : step}
                </button>
              </div>
            );
          })}
          <span style={{ fontSize: '12px', color: C.muted, fontWeight: 500, marginLeft: '8px' }}>
            Schritt {currentStep}/8
          </span>
        </div>
      </nav>

      {/* ── Back button (steps 2–6, not on the confirmation screen) ── */}
      {currentStep >= 2 && currentStep <= 6 && (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 20px 0' }}>
          <button
            onClick={prevStep}
            style={{
              background: 'none', border: 'none', padding: '4px 0',
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '13px', color: C.muted,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
              transition: 'color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.primary; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}
          >
            ← Zurück
          </button>
        </div>
      )}

      {/* ── Welcome-back banner (resume flow) ── */}
      {resumeLoaded && (
        <div style={{
          maxWidth: '720px', margin: '12px auto 0', padding: '0 20px',
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
          nextStep={nextStep}
          onRestart={onRestart}
          isActive
          isCompleted={false}
        />
      )}

      {currentStep === 2 && briefing.campaignType === 'politik' && (
        <Step2Politik
          briefing={briefing}
          updateBriefing={updateBriefing}
          onComplete={() => setCurrentStep(4)}
          isActive
        />
      )}

      {currentStep === 2 && briefing.campaignType !== 'politik' && (
        <Step2Analysis
          key={analysisRunKey}
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
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
