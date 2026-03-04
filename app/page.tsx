'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initialBriefing, BriefingData } from '@/lib/types';
import Step1Entry from '@/components/steps/Step1Entry';
import Step2Analysis from '@/components/steps/Step2Analysis';
import Step3Audience from '@/components/steps/Step3Audience';
import Step4Budget from '@/components/steps/Step4Budget';
import Step5Creative from '@/components/steps/Step5Creative';
import Step6Contact from '@/components/steps/Step6Contact';
import Step7Confirmation from '@/components/steps/Step7Confirmation';

const STEP_LABELS: Record<number, string> = {
  1: 'Start',
  2: 'Analyse',
  3: 'Zielgruppe',
  4: 'Reichweite',
  5: 'Werbemittel',
  6: 'Abschluss',
  7: 'Bestätigung',
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [briefing, setBriefing] = useState<BriefingData>(initialBriefing);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const updateBriefing = (data: Partial<BriefingData>) => {
    setBriefing(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);

  // Called when user submits a (new) URL from Step 1 — resets the full flow
  const onRestart = (url: string) => {
    setBriefing(prev => ({ ...initialBriefing, url, campaignType: prev.campaignType }));
    setCurrentStep(2);
  };

  useEffect(() => {
    if (currentStep > 1) {
      const el = stepRefs.current[currentStep - 1];
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [currentStep]);

  const dotStyle = (step: number): React.CSSProperties => {
    if (step < currentStep) return { width: '28px', height: '3px', borderRadius: '2px', backgroundColor: '#C1666B', opacity: 0.4, transition: 'all .3s' };
    if (step === currentStep) return { width: '42px', height: '3px', borderRadius: '2px', backgroundColor: '#C1666B', transition: 'all .3s' };
    return { width: '28px', height: '3px', borderRadius: '2px', backgroundColor: '#EDE8E0', transition: 'all .3s' };
  };

  const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FAF7F2' }}>
      {/* Nav */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#fff',
          borderBottom: '1px solid #EDE8E0',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          boxShadow: '0 1px 4px rgba(44,44,62,.07)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '26px',
            fontWeight: 600,
            color: '#C1666B',
          }}
        >
          VIO
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5, 6].map(step => (
              <div key={step} style={dotStyle(step)} />
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#8A8490', fontWeight: 500, marginLeft: '8px' }}>
            Schritt {Math.min(currentStep, 7)} von 7
          </span>
        </div>
      </nav>

      {/* Steps */}
      <div>
        <div ref={el => { stepRefs.current[0] = el; }}>
          <Step1Entry
            briefing={briefing}
            updateBriefing={updateBriefing}
            nextStep={nextStep}
            onRestart={onRestart}
            isActive={currentStep === 1}
            isCompleted={currentStep > 1}
          />
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 2 && (
            <motion.div key="step2" ref={el => { stepRefs.current[1] = el; }} {...fadeIn} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
              <Step2Analysis
                briefing={briefing}
                updateBriefing={updateBriefing}
                nextStep={nextStep}
                isActive={currentStep === 2}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentStep === 3 && (
            <motion.div key="step3" ref={el => { stepRefs.current[2] = el; }} {...fadeIn} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
              <Step3Audience
                briefing={briefing}
                updateBriefing={updateBriefing}
                nextStep={nextStep}
                isActive={currentStep === 3}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentStep === 4 && (
            <motion.div key="step4" ref={el => { stepRefs.current[3] = el; }} {...fadeIn} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
              <Step4Budget
                briefing={briefing}
                updateBriefing={updateBriefing}
                nextStep={nextStep}
                isActive={currentStep === 4}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentStep === 5 && (
            <motion.div key="step5" ref={el => { stepRefs.current[4] = el; }} {...fadeIn} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
              <Step5Creative
                briefing={briefing}
                updateBriefing={updateBriefing}
                nextStep={nextStep}
                isActive={currentStep === 5}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentStep === 6 && (
            <motion.div key="step6" ref={el => { stepRefs.current[5] = el; }} {...fadeIn} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
              <Step6Contact
                briefing={briefing}
                updateBriefing={updateBriefing}
                nextStep={nextStep}
                isActive={currentStep === 6}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentStep === 7 && (
            <motion.div key="step7" ref={el => { stepRefs.current[6] = el; }} {...fadeIn} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}>
              <Step7Confirmation briefing={briefing} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
