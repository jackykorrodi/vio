'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Region } from '@/lib/regions';

export type Mode = 'geführt' | 'impact';

export type StepId =
  | 'anker'
  | 'weiche'
  | 'wen'
  | 'budget'
  | 'einschaetzung'
  | 'eckwerte'
  | 'werbemittel'
  | 'wow'
  | 'abschluss';

export const SEQUENCES: Record<Mode, StepId[]> = {
  'geführt': ['anker', 'weiche', 'wen', 'budget', 'einschaetzung', 'werbemittel', 'wow', 'abschluss'],
  'impact':  ['anker', 'weiche', 'eckwerte', 'werbemittel', 'wow', 'abschluss'],
};

export const STEP_LABELS: Record<StepId, string> = {
  anker:         'Anlass & Gebiet',
  weiche:        'Einstieg',
  wen:           'Stossrichtung',
  budget:        'Budget',
  einschaetzung: 'Unsere Einschätzung',
  eckwerte:      'Eckwerte',
  werbemittel:   'Werbemittel',
  wow:           'Vorschau',
  abschluss:     'Abschluss',
};

// ─── Anker-State ─────────────────────────────────────────────────────────────

export type KampagnenArt = 'volksinitiative' | 'referendum' | 'kandidatur' | 'propositur';
export type Ebene = 'eidgenoessisch' | 'kantonal' | 'kommunal';

export interface WahlSonntag {
  date: string;    // ISO
  label: string;   // «27. September 2026»
  meta: string;    // «Eidg. · kantonal · kommunal»
}

export interface AnkerState {
  art: KampagnenArt | null;
  ebene: Ebene | null;
  regions: Region[];
  wahlsonntag: WahlSonntag | null;
  checkStatus: 'idle' | 'checking' | 'ok';
  checkScreens: number;
}

const ANKER_INIT: AnkerState = {
  art: null,
  ebene: null,
  regions: [],
  wahlsonntag: null,
  checkStatus: 'idle',
  checkScreens: 0,
};

// ─── Wen-State ────────────────────────────────────────────────────────────────

export type FokusLevel = 0 | 1 | 2 | 3 | 4;
export type ZgMode = 'partei' | 'milieu';
export type Partei = 'SVP' | 'SP' | 'Mitte' | 'FDP' | 'Grüne' | 'GLP' | 'EVP';
export type MilieuTyp = 'laendlich' | 'urban' | 'mitte' | 'familien' | 'aeltere';

export interface WenState {
  fokus: FokusLevel;
  zgMode: ZgMode;
  partei: Partei[];
  milieu: MilieuTyp[];
}

const WEN_INIT: WenState = { fokus: 2, zgMode: 'partei', partei: [], milieu: [] };

// ─── Budget-State ─────────────────────────────────────────────────────────────

export type BudgetModus = 'haben' | 'empfehlung';

export interface BudgetState {
  modus: BudgetModus | null;
  betragChf: number | null;
}

const BUDGET_INIT: BudgetState = { modus: null, betragChf: null };

// ─── Einschätzung-State ───────────────────────────────────────────────────────

export interface EinschaetzungState {
  laufzeit: 14 | 28 | 42;
  budgetJustiert: number | null;
}

const EINSCH_INIT: EinschaetzungState = { laufzeit: 28, budgetJustiert: null };

// ─── Eckwerte-State (impact path) ────────────────────────────────────────────

export interface EckwerteState {
  budgetChf: number;
  start: string | null;    // ISO — null = auto-default (termin − 28d)
  ende: string | null;     // ISO — null = auto-default (termin)
  impDatesTouched: boolean;
}

const ECKWERTE_INIT: EckwerteState = {
  budgetChf: 6000,
  start: null,
  ende: null,
  impDatesTouched: false,
};

// ─── Werbemittel-State ────────────────────────────────────────────────────────

export type WerbemittelOption = 'o1' | 'o2';

export interface WerbemittelState {
  option: WerbemittelOption | null;
}

