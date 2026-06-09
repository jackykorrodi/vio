'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { initialBriefing, BriefingData } from '@/lib/types';
import SaveOverlay from '@/components/shared/SaveOverlay';
import Step2Politik from '@/components/steps/Step1Politik';
import Step2PolitikBudget from '@/components/campaign/StepPackages';
import StepSummaryPolitik from '@/components/campaign/StepSummaryPolitik';
import Step5Creative from '@/components/steps/Step5Creative';
import Step5AdCreator from '@/components/steps/Step5AdCreator';
import Step6Contact from '@/components/steps/Step6Contact';
import Step7Confirmation from '@/components/steps/Step7Confirmation';
import { resolveCampaign } from '@/lib/resolve-campaign';

// Politik flow: 6 display steps
// 1 = Region / Wahlkreis / Kampagnentyp (Step2Politik)
// 2 = Paket wählen (StepPackages)
// 3 = Übersicht / Budget anpassen (StepSummaryPolitik)
// 4 = Werbemittel (Step5Creative / Step5AdCreator)
// 5 = Abschluss (Step6Contact)
// 6 = Bestätigung (Step7Confirmation)

const TOTAL_STEPS = 6;
const STEP_LABELS = ['Region', 'Paket', 'Übersicht', 'Werbemittel', 'Abschluss', 'Bestätigung'];

const C = {
  primary: '#6B4FBB',
  muted:   '#7A7596',
  border:  'rgba(107,79,187,0.12)',
} as const;

const INACTIVITY_MS = 90_000;
const COOLDOWN_MS   = 300_000;

interface Props {
  resumeData?: Partial<BriefingData> & { _targetStep?: number };
  resumeId?:   string;
}

