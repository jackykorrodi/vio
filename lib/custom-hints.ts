// VIO Custom-Pfad — Hint-Engine (Sprint 2)
//
// evaluateCustomConfig(): pure function, keine Side-Effects, kein Throw.
// Gibt Hints in Prioritätsreihenfolge zurück: einschraenkung → warning → insight.
// Alle Texte auf Deutsch, du-Form, Schweizer Orthografie (kein ß).

import type { Region } from './regions';
import type { CustomConfig } from './types';
import type { CustomImpactResult } from './preislogik';
import {
  DOOH_CUTOFF_DAYS,
  DISPLAY_SPRINT_SWITCH_DAYS,
  F_MIN_WEEKLY,
  F_MAX_WEEKLY,
  REACH_CURVE_K,
} from './preislogik';
import {
  klassifiziereRegion, klassifiziereMehrereRegionen,
  MAX_DOOH_SHARE_FULL, MAX_DOOH_SHARE_LIMITED, MAX_DOOH_SHARE_DISPLAY_DOMINANT,
  SCREENS_THRESHOLD_FULL, SCREENS_THRESHOLD_LIMITED,
} from './region-buchbarkeit';

// ─── Typen ───────────────────────────────────────────────────────────────────

export type CustomHint = {
  level: 'insight' | 'warning' | 'einschraenkung';
  category: 'mathematical' | 'market' | 'efficiency';
  code: string;   // stabile ID für Tests
  title: string;  // Deutsch, Schweizer Orthografie
  text: string;   // Kurzer Erklärungs-Satz, ggf. mit Konsequenz-Klausel
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function fmtChf(n: number): string {
  return "CHF " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

// maxDoohShareForRegion: basierend auf Screen-Klasse der Region(en)
// laufzeitDays ist aktuell ungenutzt — Platzhalter für Sprint-3-Kalibrierung
// (längere Kampagnen könnten andere Limits haben).
export function maxDoohShareForRegion(regions: Region[], _laufzeitDays: number): number {
  if (regions.length === 0) return MAX_DOOH_SHARE_FULL;
  const klass = regions.length > 1
    ? klassifiziereMehrereRegionen(regions)
    : klassifiziereRegion(regions[0]);
  // Klassen-Mapping via politScreens (identisch zu region-buchbarkeit.ts-Schwellen)
  if (klass.politScreens >= SCREENS_THRESHOLD_FULL)    return MAX_DOOH_SHARE_FULL;
  if (klass.politScreens >= SCREENS_THRESHOLD_LIMITED) return MAX_DOOH_SHARE_LIMITED;
  return MAX_DOOH_SHARE_DISPLAY_DOMINANT;
}

// ─── Hint-Engine ─────────────────────────────────────────────────────────────

export function evaluateCustomConfig(
  config: CustomConfig,
  regions: Region[],
  impact: CustomImpactResult,
  daysToVote: number,
): CustomHint[] {
  const { budget, laufzeitDays, freqWeekly, doohShare } = config;
  const { reachPercent, saturationRatio, screens } = impact;

  const laufzeitWeeks = laufzeitDays / 7;

  const einschraenkungen: CustomHint[] = [];
  const warnings: CustomHint[] = [];
  const insights: CustomHint[] = [];

  // ── Mathematical Hints ───────────────────────────────────────────────────

  if (freqWeekly < F_MIN_WEEKLY) {
    warnings.push({
      level: 'warning',
      category: 'mathematical',
      code: 'freq_below_threshold',
      title: 'Frequenz unter Wahrnehmungs-Schwelle',
      text: `Wochenfrequenz ${freqWeekly.toFixed(1)}× unter Wahrnehmungs-Schwelle. Eine Erhöhung auf 3× würde Wirkung deutlich verbessern.`,
    });
  }

  if (freqWeekly > F_MAX_WEEKLY) {
    warnings.push({
      level: 'warning',
      category: 'mathematical',
      code: 'freq_above_wearout',
      title: 'Frequenz über Wearout-Grenze',
      text: `Wochenfrequenz ${freqWeekly.toFixed(1)}× über Wearout-Grenze. Hohe Wiederholung kann Botschaft abnutzen.`,
    });
  }

  if (reachPercent < 3) {
    einschraenkungen.push({
      level: 'einschraenkung',
      category: 'mathematical',
      code: 'reach_collapse',
      title: 'Reach kollabiert mathematisch',
      text: `Diese Kombination liefert nur ${reachPercent.toFixed(1)}% Reach. Bookbar, aber sehr ineffizient.`,
    });
  }

  // ── Market Hints ─────────────────────────────────────────────────────────

  if (doohShare > 0 && daysToVote < DOOH_CUTOFF_DAYS) {
    einschraenkungen.push({
      level: 'einschraenkung',
      category: 'market',
      code: 'dooh_cutoff',
      title: 'DOOH-Buchungsfrist überschritten',
      text: `DOOH-Buchungsfrist überschritten – DOOH-Anteil wird auf Display umgeschichtet. Bookbar, aber nicht wie geplant.`,
    });
  }

  const maxDooh = maxDoohShareForRegion(regions, laufzeitDays);
  if (doohShare > maxDooh) {
    const maxPct = Math.round(maxDooh * 100);
    warnings.push({
      level: 'warning',
      category: 'market',
      code: 'dooh_inventory_limit',
      title: 'DOOH-Inventar begrenzt',
      text: `Region hat nur ${screens} DOOH-Screens. Maximaler sinnvoller DOOH-Anteil: ${maxPct}%.`,
    });
  }

  if (daysToVote < DISPLAY_SPRINT_SWITCH_DAYS && doohShare === 0) {
    insights.push({
      level: 'insight',
      category: 'market',
      code: 'display_sprint_mode',
      title: 'Display Sprint-Modus aktiv',
      text: `Display Sprint-Modus: schnelle Aktivierung, keine DOOH-Setup-Zeit.`,
    });
  }

  // ── Efficiency Hints ─────────────────────────────────────────────────────

  if (saturationRatio > 1.1) {
    // Budget über Sweet Spot:
    //   budget_sweet = budget / saturationRatio  (linearer Rückschluss aus ratio-Definition)
    //   excess       = budget - budget_sweet
    //   marginalGain = (satFactor_current / satFactor_sweet - 1) * 100
    //     satFactor = 1 - exp(-REACH_CURVE_K * impressionsInPool/poolCap)
    //               = 1 - exp(-REACH_CURVE_K * saturationRatio * freqWeekly * laufzeitWeeks)
    const excessBudget = budget * (1 - 1 / saturationRatio);
    const satFactorCurrent = 1 - Math.exp(-REACH_CURVE_K * saturationRatio * freqWeekly * laufzeitWeeks);
    const satFactorSweet   = 1 - Math.exp(-REACH_CURVE_K * freqWeekly * laufzeitWeeks);
    const marginalGainPct  = satFactorSweet > 0
      ? Math.max(0, Math.round((satFactorCurrent / satFactorSweet - 1) * 100))
      : 0;
    warnings.push({
      level: 'warning',
      category: 'efficiency',
      code: 'above_sweet_spot',
      title: 'Budget über Sweet Spot',
      text: `Budget über Sweet Spot um ${fmtChf(excessBudget)}. Mehr Geld bringt nur noch +${marginalGainPct}% Reach.`,
    });
  }

  if (saturationRatio >= 0.85 && saturationRatio <= 1.0) {
    insights.push({
      level: 'insight',
      category: 'efficiency',
      code: 'at_sweet_spot',
      title: 'Budget im Sweet Spot',
      text: `Sweet Spot erreicht. Budget ist optimal kalibriert für die Region.`,
    });
  }

  if (saturationRatio < 0.4 && reachPercent >= 3) {
    warnings.push({
      level: 'warning',
      category: 'efficiency',
      code: 'under_invested',
      title: 'Unter-investiert',
      text: `Unter-investiert: bei dieser Region wäre mehr Reichweite mit moderatem Budget-Upgrade möglich.`,
    });
  }

  // Reihenfolge: einschraenkung → warning → insight
  return [...einschraenkungen, ...warnings, ...insights];
}