const WERBEMITTEL_INIT: WerbemittelState = { option: null };

// ─── Context ─────────────────────────────────────────────────────────────────

interface FlowCtx {
  mode: Mode;
  steps: StepId[];
  currentIdx: number;
  visitedIdxs: Set<number>;
  setMode: (m: Mode) => void;
  goNext: () => void;
  goBack: () => void;
  goTo: (idx: number) => void;
  anker: AnkerState;
  setAnker: (patch: Partial<AnkerState>) => void;
  wen: WenState;
  setWen: (patch: Partial<WenState>) => void;
  budget: BudgetState;
  setBudget: (patch: Partial<BudgetState>) => void;
  einschaetzung: EinschaetzungState;
  setEinschaetzung: (patch: Partial<EinschaetzungState>) => void;
  eckwerte: EckwerteState;
  setEckwerte: (patch: Partial<EckwerteState>) => void;
  werbemittel: WerbemittelState;
  setWerbemittel: (patch: Partial<WerbemittelState>) => void;
}

const Ctx = createContext<FlowCtx | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('geführt');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visitedIdxs, setVisitedIdxs] = useState<Set<number>>(new Set([0]));
  const [ankerState, setAnkerState] = useState<AnkerState>(ANKER_INIT);
  const [wenState, setWenState] = useState<WenState>(WEN_INIT);
  const [budgetState, setBudgetState] = useState<BudgetState>(BUDGET_INIT);
  const [einschState, setEinschState] = useState<EinschaetzungState>(EINSCH_INIT);
  const [eckwerteState, setEckwerteState] = useState<EckwerteState>(ECKWERTE_INIT);
  const [werbemittelState, setWerbemittelState] = useState<WerbemittelState>(WERBEMITTEL_INIT);

  const steps = SEQUENCES[mode];

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    setCurrentIdx(1);
    setVisitedIdxs(new Set([0, 1]));
  }, []);

  const goNext = useCallback(() => {
    const seq = SEQUENCES[mode];
    setCurrentIdx(prev => {
      if (prev >= seq.length - 1) return prev;
      const next = prev + 1;
      setVisitedIdxs(v => new Set([...v, next]));
      return next;
    });
  }, [mode]);

  const goBack = useCallback(() => {
    setCurrentIdx(prev => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((idx: number) => {
    setVisitedIdxs(v => {
      if (v.has(idx)) setCurrentIdx(idx);
      return v;
    });
  }, []);

  const setAnker = useCallback((patch: Partial<AnkerState>) => {
    setAnkerState(prev => ({ ...prev, ...patch }));
  }, []);

  const setWen = useCallback((patch: Partial<WenState>) => {
    setWenState(prev => ({ ...prev, ...patch }));
  }, []);

  const setBudget = useCallback((patch: Partial<BudgetState>) => {
    setBudgetState(prev => ({ ...prev, ...patch }));
  }, []);

  const setEinschaetzung = useCallback((patch: Partial<EinschaetzungState>) => {
    setEinschState(prev => ({ ...prev, ...patch }));
  }, []);

  const setEckwerte = useCallback((patch: Partial<EckwerteState>) => {
    setEckwerteState(prev => ({ ...prev, ...patch }));
  }, []);

  const setWerbemittel = useCallback((patch: Partial<WerbemittelState>) => {
    setWerbemittelState(prev => ({ ...prev, ...patch }));
  }, []);

  return (
    <Ctx.Provider value={{
      mode, steps, currentIdx, visitedIdxs,
      setMode, goNext, goBack, goTo,
      anker: ankerState, setAnker,
      wen: wenState, setWen,
      budget: budgetState, setBudget,
      einschaetzung: einschState, setEinschaetzung,
      eckwerte: eckwerteState, setEckwerte,
      werbemittel: werbemittelState, setWerbemittel,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFlow(): FlowCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFlow must be used inside FlowProvider');
  return ctx;
}
