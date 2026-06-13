// VIO Eckwerte-Logik — Engine für Flow v2 (geführt + Impact)
// Spec §13 «Eckwerte-Modus — Flow v2» (SPEC_VERSION 3.14)
// Eine Engine, zwei Aufrufer — Frequenz ist kein Public-Interface.

import type { Region } from './regions';
import { B_MIN, calculateImpact, dedupRegions } from './preislogik';

// Re-export B_MIN aus preislogik.ts (gleicher Wert, §13-Benennung).
// §13: «MIN_BUDGET CHF 4'000 (hart)»
export const MIN_BUDGET = B_MIN; // 4_000 CHF

// CHF/Woche pro Gebietslast-Einheit. Status: Illustrativ — Splicky-Kalibrierung ausstehend (§13).
export const WOCHENSATZ = 250;

// Gebietslast-Stufen (§13). Status: Illustrativ — Splicky-Kalibrierung ausstehend.
// 'bezirk' und 'gemeinde' existieren noch nicht als RegionType → Fallback auf 1.
export const GEBIETSLAST_STUFEN: Record<Region['type'], number> = {
  schweiz: 20,
  kanton:  8,
  stadt:   3,
};

// Budget-Ratio-Schwellen (§13)
const RATIO_NIEDRIG = 1.05;
const RATIO_MITTEL  = 0.80;

const HEBEL_LISTE = ['Gebiet fokussieren', 'Zeitraum straffen', 'Budget erhöhen'] as const;

export type Risiko = 'niedrig' | 'mittel' | 'hoch';

// ─── Gebietslast ─────────────────────────────────────────────────────────────

// L = Σ Lastwerte der übergebenen Regionen (§13).
// Leere Liste → 1 (Fallback, verhindert NaN in needChf).
// Aufrufer ist für Dedup verantwortlich (via dedupRegions aus preislogik.ts).
export function gebietslast(regions: Region[]): number {
  if (regions.length === 0) return 1;
  return regions.reduce((sum, r) => sum + (GEBIETSLAST_STUFEN[r.type] ?? 1), 0);
}

// ─── Kern: bewerteEckwerte ───────────────────────────────────────────────────

export interface EckwerteResult {
  laufTage: number;
  needChf: number;
  ratio: number;
  risiko: Risiko;
  empfehlungChf: number;
  reachLow: number;
  hebel: string[];
}

export function bewerteEckwerte(input: {
  budgetChf: number;
  start: Date;
  ende: Date;
  regions: Region[];
}): EckwerteResult {
  const regions = dedupRegions(input.regions);
  const laufTage = Math.max(1, Math.round(
    (input.ende.getTime() - input.start.getTime()) / 86_400_000,
  ));

  // §13: need = L × (T/7) × WOCHENSATZ
  const L = gebietslast(regions.length > 0 ? regions : input.regions);
  const needChf = L * (laufTage / 7) * WOCHENSATZ;

  // §13: ratio = budget/need → Risikoklasse
  const ratio = needChf > 0 ? input.budgetChf / needChf : Infinity;
  const risiko: Risiko = ratio >= RATIO_NIEDRIG ? 'niedrig'
    : ratio >= RATIO_MITTEL ? 'mittel'
    : 'hoch';

  // §13: empfehlung = max(MIN_BUDGET, ceil(need×1.05/500)×500)
  const empfehlungChf = Math.max(MIN_BUDGET, Math.ceil((needChf * 1.05) / 500) * 500);

  // §13: Risiko immer mit Hebel (mittel + hoch)
  const hebel: string[] = risiko !== 'niedrig' ? [...HEBEL_LISTE] : [];

  // Reach: bestehendes Modell §5 (reachUniqueLow, Drei-Ebenen-Ehrlichkeit)
  // Frequenz bleibt intern — nicht im Public-Interface.
  const reachLow = regions.length > 0
    ? calculateImpact({ budget: input.budgetChf, laufzeitDays: laufTage, regions }).reachUniqueLow
    : 0;

  return { laufTage, needChf, ratio, risiko, empfehlungChf, reachLow, hebel };
}

// ─── Geführter Modus: Budget-Empfehlung ──────────────────────────────────────

// VIO schlägt Budget vor: ceil(need×1.05/500)×500, min MIN_BUDGET (§13).
export function empfehleBudget(input: {
  start: Date;
  ende: Date;
  regions: Region[];
}): number {
  const regions = dedupRegions(input.regions);
  const laufTage = Math.max(1, Math.round(
    (input.ende.getTime() - input.start.getTime()) / 86_400_000,
  ));
  const L = gebietslast(regions.length > 0 ? regions : input.regions);
  const needChf = L * (laufTage / 7) * WOCHENSATZ;
  return Math.max(MIN_BUDGET, Math.ceil((needChf * 1.05) / 500) * 500);
}

// ─── Geführter Modus: Zeitraum-Empfehlung ────────────────────────────────────

export type LaufzeitOption = 14 | 28 | 42;

export interface ZeitraumOption {
  laufTage: LaufzeitOption;
  start: Date;
}

export interface ZeitraumEmpfehlung {
  optionen: ZeitraumOption[];
  defaultLaufTage: LaufzeitOption; // §13: Default 28d «ab Versand Stimmunterlagen»
}

// Geführt: Ende = Urnengang; Start = Ende − {14|28|42}; Default 28d (§13).
export function empfehleZeitraum(input: { termin: Date }): ZeitraumEmpfehlung {
  const terminMs = input.termin.getTime();
  const optionen: ZeitraumOption[] = ([14, 28, 42] as LaufzeitOption[]).map(laufTage => ({
    laufTage,
    start: new Date(terminMs - laufTage * 86_400_000),
  }));
  return { optionen, defaultLaufTage: 28 };
}
