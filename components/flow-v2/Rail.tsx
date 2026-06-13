'use client';

import { useFlow, STEP_LABELS } from './FlowContext';
import styles from './Shell.module.css';

export default function Rail() {
  const { steps, currentIdx, visitedIdxs, goTo } = useFlow();

  const progressHeight = currentIdx > 0
    ? `calc(${(currentIdx / (steps.length - 1)) * 100}% - 6px)`
    : '0px';

  return (
    <nav className={styles.rail}>
      <div className={styles.brand}>
        vio<span className={styles.brandDot}>.</span>
      </div>
      <p className={styles.railSub}>Politik-Kampagne</p>

      <div className={styles.stepsWrap}>
        <div className={styles.stepsLine} />
        <div className={styles.stepsProgress} style={{ height: progressHeight }} />

        <ul className={styles.stepsList}>
          {steps.map((id, i) => {
            const isActive = i === currentIdx;
            const isDone = visitedIdxs.has(i) && i < currentIdx;
            const isVisited = visitedIdxs.has(i);

            const cls = [
              styles.stepItem,
              isActive ? styles.active : '',
              isDone ? styles.done : '',
            ].filter(Boolean).join(' ');

            return (
              <li key={`${id}-${i}`} className={cls}>
                <button
                  className={styles.stepBtn}
                  onClick={() => goTo(i)}
                  disabled={!isVisited || isActive}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={styles.stepDot} />
                  <span className={styles.stepLabel}>{STEP_LABELS[id]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.railFoot}>
        Entwurf gespeichert
      </div>
    </nav>
  );
}