export default function PolitikFlow({ resumeData, resumeId }: Props) {
  const { _targetStep, ...resumeRest } = resumeData ?? {};

  const [currentStep, setCurrentStep] = useState(_targetStep ?? 1);
  const [step4Phase, setStep4Phase] = useState<'creative' | 'adcreator'>('creative');
  const [step1ResumeQ, setStep1ResumeQ] = useState<number>(1);
  const [resumeLoaded] = useState(!!resumeData);
  const [showLabels, setShowLabels] = useState(false);
  const [showSaveOverlay,      setShowSaveOverlay]      = useState(false);
  const [supabaseResumeLoaded, setSupabaseResumeLoaded] = useState(false);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManualCloseRef = useRef<number>(0);

  useEffect(() => {
    setShowLabels(window.innerWidth >= 640);
  }, []);

  const [briefing, setBriefing] = useState<BriefingData>({
    ...initialBriefing,
    campaignType: 'politik',
    ...resumeRest,
  });

  const updateBriefing = useCallback((data: Partial<BriefingData>) => {
    setBriefing(prev => ({ ...prev, ...data }));
  }, []);

  function handleOverlayClose() {
    lastManualCloseRef.current = Date.now();
    setShowSaveOverlay(false);
  }

  async function handleSave(email: string) {
    const rc = resolveCampaign(briefing);
    const res = await fetch('/api/save-progress', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        flow:            'politik',
        currentStep,
        selectedRegions: briefing.selectedRegions,
        votingDate:      briefing.votingDate,
        politikType:     briefing.politikType,
        selectedPackage: briefing.selectedPackage,
        budget:          rc.budget,
        laufzeit:        rc.laufzeitWeeks,
      }),
    });
    if (!res.ok) throw new Error('save failed');
    updateBriefing({ email });
  }

  const nextStep = () => {
    setCurrentStep(prev => {
      window.history.pushState({ step: prev + 1 }, '');
      return prev + 1;
    });
  };

  const prevStep = () => {
    if (currentStep === 4 && step4Phase === 'adcreator') { setStep4Phase('creative'); return; }
    if (currentStep === 2) setStep1ResumeQ(3);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Restore politik prefill from homepage sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('vio_politik_prefill');
      if (!stored) return;
      sessionStorage.removeItem('vio_politik_prefill');
      const data = JSON.parse(stored) as Partial<BriefingData>;
      setBriefing(prev => ({ ...prev, ...data }));
      // If all required Politik fields are present, skip to Budget (step 2)
      if (data.selectedRegions?.length && data.votingDate && data.politikType) {
        setCurrentStep(2);
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inaktivitäts-Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (currentStep < 2) return;

    function resetTimer() {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        if (Date.now() - lastManualCloseRef.current >= COOLDOWN_MS) {
          setShowSaveOverlay(true);
        }
      }, INACTIVITY_MS);
    }

    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown',   resetTimer);

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown',   resetTimer);
    };
  }, [currentStep]);

  // ── Supabase Resume-Fetch ───────────────────────────────────────────────────
  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;

    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('user_states')
          .select('state_data')
          .eq('id', resumeId)
          .single();
        if (cancelled || error || !data?.state_data) return;
        const restored = data.state_data as Partial<BriefingData> & { _targetStep?: number };
        const { _targetStep: step, ...rest } = restored;
        setBriefing(prev => ({ ...prev, ...rest }));
        if (step) setCurrentStep(step);
        setSupabaseResumeLoaded(true);
      } catch { /* Fetch-Fehler — Flow startet normal */ }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Browser-Back-Sync ───────────────────────────────────────────────────────
  useEffect(() => {
    function onPopState() {
      setCurrentStep(prev => {
        if (prev === 4 && step4Phase === 'adcreator') {
          setStep4Phase('creative');
          return prev;
        }
        return Math.max(1, prev - 1);
      });
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [step4Phase]);

  useEffect(() => {
    if (currentStep === 4 && !briefing.sessionId) {
      updateBriefing({ sessionId: crypto.randomUUID() });
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const displayStep = Math.min(currentStep, TOTAL_STEPS);
  const STEPS = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--off-white)', position: 'relative' }}>

      {/* ── Blobs ── */}
      {[
        { color: 'rgba(184,169,232,0.18)', size: 500, x: '10%', y: '15%' },
        { color: 'rgba(200,223,248,0.16)', size: 440, x: '75%', y: '10%' },
        { color: 'rgba(212,168,67,0.08)',  size: 320, x: '85%', y: '65%' },
        { color: 'rgba(184,169,232,0.14)', size: 380, x: '5%',  y: '70%' },
      ].map((b, i) => (
        <div key={i} style={{ position: 'fixed', width: `${b.size}px`, height: `${b.size}px`, left: b.x, top: b.y, transform: 'translate(-50%,-50%)', background: `radial-gradient(circle, ${b.color}, transparent 70%)`, filter: 'blur(88px)', zIndex: 0, pointerEvents: 'none' }} />
      ))}

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(253,252,255,.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`, minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: showLabels ? '8px 28px' : '0 28px' }}>
        <a href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: C.primary, textDecoration: 'none', letterSpacing: '-.02em' }}>VIO</a>
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
          {currentStep >= 2 && (
            <button
              type="button"
              onClick={() => setShowSaveOverlay(true)}
              title="Stand speichern"
              style={{ marginLeft: '14px', background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: C.primary, display: 'flex', alignItems: 'center', opacity: 0.75, transition: 'opacity .15s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
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

      {/* ── SaveOverlay ── */}
      {showSaveOverlay && (
        <SaveOverlay onSave={handleSave} onClose={handleOverlayClose} />
      )}

      {/* ── Resume banner (prop-based) ── */}
      {resumeLoaded && (
        <div style={{ maxWidth: '860px', margin: '12px auto 0', padding: '0 20px' }}>
          <div style={{ background: '#E8F5F2', border: '1px solid #2A7F7F', borderRadius: '10px', padding: '12px 18px', fontSize: '13px', color: '#2A7F7F', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> Willkommen zurück – dein letzter Stand wurde geladen.
          </div>
        </div>
      )}

      {/* ── Resume banner (Supabase) ── */}
      {supabaseResumeLoaded && (
        <div style={{ maxWidth: '860px', margin: '12px auto 0', padding: '0 20px' }}>
          <div style={{ background: '#E8F5F2', border: '1px solid #2A7F7F', borderRadius: '10px', padding: '12px 18px', fontSize: '13px', color: '#2A7F7F', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> Willkommen zurück – dein letzter Stand wurde geladen.
          </div>
        </div>
      )}

      {/* ── Step 1: Region / Wahlkreis / Kampagnentyp ── */}
      {currentStep === 1 && (
        <Step2Politik briefing={briefing} updateBriefing={updateBriefing} onComplete={() => { setStep1ResumeQ(1); nextStep(); }} isActive initialQ={step1ResumeQ} />
      )}

      {/* ── Step 2: Paket wählen ── */}
      {currentStep === 2 && (
        <Step2PolitikBudget
          key={briefing.selectedRegions?.map(r => r.name).join(',') + (briefing.votingDate ?? '')}
          briefing={briefing}
          updateBriefing={updateBriefing}
          nextStep={nextStep}
          isActive
          stepNumber={2}
        />
      )}

      {/* ── Step 3: Übersicht & Budget anpassen ── */}
      {currentStep === 3 && (
        <StepSummaryPolitik briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} prevStep={prevStep} isActive stepNumber={3} />
      )}

      {/* ── Step 4: Werbemittel ── */}
      {currentStep === 4 && step4Phase === 'creative' && (
        <Step5Creative briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} onUploadSelected={() => setStep4Phase('adcreator')} isActive stepNumber={4} />
      )}
      {currentStep === 4 && step4Phase === 'adcreator' && (
        <Step5AdCreator briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive />
      )}

      {/* ── Step 5: Abschluss ── */}
      {currentStep === 5 && (
        <Step6Contact briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} goToStep={(step) => setCurrentStep(Math.min(step, TOTAL_STEPS))} isActive />
      )}

      {/* ── Step 6: Bestätigung ── */}
      {currentStep === 6 && (
        <Step7Confirmation briefing={briefing} stepNumber={6} />
      )}

    </main>
  );
}
