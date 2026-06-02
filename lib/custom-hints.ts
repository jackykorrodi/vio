// VIO Custom-Pfad — Coach-Engine (Sprint 3, Regelkatalog v3.7)
//
// evaluateCustomConfig(): pure function, keine Side-Effects, kein Throw.
// Gibt CoachHint (ein priorisierter Hint oder null) + presence-Objekt zurück.
// Alle Texte auf Deutsch, du-Form, Schweizer Orthografie (kein ß).

import type { Region } from './regions';
import type { CustomConfig } from './types';
import type { CustomImpactResult } from './preislogik';
import {
  checkDoohAvailability,
  calculateSweetSpotCustom,
  REFERENZ_LAUFZEIT_DAYS,
  COACH_BUDGET_LOW_RATIO,
  COACH_BUDGET_HIGH_RATIO,
  SCREEN_ANZEIGE_SCHWELLE,
} from './preislogik';
import {
  klassifiziereRegion, klassifiziereMehrereRegionen,
  getPolitScreens,
  MAX_DOOH_SHARE_FULL, MAX_DOOH_SHARE_LIMITED, MAX_DOOH_SHARE_DISPLAY_DOMINANT,
  SCREENS_THRESHOLD_FULL, SCREENS_THRESHOLD_LIMITED,
} from './region-buchbarkeit';

// ─── Typen ───────────────────────────────────────────────────────────────────

/** @deprecated Sprint 2 — ersetzt durch CoachHint / CustomEvaluation */
export type CustomHint = {
  level: 'insight' | 'warning' | 'einschraenkung';
  category: 'mathematical' | 'market' | 'efficiency';
  code: string;
  title: string;
  text: string;
};

export interface CoachHint {
  type: 'budget_niedrig' | 'laufzeit' | 'saettigung';
  text: string;   // fertig formatiert, UI rendert direkt
}

export interface CustomEvaluation {
  coachHint: CoachHint | null;  // null = Sweet-Spot-Zone (still)
  presence: {
    doohAvailable: boolean;     // aus checkDoohAvailability (Zustand A/B)
    showScreenCount: boolean;   // politScreens-Summe >= SCREEN_ANZEIGE_SCHWELLE
    screenCount: number;        // summierte politScreens der gewählten Regionen
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function fmtChf(n: number): string {
  return "CHF " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

// maxDoohShareForRegion: basierend auf Screen-Klasse der Region(en).
// _laufzeitDays ist aktuell ungenutzt — Platzhalter für spätere Kalibrierung.
export function maxDoohShareForRegion(regions: Region[], _laufzeitDays: number): number {
  if (regions.length === 0) return MAX_DOOH_SHARE_FULL;
  const klass = regions.length > 1
    ? klassifiziereMehrereRegionen(regions)
    : klassifiziereRegion(regions[0]);
  if (klass.politScreens >= SCREENS_THRESHOLD_FULL)    return MAX_DOOH_SHARE_FULL;
  if (klass.politScreens >= SCREENS_THRESHOLD_LIMITED) return MAX_DOOH_SHARE_LIMITED;
  return MAX_DOOH_SHARE_DISPLAY_DOMINANT;
}

// ─── Coach-Engine ─────────────────────────────────────────────────────────────

export function evaluateCustomConfig(
  config: CustomConfig,
  regions: Region[],
  impact: CustomImpactResult,
  _daysToVote: number,
): CustomEvaluation {
  const { budget, laufzeitDays, wirkungsfokus = 'ausgewogen' } = config;

  // doohAnteil für Sweet-Spot-Berechnung aus impact ableiten
  const doohAnteil = budget > 0 ? impact.doohBudget / budget : 0;

  // Sweet-Spot für aktuelle und Referenz-Laufzeit
  const ssAktuell  = calculateSweetSpotCustom(regions, wirkungsfokus, laufzeitDays, doohAnteil);
  const ssReferenz = calculateSweetSpotCustom(regions, wirkungsfokus, REFERENZ_LAUFZEIT_DAYS, doohAnteil);

  // Region-Label: Akkusativ (Für …) und Dativ (in …)
  const regionAcc = regions.length === 1 ? regions[0].name : 'deine Auswahl';
  const regionDat = regions.length === 1 ? regions[0].name : 'deiner Auswahl';
  const ssFormatted = fmtChf(Math.round(ssAktuell.budget / 1000) * 1000);

  // Coach-Hint: ein priorisierter Hint, deterministisch
  let coachHint: CoachHint | null = null;

  if (budget < COACH_BUDGET_LOW_RATIO * ssAktuell.budget) {
    if (budget >= COACH_BUDGET_LOW_RATIO * ssReferenz.budget && laufzeitDays > REFERENZ_LAUFZEIT_DAYS) {
      coachHint = {
        type: 'laufzeit',
        text: 'Eine kürzere Laufzeit bündelt dein Budget und erhöht die wöchentliche Präsenz.',
      };
    } else {
      coachHint = {
        type: 'budget_niedrig',
        text: `Für ${regionAcc} entfalten Kampagnen ab rund ${ssFormatted} spürbar mehr Wirkung.`,
      };
    }
  } else if (budget > COACH_BUDGET_HIGH_RATIO * ssAktuell.budget) {
    coachHint = {
      type: 'saettigung',
      text: `Ab rund ${ssFormatted} ist die Reichweite in ${regionDat} weitgehend ausgeschöpft. Mehr Budget erhöht vor allem die Wiederholung, nicht die Zahl der erreichten Personen.`,
    };
  }

  // Presence: DOOH-Verfügbarkeit + Screen-Zahl
  const doohAvail = checkDoohAvailability(regions, undefined);
  const doohAvailable = doohAvail.available;
  const screenCount = doohAvailable
    ? regions.reduce((sum, r) => sum + getPolitScreens(r), 0)
    : 0;
  const showScreenCount = doohAvailable && screenCount >= SCREEN_ANZEIGE_SCHWELLE;

  return { coachHint, presence: { doohAvailable, showScreenCount, screenCount } };
}
