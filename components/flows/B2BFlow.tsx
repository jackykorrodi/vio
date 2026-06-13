'use client';

import { useState, useCallback, useEffect } from 'react';
import { initialBriefing, BriefingData } from '@/lib/types';
import Step1B2B from '@/components/steps/Step1B2B';
import Step4Budget from '@/components/steps/Step4Budget';
import Step5Creative from '@/components/steps/Step5Creative';
import Step5AdCreator from '@/components/steps/Step5AdCreator';
import Step6Contact from '@/components/steps/Step6Contact';
import Step7Confirmation from '@/components/steps/Step7Confirmation';
import Step8Dashboard from '@/components/steps/Step8Dashboard';

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Zielgruppe', 'Budget', 'Werbemittel', 'Abschluss', 'Bestätigung'];

const C = {
  primary: '#6B4FBB',
  muted:   '#7A7596',
  border:  'rgba(107,79,187,0.14)',
  bg:      '#F4F2F9',
  surface: '#FFFFFF',
  paper:   '#FFFEFB',
  ink:     '#2D1F52',
} as const;

interface Props {
  initialUrl?: string;
  resumeData?: Partial<BriefingData> & { _targetStep?: number };
}

export default function B2BFlow({ resumeData }: Props) {
  const { _targetStep, ...resumeRest } = resumeData ?? {};

  const [currentStep, setCurrentStep] = useState(_targetStep ?? 1);
  const [step5Phase, setStep5Phase] = useState<'creative' | 'adcreator'>('creative');
  const [resumeLoaded] = useState(!!resumeData);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    setShowLabels(window.innerWidth >= 640);
  }, []);

  const [briefing, setBriefing] = useState<BriefingData>({
    ...initialBriefing,
    campaignType: 'b2b',
    ...resumeRest,
  });

  const updateBriefing = useCallback((data: Partial<BriefingData>) => {
    setBriefing(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = () => setCurrentStep(prev => prev + 1);

  const prevStep = () => {
    if (currentStep === 3 && step5Phase === 'adcreator') { setStep5Phase('creative'); return; }
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Generate sessionId when entering Werbemittel (step 3)
  useEffect(() => {
    if (currentStep === 3 && !briefing.sessionId) {
      updateBriefing({ sessionId: crypto.randomUUID() });
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const displayStep = Math.min(currentStep, TOTAL_STEPS);
  const STEPS = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: C.bg, position: 'relative' }}>

      {/* ── Animation styles ── */}
      <style>{`
        @keyframes b2b-drift-a { 0%,100%{transform:translate(-50%,-50%) translate(0,0)} 33%{transform:translate(-50%,-50%) translate(40px,-30px)} 66%{transform:translate(-50%,-50%) translate(-20px,50px)} }
        @keyframes b2b-drift-b { 0%,100%{transform:translate(-50%,-50%) translate(0,0)} 40%{transform:translate(-50%,-50%) translate(-50px,40px)} 75%{transform:translate(-50%,-50%) translate(30px,-40px)} }
        @keyframes b2b-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.22)} }
        @keyframes b2b-rise    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes b2b-settle  { 0%{transform:scale(.965)} 55%{transform:scale(1.012)} 100%{transform:scale(1)} }
        .b2b-brand-dot { color:#6B4FBB; display:inline-block; animation:b2b-breathe 4s ease-in-out infinite; }
        .b2b-rv  { opacity:0; animation:b2b-rise .55s cubic-bezier(.22,.8,.3,1) forwards; animation-delay:calc(var(--i,0)*70ms); }
        .b2b-settle { animation:b2b-settle .28s ease forwards; }
        .b2b-aura { pointer-events:none; position:fixed; border-radius:50%; filter:blur(100px); z-index:0; }
        @media (prefers-reduced-motion:reduce) {
          .b2b-brand-dot,.b2b-aura,.b2b-settle { animation:none !important; }
          .b2b-rv { animation:none !important; opacity:1; }
        }
      `}</style>

      {/* ── Aura ── */}
      <div className="b2b-aura" style={{ width: '560px', height: '560px', left: '12%', top: '18%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(107,79,187,0.15), transparent 70%)', animation: 'b2b-drift-a 26s ease-in-out infinite' }} />
      <div className="b2b-aura" style={{ width: '480px', height: '480px', left: '78%', top: '55%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(107,79,187,0.11), transparent 70%)', animation: 'b2b-drift-b 32s ease-in-out infinite' }} />

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(244,242,249,.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`, minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: showLabels ? '8px 28px' : '0 28px' }}>
        <a href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: C.ink, textDecoration: 'none', letterSpacing: '-.02em' }}>VIO<span className="b2b-brand-dot">.</span></a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {STEPS.map((step, i) => {
            const done   = displayStep > step;
            const active = displayStep === step;
            const future = displayStep < step;
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <div style={{ width: '14px', height: '2px', borderRadius: '2px', background: done ? C.primary : 'rgba(107,79,187,0.15)', flexShrink: 0, margin: '0 1px', transition: 'background .3s' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <button type="button"
                    onClick={() => { if (done) setCurrentStep(step); }}
                    style={{ width: active ? '28px' : '22px', height: active ? '28px' : '22px', borderRadius: '50%', border: 'none', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.primary : done ? 'rgba(107,79,187,0.20)' : 'rgba(107,79,187,0.08)', opacity: future ? 0.45 : 1, cursor: done ? 'pointer' : 'default', transition: 'all .25s', flexShrink: 0, fontSize: active ? '12px' : '10px', fontWeight: 700, color: active ? '#fff' : done ? C.primary : C.muted, fontFamily: 'var(--font-display)', outline: 'none' }}
                    onMouseEnter={e => { if (done) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.color = '#fff'; } }}
                    onMouseLeave={e => { if (done) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.backgroundColor = 'rgba(107,79,187,0.20)'; e.currentTarget.style.color = C.primary; } }}
                  >
                    {done ? '✓' : step}
                  </button>
                  {showLabels && (
                    <span style={{ fontSize: '9px', fontWeight: active ? 700 : 500, color: active ? C.primary : C.muted, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', opacity: future ? 0.45 : 1, letterSpacing: '.02em' }}>
                      {STEP_LABELS[i]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: C.muted, fontWeight: 500, marginLeft: '10px' }}>{displayStep}/{TOTAL_STEPS}</span>
        </div>
      </nav>

      {/* ── Back button ── */}
      {currentStep >= 2 && currentStep <= TOTAL_STEPS - 1 && (
        <div style={{ maxWidth: '1060px', margin: '0 auto', padding: '18px 24px 0', position: 'relative', zIndex: 1 }}>
          <button onClick={prevStep} style={{ background: 'none', border: 'none', padding: '6px 0', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: C.primary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'opacity .15s' }} onMouseEnter={e => { e.currentTarget.style.opacity = '.65'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
            ← Zurück
          </button>
        </div>
      )}

      {/* ── Resume banner ── */}
      {resumeLoaded && (
        <div style={{ maxWidth: '860px', margin: '12px auto 0', padding: '0 20px' }}>
          <div style={{ background: '#E8F5F2', border: '1px solid #2A7F7F', borderRadius: '10px', padding: '12px 18px', fontSize: '13px', color: '#2A7F7F', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> Willkommen zurück – dein letzter Stand wurde geladen.
          </div>
        </div>
      )}

      {/* ── Step 1: Zielgruppe ── */}
      {currentStep === 1 && (
        <Step1B2B briefing={briefing} updateBriefing={updateBriefing} onComplete={nextStep} isActive />
      )}

      {/* ── Step 2: Budget & Reichweite ── */}
      {currentStep === 2 && (
        <Step4Budget briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive stepNumber={2} />
      )}

      {/* ── Step 3: Werbemittel ── */}
      {currentStep === 3 && step5Phase === 'creative' && (
        <Step5Creative briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} onUploadSelected={() => setStep5Phase('adcreator')} isActive stepNumber={3} />
      )}
      {currentStep === 3 && step5Phase === 'adcreator' && (
        <Step5AdCreator briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive />
      )}

      {/* ── Step 4: Abschluss ── */}
      {currentStep === 4 && (
        <Step6Contact briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} goToStep={setCurrentStep} isActive />
      )}

      {/* ── Step 5: Bestätigung ── */}
      {currentStep === 5 && (
        <Step7Confirmation briefing={briefing} nextStep={nextStep} stepNumber={5} />
      )}

      {/* ── Step 6: Dashboard (bonus) ── */}
      {currentStep === 6 && (
        <Step8Dashboard briefing={briefing} onBack={() => setCurrentStep(5)} onSubmitSuccess={() => setCurrentStep(5)} />
      )}

    </main>
  );
}
