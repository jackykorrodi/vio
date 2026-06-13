'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useFlow, type StepId } from './FlowContext';
import { MIN_BUDGET } from '@/lib/eckwerte-logik';
import Rail from './Rail';
import DossierPanel from './DossierPanel';
import {
  Anker, Weiche, Wen, Budget, Einschaetzung,
  Eckwerte, Werbemittel, Wow, Abschluss,
} from './steps';
import styles from './Shell.module.css';

const STEP_TO_DSEC: Partial<Record<StepId, string>> = {
  anker:         'Anlass',
  wen:           'Stossrichtung',
  budget:        'Budget',
  einschaetzung: 'Unsere Einschätzung',
  eckwerte:      'Paket',
  werbemittel:   'Werbemittel',
  wow:           'Vorschau',
};

const STEP_MAP: Record<StepId, React.ComponentType> = {
  anker:         Anker,
  weiche:        Weiche,
  wen:           Wen,
  budget:        Budget,
  einschaetzung: Einschaetzung,
  eckwerte:      Eckwerte,
  werbemittel:   Werbemittel,
  wow:           Wow,
  abschluss:     Abschluss,
};

function flyDot(fromEl: Element | null, toEl: Element | null) {
  if (!fromEl || !toEl) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = styles.vdot;
  d.style.left = `${a.left + a.width / 2 - 6}px`;
  d.style.top  = `${a.top + a.height / 2 - 6}px`;
  document.body.appendChild(d);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    d.style.left      = `${b.left + 22}px`;
    d.style.top       = `${b.top + 12}px`;
    d.style.transform = 'scale(0.5)';
    d.style.opacity   = '0';
  }));
  setTimeout(() => d.remove(), 750);
}

export default function Shell() {
  const { steps, currentIdx, goNext, goBack, eckwerte } = useFlow();

  const btnNextRef   = useRef<HTMLButtonElement>(null);
  const dossierRef   = useRef<HTMLElement>(null);
  const pulsedSteps  = useRef(new Set<string>());

  const stepId = steps[currentIdx];
  const StepComponent = STEP_MAP[stepId];
  const isFirst = currentIdx === 0;
  const isLast  = currentIdx === steps.length - 1;
  const isNextDisabled = isLast || (stepId === 'eckwerte' && eckwerte.budgetChf < MIN_BUDGET);

  const pulseNext = useCallback(() => {
    if (pulsedSteps.current.has(stepId)) return;
    pulsedSteps.current.add(stepId);
    const btn = btnNextRef.current;
    if (!btn) return;
    btn.classList.remove(styles.pulse);
    void btn.offsetWidth;
    btn.classList.add(styles.pulse);
  }, [stepId]);

  useEffect(() => {
    if (isNextDisabled || isLast) return;
    const t = setTimeout(pulseNext, 400);
    return () => clearTimeout(t);
  }, [stepId, isNextDisabled, isLast, pulseNext]);

  function handleNext() {
    const secName = STEP_TO_DSEC[stepId];
    const toEl = secName
      ? (dossierRef.current?.querySelector(`[data-dsec="${secName}"]`) ?? null)
      : null;
    if (toEl) flyDot(btnNextRef.current, toEl);
    goNext();
  }

  return (
    <div className={styles.shell}>
      <Rail />

      <div className={styles.flow}>
        <div className={styles.flowScroll}>
          <div className={styles.flowContent}>
            <StepComponent />
          </div>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerRow}>
            {!isFirst && (
              <button className={styles.btnBack} onClick={goBack}>
                Zurück
              </button>
            )}
            <button
              ref={btnNextRef}
              className={styles.btnNext}
              onClick={handleNext}
              disabled={isNextDisabled}
            >
              {isLast ? 'Abgeschlossen' : isNextDisabled ? 'Budget zu tief' : 'Weiter'}
            </button>
          </div>
        </footer>
      </div>

      <DossierPanel dossierRef={dossierRef} />
    </div>
  );
}
