'use client';

import { useState, useCallback, useEffect } from 'react';
import { initialBriefing, BriefingData } from '@/lib/types';
import Step2Analysis from '@/components/steps/Step2Analysis';
import Step3Audience from '@/components/steps/Step3Audience';
import Step4Budget from '@/components/steps/Step4Budget';
import Step5Creative from '@/components/steps/Step5Creative';
import Step5AdCreator from '@/components/steps/Step5AdCreator';
import Step6Contact from '@/components/steps/Step6Contact';
import Step7Confirmation from '@/components/steps/Step7Confirmation';
import Step8Dashboard from '@/components/steps/Step8Dashboard';

const TOTAL_STEPS = 7;
const STEP_LABELS = ['Website', 'Analyse', 'Zielgruppe', 'Budget', 'Werbemittel', 'Abschluss', 'Bestätigung'];

const C = {
  primary: '#6B4FBB',
  muted:   '#7A7596',
  border:  'rgba(107,79,187,0.12)',
  bg:      '#FDFCFF',
  ink:     '#2D1F52',
} as const;

interface Props {
  initialUrl?: string;
  resumeData?: Partial<BriefingData> & { _targetStep?: number };
}

export default function B2CFlow({ initialUrl = '', resumeData }: Props) {
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
    url: initialUrl,
    campaignType: 'b2c',
    ...resumeRest,
  });

  const updateBriefing = useCallback((data: Partial<BriefingData>) => {
    setBriefing(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = () => setCurrentStep(prev => prev + 1);

  const prevStep = () => {
    if (currentStep === 5 && step5Phase === 'adcreator') { setStep5Phase('creative'); return; }
    if (currentStep === 3) { setCurrentStep(1); return; } // skip re-running analysis
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  useEffect(() => {
    if (currentStep === 5 && !briefing.sessionId) {
      updateBriefing({ sessionId: crypto.randomUUID() });
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // URL entry (step 1)
  const [urlInput, setUrlInput] = useState(
    (initialUrl || briefing.url || '').replace(/^https?:\/\//, '').replace(/^www\./, '')
  );

  const handleAnalyzeStart = () => {
    let clean = urlInput.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (!clean) return;
    clean = 'https://' + clean;
    setBriefing({ ...initialBriefing, url: clean, campaignType: 'b2c' });
    setCurrentStep(2);
  };

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

      {/* ── Step 1: URL eingeben ── */}
      {currentStep === 1 && (
        <section style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' as const }}>Schritt 1 · B2C Kampagne</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.ink }}>
              Deine Website-URL
            </h1>
            <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
              Wir analysieren deine Website automatisch und schlagen eine passende Zielgruppe für Privatkunden vor.
            </p>
            <div style={{ background: '#fff', borderRadius: '20px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(107,79,187,0.06)', padding: '24px 28px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' as const, marginBottom: '10px' }}>Website-URL</div>
              <input
                type="url"
                value={urlInput}
                placeholder="https://deine-website.ch"
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyzeStart()}
                style={{ width: '100%', boxSizing: 'border-box' as const, padding: '12px 16px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '15px', fontFamily: 'var(--font-sans)', color: C.ink, backgroundColor: C.bg, outline: 'none', marginBottom: '14px' }}
              />
              <button
                type="button"
                onClick={handleAnalyzeStart}
                disabled={!urlInput.trim()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: urlInput.trim() ? C.primary : 'rgba(107,79,187,0.40)', color: '#fff', border: 'none', borderRadius: '100px', padding: '15px 32px', fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600, cursor: urlInput.trim() ? 'pointer' : 'not-allowed', boxShadow: urlInput.trim() ? '0 4px 16px rgba(107,79,187,0.30)' : 'none', transition: 'all .18s' }}
              >
                Analysieren und weiter →
              </button>
            </div>
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' as const, paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
              {['🔒 Deine Daten bleiben bei uns', '⚡ Bereit in 15 Sekunden', '🇨🇭 Nur Schweizer Medien'].map(t => (
                <span key={t} style={{ fontSize: '12px', color: C.muted, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Step 2: Analyse ── */}
      {currentStep === 2 && (
        <Step2Analysis briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive />
      )}

      {/* ── Step 3: Zielgruppe ── */}
      {currentStep === 3 && (
        <Step3Audience briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive />
      )}

      {/* ── Step 4: Budget & Reichweite ── */}
      {currentStep === 4 && (
        <Step4Budget briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive stepNumber={4} />
      )}

      {/* ── Step 5: Werbemittel ── */}
      {currentStep === 5 && step5Phase === 'creative' && (
        <Step5Creative briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} onUploadSelected={() => setStep5Phase('adcreator')} isActive stepNumber={5} />
      )}
      {currentStep === 5 && step5Phase === 'adcreator' && (
        <Step5AdCreator briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} isActive />
      )}

      {/* ── Step 6: Abschluss ── */}
      {currentStep === 6 && (
        <Step6Contact briefing={briefing} updateBriefing={updateBriefing} nextStep={nextStep} goToStep={setCurrentStep} isActive />
      )}

      {/* ── Step 7: Bestätigung ── */}
      {currentStep === 7 && (
        <Step7Confirmation briefing={briefing} nextStep={nextStep} stepNumber={7} />
      )}

      {/* ── Step 8: Dashboard (bonus, not in progress indicator) ── */}
      {currentStep === 8 && (
        <Step8Dashboard briefing={briefing} onBack={() => setCurrentStep(7)} onSubmitSuccess={() => setCurrentStep(7)} />
      )}

    </main>
  );
}
