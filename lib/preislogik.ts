// VIO Preislogik — Single Source of Truth
//
// Ersetzt schrittweise lib/vio-paketlogik.ts und lib/b2b-paketlogik.ts.
// Diese Datei wird in Paket B.2/B.3 in die UI-Komponenten eingebunden.
//
// Basis: Spec v3.6
// Erstellt: 22.04.2026

import type { Region } from './regions';
import type { Wirkungsfokus } from './types';
import { klassifiziereMehrereRegionen, klassifiziereRegion, MAX_DOOH_SHARE_FULL, MAX_DOOH_SHARE_LIMITED, MAX_DOOH_SHARE_DISPLAY_DOMINANT } from './region-buchbarkeit';
import { addBusinessDays } from './business-days';

// ─── Konstanten ──────────────────────────────────────────────────────────────

export const B_MIN = 4000;               // CHF Mindestbudget (hard floor)
export const B_NUDGE_SOFT = 20000;       // CHF dezenter Calendly-Nudge
export const B_NUDGE_STRONG = 30000;     // CHF prominente Beratungs-Bubble
export const B_HARD_MAX = 100000;        // CHF absolute Obergrenze (Hard Stop)
export const PKG_BUDGET_MAX = 99500;     // CHF Paket-Budget-Ceiling (Pfad B, knapp unter Hard Stop)

export const DAILY_MIN = 150;            // CHF Tagesbudget-Floor (Splicky)
export const LAUFZEIT_MIN_DAYS = 7;
export const LAUFZEIT_MAX_DAYS = 84;     // 12 Wochen (intern; freies Slider-Max)
export const POLITIK_LAUFZEIT_MAX = 42;  // Politik-Fenster-Obergrenze (Spec §6.3)

export const F_MIN_WEEKLY = 3;           // unter dieser Schwelle: unwirksam (Krugman-Schwelle)
export const F_MAX_WEEKLY = 10;          // ab hier Werbemüdigkeit
export const REACH_CURVE_K = 0.25;       // Hofmans-Saturation Steilheit (Spec v3.4)
export const WEAROUT_FLOOR = 0.70;       // minimaler Wearout-Faktor

export const MAX_REACH_CAP = 0.80;       // max 80% des Pools erreichbar
export const EXPONENT_BUDGET_LAUFZEIT = 0.75;  // konkave Kopplung

// CPM-Tarife (inkl. VIO-Marge)
export const CPM_DOOH = 50;
export const CPM_DISPLAY = 15;
// Listen-CPM (10% Channel-Puffer ggü. echtem Misch-CPM 39.50): 39.50 / 0.90
export const CPM_LIST = 43.89;


// Anteil der Kontakte, die tatsächlich den Zielpool treffen (In-Pool-Faktor, Spec v3.4)
export const IN_POOL_FACTOR = 0.7;

// Optimizer-Konstanten (Spec v3.4, aktiv)
export const F_MIN_TOLERANCE = 2.7;          // weicher Boden für Sprint-Override
export const F_OVERKILL_THRESHOLD = 15;      // harte Wearout-Grenze
export const LARGE_POOL_THRESHOLD = 500_000; // ab hier Gross-Region-Logik
export const REACH_PREMIUM_THRESHOLD = 1.4;  // Dominanz-Multiplier-Trigger

// Timing-Constraints (Display Sprint)
export const DOOH_CUTOFF_DAYS = 10;            // operativ: DOOH-Freigabe nicht mehr möglich
export const MIN_DISPLAY_ONLY_LAUFZEIT = 7;   // Untergrenze sinnvolle Display-Sprint-Laufzeit
export const DISPLAY_SPRINT_SWITCH_DAYS = 24; // ab < 24 Tagen bis Vote: Display-Sprint-Modus

// §7.0 v3.5.3: Granularität — alle buchbaren Standard-Laufzeiten
export const LAUFZEITEN_BASIS = [14, 21, 28, 35, 42] as const;
export const AUFBAU_PREMIUM_THRESHOLD = 1.2;  // Schritt 4: Reach-Ratio zum Triggern von 35d/42d
export const DOMINANZ_BUDGET_CAP = 100_000;   // §8.1: Dominanz-Budget Hard-Cap (CHF)

// ─── Custom-Pfad: Wirkungsfokus-Modell (Regelkatalog v3.7) ───────────────────

// v3.13: Kampagnenkontakte (Kontakte/Person über gesamte Laufzeit), nicht mehr Wochenfrequenz.
// Status: Annahme — Splicky-Kalibrierung + Live-Test vor Go-Live (§10).
export const WIRKUNGSFOKUS_FREQUENZ: Record<Wirkungsfokus, number> = {
  breit:       5,
  ausgewogen:  7,
  verankerung: 10,
};

// DOOH-Setup-Vorlauf für Custom-Pfad (löst DOOH_CUTOFF_DAYS im Custom-Pfad ab).
// DOOH_CUTOFF_DAYS bleibt unverändert für Paket-Pfad.
export const SETUP_VORLAUF_WERKTAGE = 10;

// Ziel-Sättigungsgrad für Sweet-Spot-Schätzung. Spec §4 v3.11: oberes Ende Paket-Korridor (0.2–1.3).
// Annahme — vor Go-Live mit Splicky kalibrieren (§10).
export const SWEET_SPOT_TARGET_SATURATION = 1.4;

// ─── Custom-Pfad Coach-Logik Konstanten (Regelkatalog v3.7) ──────────────────

// Referenz-Laufzeit für die Laufzeit-vs-Budget-Coach-Unterscheidung.
// 28 Tage = typische Politik-Kampagne (Präsenz-Paket-Länge). Kalibrierbar.
export const REFERENZ_LAUFZEIT_DAYS = 28;

// Coach-Schwellen relativ zum Sweet-Spot-Budget (kalibrierbar):
export const COACH_BUDGET_LOW_RATIO  = 0.6;    // < 60% → niedrig-Bereich
export const COACH_BUDGET_HIGH_RATIO = 1.15;   // > 115% → Sättigung

// Inventar-Copy-Signal: ab dieser politScreens-Summe kann eine aussagekräftige
// Screen-Zahl angezeigt werden. Preliminär — vor Go-Live mit Splicky-Inventar nachkalibrieren.
export const SCREEN_ANZEIGE_SCHWELLE = 30;

// ─── Typen ───────────────────────────────────────────────────────────────────

export type HinweisCode =
  | 'ok'
  | 'below_min_budget'
  | 'hard_stop_budget'
  | 'daily_below_floor_region'
  | 'optimal_28d_standard'
  | '28d_broad_reach_low_frequency'
  | 'sprint_14d_thin_budget'
  | 'sprint_14d_grosser_pool'
  | 'sprint_14d_28d_unavailable'
  | 'aufbau_42d_thin_budget'
  | 'aufbau_42d_reach_premium'
  | 'aufbau_42d_28d_unavailable'
  | 'dominanzmodus'
  | 'dominanzmodus_stark'
  | 'overkill_frequency'
  | 'too_thin'
  | 'display_only_late_window'
  | 'too_short_for_campaign'
  | 'vote_passed'
  | 'sprint_14d_vorlauf_constrained'
  | 'optimal_28d_vorlauf_constrained';

export interface Hinweis {
  code: HinweisCode;
  text: string;
  priority: number;  // 1 = höchste Priorität (blockierend)
}

export interface ImpactResult {
  // Inputs (echoed zurück)
  budget: number;
  laufzeitDays: number;
  laufzeitWeeks: number;

  // Reichweite (das was der User sieht)
  reachUniqueLow: number;
  reachUniqueHigh: number;
  reachUniqueAbs: number;
  reachUniqueLowPct: number;
  reachUniqueHighPct: number;

  // Frequenz
  frequencyCampaign: number;  // z.B. 20 (= Ø 20× pro Person über die Kampagne)
  frequencyWeekly: number;    // z.B. 5 (intern zur Validierung)

  // Pool
  stimmTotal: number;
  poolCap: number;            // effektiv erreichbare Pool-Grösse (nach Cap-Level)

  // Channel
  doohShare: number;          // z.B. 0.70
  displayShare: number;       // z.B. 0.30
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';

  // Decision-Engine
  capLevel: 1 | 2 | 3;
  impactLevel: 'sichtbar' | 'praesenz' | 'dominanz';
  efficiencyStatus: 'too_thin' | 'balanced' | 'overkill' | 'capped';
  recommendedAction: { action: string; target: number } | null;

  // Flags
  cappedByRegion: boolean;
  hinweise: Hinweis[];
}

export type PaketKey = 'sichtbar' | 'praesenz' | 'dominanz';

// Cap-Level pro Paket für calculateImpact(mode:'paketLevel').
export const PKG_CAP_LEVEL: Record<PaketKey, 1 | 2 | 3> = { sichtbar: 1, praesenz: 2, dominanz: 3 };

export interface Paket {
  key: PaketKey;
  name: string;
  budget: number;
  laufzeitDays: number;
  laufzeitWeeks: number;
  frequencyCampaign: number;
  frequencyWeekly: number;
  reachUniqueLow: number;
  reachUniqueHigh: number;
  reachUniqueAbs: number;
  reachUniqueLowPct: number;
  reachUniqueHighPct: number;
  recommended: boolean;
  deliveryMode: 'standard' | 'display_only';
  availability: 'available' | 'unavailable';
  qualityStatus: 'balanced' | 'high_frequency' | 'thin';
  contextFlag?: 'mikro_limited';
  requiresConsultation: boolean;
  doohShare: number;
}

export interface PakeResult {
  sichtbar: Paket;
  praesenz: Paket;
  dominanz: Paket;
  recommended: PaketKey;
  stimmTotal: number;
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';
  freqGuardrail: boolean; // deprecated v3.9 — always false; kept for StepPackages backward-compat
  customHint: boolean;    // §9.2 v3.9: pool_tier ∈ {C, D} → Tier-C/D Custom-Hint anzeigen
}

// ─── Custom-Pfad: DOOH-Verfügbarkeit (Regelkatalog v3.7) ─────────────────────

export type DoohAvailability =
  | { available: true;  channelMix: number }
  | { available: false; reason: 'setup_vorlauf' | 'no_inventory' };

// ─── Custom-Pfad: Kampagnenfenster (Single Source of Truth für Laufzeit + Kanal) ─

export interface CampaignWindow {
  modus: 'dooh_mix' | 'display_only';
  doohShare: number;
  displayShare: number;
  earliestStart: Date;        // display_only: voteDate − effectiveLaufzeitDays; dooh_mix: addBusinessDays(today, SETUP_VORLAUF_WERKTAGE)
  effectiveLaufzeitDays: number;
  daysUntilVote: number | null;
}

// ─── Custom-Pfad Return-Type (Sprint 2) ──────────────────────────────────────

export interface CustomImpactResult {
  reach: number;                  // Stimmberechtigte erreicht (unique, gerundet)
  reachPercent: number;           // % vom regionalen Stimm-Pool (1 Dezimale)
  reachUniqueLow: number;         // Reichweite Untergrenze (/500 gerundet)
  reachUniqueHigh: number;        // Reichweite Obergrenze (/500 gerundet, poolCap-geklämmt)
  grps: number;                   // Gross Rating Points (impressionsTotal / stimmTotal * 100)
  impressionsTotal: number;       // Total Impressionen über Laufzeit
  screens: number;                // Anzahl DOOH-Screens in Region(en) (aus Klassifikation)
  cpmEffective: number;           // gewichteter CPM aus DOOH+Display Mix
  doohBudget: number;             // CHF auf DOOH
  displayBudget: number;          // CHF auf Display
  saturationPosition: 'unter' | 'sweet' | 'ueber'; // relativ zu Sättigungskurve
  saturationRatio: number;        // reachLinear / poolCap (Wirkungsfokus-basiert)
}

// ─── Paket-Definitionen (politisch-stark kalibriert) ─────────────────────────

// v3.13: frequencyWeekly hält jetzt Kampagnenkontakte (fKampagne), nicht mehr Wochenfrequenz.
// Wochenfrequenz wird in buildOne abgeleitet: fKampagne / laufzeitWeeks. Status: Annahme.
export const PAKET_SPECS: Record<PaketKey, {
  name: string;
  frequencyWeekly: number; // semantisch: fKampagne (Kampagnenkontakte fix), Feld-Rename folgt nach UI-Migration
  laufzeitDays: number;
  reachCapLevel: 1 | 2 | 3;
}> = {
  sichtbar: { name: 'Sichtbar', frequencyWeekly: 5, laufzeitDays: 21, reachCapLevel: 1 },
  praesenz: { name: 'Präsenz', frequencyWeekly: 7, laufzeitDays: 28, reachCapLevel: 2 },
  dominanz: { name: 'Dominanz', frequencyWeekly: 9, laufzeitDays: 35, reachCapLevel: 3 },
};

// ─── Reach-Caps nach Pool-Grösse (tiered) ────────────────────────────────────

function getReachCap(stimmTotal: number, level: 1 | 2 | 3): number {
  if (stimmTotal < 50000) {
    return level === 1 ? 0.22 : level === 2 ? 0.45 : 0.65;
  }
  if (stimmTotal < 200000) {
    return level === 1 ? 0.12 : level === 2 ? 0.22 : 0.38;
  }
  if (stimmTotal < 500000) {
    return level === 1 ? 0.06 : level === 2 ? 0.12 : 0.21;
  }
  return level === 1 ? 0.03 : level === 2 ? 0.06 : 0.12;
}

// ─── Regionen-Dedup (Stadt-in-Kanton-Überlappung) ────────────────────────────

export function dedupRegions(regions: Region[]): Region[] {
  if (regions.some(r => r.type === 'schweiz')) {
    return regions.filter(r => r.type === 'schweiz');
  }
  const kantonCodes = new Set(
    regions.filter(r => r.type === 'kanton').map(r => r.kanton)
  );
  return regions.filter(r => {
    if (r.type === 'kanton') return true;
    if (r.type === 'stadt' && kantonCodes.has(r.kanton)) return false;
    return true;
  });
}

// ─── Laufzeit-Korridor ───────────────────────────────────────────────────────

export function getLaufzeitCorridor(budget: number): { minDays: number; maxDays: number } {
  const cap = POLITIK_LAUFZEIT_MAX;
  if (budget < 6000) return { minDays: 7,  maxDays: Math.min(21, cap) };
  if (budget < 15000) return { minDays: 14, maxDays: Math.min(42, cap) };
  if (budget < 30000) return { minDays: 21, maxDays: Math.min(56, cap) };
  return { minDays: 28, maxDays: Math.min(84, cap) };
}

// ─── Budget↔Laufzeit-Kopplung (konkav, ^0.75) ────────────────────────────────

export function coupleBudgetToLaufzeit(
  referenceBudget: number,
  referenceDays: number,
  newDays: number,
): number {
  const ratio = newDays / referenceDays;
  const factor = Math.pow(ratio, EXPONENT_BUDGET_LAUFZEIT);
  const raw = referenceBudget * factor;
  return Math.max(B_MIN, roundBudget(raw));
}

// ─── Wearout-Kurve (>8 Wochen) ───────────────────────────────────────────────

function applyWearoutFactor(laufzeitWeeks: number): number {
  if (laufzeitWeeks <= 8) return 1.0;
  const factor = 1 - (laufzeitWeeks - 8) * 0.03;
  return Math.max(factor, WEAROUT_FLOOR);
}

function getUncertaintyBand(politScreens: number): number {
  if (politScreens < 30) return 0.20;
  if (politScreens < 150) return 0.15;
  if (politScreens < 500) return 0.13;
  return 0.12;
}

// ─── Budget-Rundung ──────────────────────────────────────────────────────────

function roundBudget(v: number): number {
  if (v < 10000) return Math.round(v / 100) * 100;
  if (v < 50000) return Math.round(v / 500) * 500;
  return Math.round(v / 1000) * 1000;
}

// ─── Hilfs-Aggregat ──────────────────────────────────────────────────────────

function sumStimm(regions: Region[]): number {
  return regions.reduce((s, r) => s + r.stimm, 0);
}

// ─── Sweet Spot ──────────────────────────────────────────────────────────────

export type BudgetMarker = { budget: number; context: 'optimal' | 'constrained' };

const SWEET_SPOT_UNSTABLE = new Set<HinweisCode>([
  'sprint_14d_thin_budget',
  'aufbau_42d_thin_budget',
  'too_thin',
  'dominanzmodus_stark',
  'too_short_for_campaign',
  'vote_passed',
]);

export function calculateSweetSpot(regions: Region[], daysUntilVote?: number | null): BudgetMarker | null {
  const deduped = dedupRegions(regions);
  if (deduped.length === 0 || sumStimm(deduped) === 0) return null;
  for (let budget = B_MIN; budget <= B_HARD_MAX; budget += 500) {
    const { statusCode } = optimizeForBudget(budget, deduped, daysUntilVote);
    if (!SWEET_SPOT_UNSTABLE.has(statusCode)) {
      return { budget, context: statusCode === 'optimal_28d_standard' ? 'optimal' : 'constrained' };
    }
  }
  return null;
}

// ─── Hinweis-Generierung ─────────────────────────────────────────────────────

function buildHinweise(ctx: {
  budget: number;
  frequencyWeekly: number;
  laufzeitDays: number;
  laufzeitWeeks: number;
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';
  cappedByRegion: boolean;
  regionNames: string[];
  multiRegion: boolean;
  politScreensTotal: number;
  stimmTotal: number;
  reachUniqueAbs: number;
  regions: Region[];
  optimizerStatusCode?: HinweisCode;
  mode?: 'budgetFirst' | 'paketLevel';
}): Hinweis[] {
  const hinweise: Hinweis[] = [];

  // Priorität 1: blockierende
  if (ctx.budget >= B_HARD_MAX) {
    hinweise.push({
      code: 'hard_stop_budget',
      text: 'Kampagnen ab CHF 100\'000 planen wir persönlich. Buchung nur nach Gespräch möglich.',
      priority: 1,
    });
    return hinweise;
  }
  if (ctx.budget < B_MIN) {
    hinweise.push({
      code: 'below_min_budget',
      text: 'Mindestbudget CHF 4\'000 – wir heben automatisch an.',
      priority: 1,
    });
  }

  // Priorität 2: Overkill-Frequenz — nur paketLevel (transitional; Pfad A nutzt dominanzmodus/dominanzmodus_stark)
  if (ctx.frequencyWeekly > F_MAX_WEEKLY && ctx.mode === 'paketLevel') {
    hinweise.push({
      code: 'overkill_frequency',
      text: `Hohe Kontaktdichte — jede erreichte Person wird Ø ${ctx.frequencyWeekly.toFixed(1)}× pro Woche erreicht. Für breitere Streuung kann eine grössere Zielregion, längere Laufzeit oder ein tieferes Budget sinnvoll sein.`,
      priority: 2,
    });
  }

  // Priorität 3: daily_below_floor pro Region (nur Multi-Region)
  if (ctx.regions.length > 1) {
    const violating = ctx.regions.filter(r => {
      const share = ctx.stimmTotal > 0 ? r.stimm / ctx.stimmTotal : 1 / ctx.regions.length;
      return (ctx.budget * share) / ctx.laufzeitDays < DAILY_MIN;
    });
    if (violating.length > 0) {
      const regionList = violating.map(r => r.name).join(', ');
      hinweise.push({
        code: 'daily_below_floor_region',
        text: `In ${regionList} liegt das Tagesbudget unter CHF 150 – Ausspielung dort nicht garantiert. Empfehlung: Region entfernen oder Budget erhöhen.`,
        priority: 3,
      });
    }
  }

  // Priorität 5: Optimizer-Status (primäre Empfehlung)
  if (ctx.optimizerStatusCode) {
    const text = OPTIMIZER_STATUS_TEXTS[ctx.optimizerStatusCode] ?? '';
    hinweise.push({ code: ctx.optimizerStatusCode, text, priority: 5 });
  }

  if (hinweise.length === 0) {
    hinweise.push({ code: 'ok', text: 'Konfiguration in Ordnung.', priority: 10 });
  }

  return hinweise.sort((a, b) => a.priority - b.priority);
}

// ─── Cap-Level-Inferenz (Fallback für user-definierte Laufzeit) ──────────────

function inferCapLevel(contacts: number, stimm: number, weeks: number): 1 | 2 | 3 {
  const targetFreqs = { 1: 3, 2: 5, 3: 6 } as const;
  const distances = ([1, 2, 3] as const).map(level => {
    const pool = stimm * getReachCap(stimm, level);
    const sat = 1 - Math.exp(-REACH_CURVE_K * contacts / pool);
    const reach = Math.min(pool * sat, stimm * MAX_REACH_CAP);
    const fw = reach > 0 ? contacts / (reach * weeks) : 0;
    return { level, distance: Math.abs(fw - targetFreqs[level]) };
  });
  return distances.sort((a, b) => a.distance - b.distance)[0].level;
}

// ─── Optimizer Status-Texte (Spec v3.4, Sektion 6) ──────────────────────────

const OPTIMIZER_STATUS_TEXTS: Partial<Record<HinweisCode, string>> = {
  'optimal_28d_standard':          'Empfehlung für deine Kampagne. Die 28-tägige Laufzeit deckt das Entscheidungsfenster rund um den Versand der Stimmunterlagen ab.',
  '28d_broad_reach_low_frequency': 'Diese Empfehlung setzt stärker auf breite Sichtbarkeit über das politische Entscheidungsfenster. Die durchschnittliche Kontaktfrequenz liegt leicht unter dem Idealwert. Für mehr Wiederholung pro Person empfehlen wir ein etwas höheres Budget.',
  'sprint_14d_thin_budget':        'Konzentrierter Schlussimpuls über 14 Tage. Für volle 28-Tage-Präsenz wäre das Budget eher knapp.',
  'sprint_14d_grosser_pool':       'Bei grossen Regionen wirkt eine konzentrierte 2-Wochen-Phase rund um den Vote stärker als verteilte Auslieferung. Empfohlen: Schlussimpuls in den letzten 2 Wochen vor der Abstimmung.',
  'sprint_14d_28d_unavailable':    '14-Tage-Schlussimpuls — bei diesem Budget die wirkungsvollste Laufzeit.',
  'aufbau_42d_thin_budget':        '6 Wochen Aufbau — sinnvoll für komplexere Themen oder wenn Bekanntheit aufgebaut werden soll.',
  'aufbau_42d_reach_premium':      '6 Wochen Laufzeit lohnt sich hier: deutlich mehr Personen werden erreicht als bei 4 Wochen.',
  'aufbau_42d_28d_unavailable':    'Längere Laufzeit verteilt das Budget besser über das Entscheidungsfenster.',
  'dominanzmodus':                 'Hohe Präsenz: jede erreichte Person sieht die Botschaft sehr oft. Zusätzliches Budget bringt in dieser Region kaum mehr Reichweite, aber stärkere Wiederholung.',
  'dominanzmodus_stark':           'Sehr hohe Frequenz pro Person. Ab diesem Budget empfehlen wir ein persönliches Gespräch zur Optimierung — z.B. Region erweitern oder Budget gezielter einsetzen.',
  'too_thin':                      'Budget reicht in dieser Konstellation nicht für eine wirkungsvolle Kampagne. Empfehlung: Region verkleinern oder Budget erhöhen.',
  'display_only_late_window':      'DOOH benötigt 10 Tage Vorlauf zur Freigabe. Bei dieser Abstimmung läuft die Kampagne als reines Online-Display.',
  'too_short_for_campaign':        'Für eine wirksame Kampagne braucht es mindestens 8 Tage Vorlauf bis zur Abstimmung.',
  'vote_passed':                   'Diese Abstimmung liegt in der Vergangenheit. Bitte neues Datum wählen.',
  'sprint_14d_vorlauf_constrained':  'Bei diesem Vorlauf ist 14 Tage die längste DOOH-buchbare Laufzeit. Für volle 28-Tage-Präsenz wäre mehr Zeit nötig.',
  'optimal_28d_vorlauf_constrained': '28 Tage decken das Entscheidungsfenster ab. Für 6 Wochen Aufbau wäre mehr Vorlauf nötig.',
};

// ─── Pfad-A-Optimizer v3.4 (7-Schritt-Algorithmus) ──────────────────────────

type OptimizerOut = {
  laufzeitDays: number;
  capLevel: 1 | 2 | 3;
  statusCode: HinweisCode;
};

function computeCombo(
  impressionsEffective: number,
  stimmTotal: number,
  level: 1 | 2 | 3,
  days: number,
): { days: number; level: 1 | 2 | 3; reach: number; fWeekly: number } {
  const weeks = days / 7;
  const poolCap = stimmTotal * getReachCap(stimmTotal, level);
  const ratio = poolCap > 0 ? impressionsEffective / poolCap : 0;
  const satFactor = 1 - Math.exp(-REACH_CURVE_K * ratio);
  const uniqueReach = Math.min(poolCap * satFactor, stimmTotal * MAX_REACH_CAP) * applyWearoutFactor(weeks);
  const fWeekly = uniqueReach > 0 ? (impressionsEffective / uniqueReach) / weeks : 0;
  return { days, level, reach: uniqueReach, fWeekly };
}

export function optimizeForBudget(budget: number, regions: Region[], daysUntilVote?: number | null): OptimizerOut {
  const deduped = dedupRegions(regions);
  const stimmTotal = sumStimm(deduped);
  if (stimmTotal === 0 || deduped.length === 0) {
    return { laufzeitDays: 14, capLevel: 1, statusCode: 'too_thin' };
  }

  // §7.0 DOOH-Vorlauf-Vorfilter
  if (daysUntilVote != null) {
    if (daysUntilVote < 1)  return { laufzeitDays: 14, capLevel: 1, statusCode: 'vote_passed' };
    if (daysUntilVote <= 7) return { laufzeitDays: 14, capLevel: 1, statusCode: 'too_short_for_campaign' };
  }

  const klass = deduped.length > 1
    ? klassifiziereMehrereRegionen(deduped)
    : klassifiziereRegion(deduped[0]);
  const doohBudget = budget * klass.split.dooh;
  const displayBudget = budget * klass.split.display;
  const doohContacts = (doohBudget / CPM_DOOH) * 1000;
  const displayContacts = (displayBudget / CPM_DISPLAY) * 1000;
  const impressionsEffective = (doohContacts + displayContacts) * IN_POOL_FACTOR;

  type Combo = { days: number; level: 1 | 2 | 3; reach: number; fWeekly: number };
  const LEVELS = [1, 2, 3] as const;

  // §7.0: nur buchbare Laufzeiten (DOOH-Vorlauf ≥ DOOH_CUTOFF_DAYS)
  const gueltigeLaufzeiten = daysUntilVote != null
    ? LAUFZEITEN_BASIS.filter(d => daysUntilVote - d >= DOOH_CUTOFF_DAYS)
    : [...LAUFZEITEN_BASIS];

  const filtered35d = !gueltigeLaufzeiten.includes(35);
  const filtered42d = !gueltigeLaufzeiten.includes(42);
  const filteredLong = filtered35d && filtered42d;
  const allLongFiltered = !gueltigeLaufzeiten.some(d => d > 14);

  // §7.3 Display-Only-Modus (keine Laufzeit erfüllt DOOH-Vorlauf)
  if (gueltigeLaufzeiten.length === 0) {
    const displayLaufzeit = Math.min(14, daysUntilVote! - 1);
    const displayImpressions = (budget / CPM_DISPLAY) * 1000 * IN_POOL_FACTOR;
    const displayCandidates = LEVELS.map(level => {
      const weeks = displayLaufzeit / 7;
      const poolCap = stimmTotal * getReachCap(stimmTotal, level);
      const ratio = poolCap > 0 ? displayImpressions / poolCap : 0;
      const satFactor = 1 - Math.exp(-REACH_CURVE_K * ratio);
      const reach = Math.min(poolCap * satFactor, stimmTotal * MAX_REACH_CAP) * applyWearoutFactor(weeks);
      const fWeekly = reach > 0 ? (displayImpressions / reach) / weeks : 0;
      return { level, reach, fWeekly };
    });
    const inBandDisplay = displayCandidates.filter(c => c.fWeekly >= F_MIN_WEEKLY && c.fWeekly <= F_MAX_WEEKLY);
    const bestDisplay = inBandDisplay.length > 0
      ? inBandDisplay.reduce((a, b) => b.reach > a.reach ? b : a)
      : displayCandidates.reduce((a, b) => b.fWeekly > a.fWeekly ? b : a);
    return { laufzeitDays: displayLaufzeit, capLevel: bestDisplay.level, statusCode: 'display_only_late_window' };
  }

  const allCombos: Combo[] = [];
  for (const days of gueltigeLaufzeiten) {
    for (const level of LEVELS) {
      allCombos.push(computeCombo(impressionsEffective, stimmTotal, level, days));
    }
  }

  const inBand = (c: Combo) => c.fWeekly >= F_MIN_WEEKLY && c.fWeekly <= F_MAX_WEEKLY;
  const inTolerance = (c: Combo) => c.fWeekly >= F_MIN_TOLERANCE && c.fWeekly < F_MIN_WEEKLY;
  const maxReach = (cs: Combo[]) =>
    cs.reduce((best, c) => {
      if (c.reach > best.reach) return c;
      if (c.reach === best.reach && c.days > best.days) return c;
      if (c.reach === best.reach && c.days === best.days && c.level > best.level) return c;
      return best;
    });

  // Schritt 1: Standard-Bucket 21d + 28d (§7.1 v3.5.3)
  const inBandStd = allCombos.filter(c => (c.days === 21 || c.days === 28) && inBand(c));
  if (inBandStd.length > 0) {
    let chosen = maxReach(inBandStd); // tie-break: längere Laufzeit gewinnt
    let status: HinweisCode = 'optimal_28d_standard';

    // Schritt 2: Toleranz bei gleicher Laufzeit (höheres Level mit Reach-Premium)
    const tolStd = allCombos.filter(c =>
      c.days === chosen.days && c.level > chosen.level && inTolerance(c) && c.reach >= REACH_PREMIUM_THRESHOLD * chosen.reach
    );
    if (tolStd.length > 0) {
      chosen = maxReach(tolStd);
      status = '28d_broad_reach_low_frequency';
    }

    // Schritt 3: Sprint-Override (nur grosse Pools)
    if (stimmTotal > LARGE_POOL_THRESHOLD) {
      const inBand14 = allCombos.filter(c => c.days === 14 && inBand(c));
      if (inBand14.length > 0) {
        const best14 = maxReach(inBand14);
        if (best14.reach > REACH_PREMIUM_THRESHOLD * chosen.reach) {
          return { laufzeitDays: 14, capLevel: best14.level, statusCode: 'sprint_14d_grosser_pool' };
        }
      }
    }

    // Schritt 4: Aufbau-Override 35d + 42d (§7.1 v3.5.3)
    const inBandLong4 = allCombos.filter(c => (c.days === 35 || c.days === 42) && inBand(c));
    if (inBandLong4.length > 0) {
      const bestLong = maxReach(inBandLong4);
      if (bestLong.reach > AUFBAU_PREMIUM_THRESHOLD * chosen.reach) {
        return { laufzeitDays: bestLong.days, capLevel: bestLong.level, statusCode: 'aufbau_42d_reach_premium' };
      }
      // Saturation-Tie-Break: Pool gesättigt (Reach gleich) → prefer long für tiefere Frequenz
      if (bestLong.reach >= chosen.reach * 0.99 && bestLong.fWeekly < chosen.fWeekly * 0.85) {
        return { laufzeitDays: bestLong.days, capLevel: bestLong.level, statusCode: 'aufbau_42d_reach_premium' };
      }
    }

    // Schritt 4b: Vorlauf-constrained — Schatten 35d+42d würden Premium triggern
    if (filteredLong) {
      const shadowLong = ([35, 42] as const).flatMap(d =>
        LEVELS.map(level => computeCombo(impressionsEffective, stimmTotal, level, d))
      ).filter(inBand);
      if (shadowLong.length > 0) {
        const bestShadow = maxReach(shadowLong);
        if (bestShadow.reach > AUFBAU_PREMIUM_THRESHOLD * chosen.reach) {
          status = 'optimal_28d_vorlauf_constrained';
        }
      }
    }

    return { laufzeitDays: chosen.days, capLevel: chosen.level, statusCode: status };
  }

  // Schritt 5: Standard-Bucket fail — Sprint (14d) oder Long (35d/42d)
  const inBandSprint = allCombos.filter(c => c.days === 14 && inBand(c));
  const inBandLong5 = allCombos.filter(c => (c.days === 35 || c.days === 42) && inBand(c));

  if (inBandSprint.length > 0 || inBandLong5.length > 0) {
    if (inBandSprint.length > 0 && inBandLong5.length === 0) {
      const best = maxReach(inBandSprint);
      const code = allLongFiltered ? 'sprint_14d_vorlauf_constrained' : 'sprint_14d_thin_budget';
      return { laufzeitDays: 14, capLevel: best.level, statusCode: code };
    }
    if (inBandLong5.length > 0 && inBandSprint.length === 0) {
      const best = maxReach(inBandLong5);
      return { laufzeitDays: best.days, capLevel: best.level, statusCode: 'aufbau_42d_thin_budget' };
    }
    const bestSprint = maxReach(inBandSprint);
    const bestLong = maxReach(inBandLong5);
    const codeSprint = allLongFiltered ? 'sprint_14d_vorlauf_constrained' : 'sprint_14d_28d_unavailable';
    if (bestSprint.reach >= bestLong.reach) {
      return { laufzeitDays: 14, capLevel: bestSprint.level, statusCode: codeSprint };
    }
    return { laufzeitDays: bestLong.days, capLevel: bestLong.level, statusCode: 'aufbau_42d_28d_unavailable' };
  }

  // Schritt 6: Dominanzmodus (alle Kombis > F_MAX_WEEKLY)
  if (allCombos.every(c => c.fWeekly > F_MAX_WEEKLY)) {
    const sorted = [...allCombos].sort((a, b) =>
      b.reach - a.reach || b.days - a.days || a.fWeekly - b.fWeekly
    );
    const best = sorted[0];
    const statusCode: HinweisCode = best.fWeekly > F_OVERKILL_THRESHOLD ? 'dominanzmodus_stark' : 'dominanzmodus';
    return { laufzeitDays: best.days, capLevel: best.level, statusCode };
  }

  // Schritt 7: Too Thin
  const sorted7 = [...allCombos].sort((a, b) => b.fWeekly - a.fWeekly);
  const best7 = sorted7[0];
  return { laufzeitDays: best7.days, capLevel: best7.level, statusCode: 'too_thin' };
}

// Backward-compat Export (gibt nur laufzeitDays zurück)
export function optimizeLaufzeitForBudget(budget: number, regions: Region[]): number {
  return optimizeForBudget(budget, regions).laufzeitDays;
}

// ─── Kern: calculateImpact ───────────────────────────────────────────────────

export function calculateImpact(input: {
  budget: number;
  laufzeitDays?: number;
  regions: Region[];
  mode?: 'budgetFirst' | 'paketLevel';   // default: 'budgetFirst'
  paketLevel?: 1 | 2 | 3;               // nur bei mode='paketLevel'
  daysUntilVote?: number | null;
  splitOverride?: { dooh: number; display: number }; // §8.7 display_only
  partnerCodeBoostPct?: number;          // 0–10; wirkt als CPM-Reduktion via CPM_LIST
}): ImpactResult {
  const regions = dedupRegions(input.regions);
  const stimmTotal = sumStimm(regions);
  const multiRegion = regions.length > 1;

  // Optimizer (nur budgetFirst ohne explizite Laufzeit)
  const optimizerOut = (input.mode !== 'paketLevel' && input.laufzeitDays === undefined)
    ? optimizeForBudget(input.budget, regions, input.daysUntilVote)
    : null;

  // Laufzeit: User-Wert oder Optimizer
  const laufzeitDays: number = input.laufzeitDays !== undefined
    ? input.laufzeitDays
    : (optimizerOut?.laufzeitDays ?? 14);

  // Channel-Split via region-buchbarkeit
  const klass = multiRegion
    ? klassifiziereMehrereRegionen(regions)
    : regions[0]
      ? klassifiziereRegion(regions[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };

  const isDisplayOnly = optimizerOut?.statusCode === 'display_only_late_window';
  const doohShare = input.splitOverride ? input.splitOverride.dooh : (isDisplayOnly ? 0 : klass.split.dooh);
  const displayShare = input.splitOverride ? input.splitOverride.display : (isDisplayOnly ? 1.0 : klass.split.display);
  const politScreensTotal = klass.politScreens;

  // Dynamischer Misch-CPM
  const mixedCpm = doohShare * CPM_DOOH + displayShare * CPM_DISPLAY;

  // Total-Kontakte aus Budget (EK-CPM inkl. OTS/Delivery eingepreist, Spec v3.6)
  const doohBudget = input.budget * doohShare;
  const displayBudget = input.budget * displayShare;
  const doohContacts = (doohBudget / CPM_DOOH) * 1000;
  const displayContacts = (displayBudget / CPM_DISPLAY) * 1000;
  let impressionsEffective = (doohContacts + displayContacts) * IN_POOL_FACTOR;

  // Channel-Puffer-Faktor: CPM_LIST enthält 10% Puffer ggü. mixedCpm.
  // Ohne Code → Faktor ~0.90 (gepufferte Anzeige).
  // Mit Direct-Code (boost=10) → Faktor 1.0 (heutige Mathematik).
  const boostPct = input.partnerCodeBoostPct ?? 0;
  const partnerCodeFactor = mixedCpm / (CPM_LIST * (1 - boostPct / 100));
  impressionsEffective *= partnerCodeFactor;

  // Laufzeit
  const laufzeitWeeks = laufzeitDays / 7;

  // Cap-Level (Optimizer bei budgetFirst; fix bei paketLevel; Fallback: inferCapLevel)
  const capLevel: 1 | 2 | 3 = (input.mode === 'paketLevel' && input.paketLevel)
    ? input.paketLevel
    : optimizerOut?.capLevel ?? inferCapLevel(impressionsEffective, stimmTotal, laufzeitWeeks);

  // Hofmans-Saturation Reach
  const poolCap = stimmTotal * getReachCap(stimmTotal, capLevel);
  const ratio = poolCap > 0 ? impressionsEffective / poolCap : 0;
  const saturationFactor = 1 - Math.exp(-REACH_CURVE_K * ratio);
  let uniqueReach = Math.min(poolCap * saturationFactor, stimmTotal * MAX_REACH_CAP);
  const capped = saturationFactor > 0.85 || uniqueReach >= stimmTotal * MAX_REACH_CAP * 0.99;

  // Wearout bei Laufzeit > 8 Wochen
  uniqueReach = uniqueReach * applyWearoutFactor(laufzeitWeeks);

  // Frequenz emergent
  const frequencyCampaign = uniqueReach > 0 ? impressionsEffective / uniqueReach : 0;
  const frequencyWeekly = laufzeitWeeks > 0 ? frequencyCampaign / laufzeitWeeks : 0;

  const band = getUncertaintyBand(politScreensTotal);

  const reachUniqueAbs = Math.round(uniqueReach);
  const reachUniqueLow = Math.round(Math.max(0, uniqueReach * (1 - band)) / 500) * 500;
  const reachUniqueHigh = Math.round(Math.min(poolCap, uniqueReach * (1 + band)) / 500) * 500;

  const reachUniqueLowPct = stimmTotal > 0 ? Math.round((reachUniqueLow / stimmTotal) * 100) : 0;
  const reachUniqueHighPct = stimmTotal > 0 ? Math.round((reachUniqueHigh / stimmTotal) * 100) : 0;

  // Decision-Engine-Signale
  const impactLevel: 'sichtbar' | 'praesenz' | 'dominanz' =
    capLevel === 1 ? 'sichtbar' : capLevel === 2 ? 'praesenz' : 'dominanz';

  const fWeekly = Math.round(frequencyWeekly * 10) / 10;

  const efficiencyStatus: 'too_thin' | 'balanced' | 'overkill' | 'capped' = capped
    ? 'capped'
    : fWeekly < F_MIN_WEEKLY ? 'too_thin'
    : fWeekly > F_MAX_WEEKLY ? 'overkill'
    : 'balanced';

  const targetFreqWeekly = capLevel === 1 ? 3 : capLevel === 2 ? 5 : 6;
  const recommendedAction: { action: string; target: number } | null =
    efficiencyStatus === 'too_thin'
      ? { action: 'reduce_laufzeit', target: Math.ceil(impressionsEffective / (targetFreqWeekly * poolCap)) }
      : efficiencyStatus === 'overkill'
      ? { action: 'reduce_budget', target: Math.round(poolCap * targetFreqWeekly * laufzeitWeeks / 1000 * mixedCpm) }
      : efficiencyStatus === 'capped'
      ? { action: 'expand_region_or_reduce_budget', target: Math.round(poolCap) }
      : null;

  // Hinweise
  const hinweise = buildHinweise({
    budget: input.budget,
    frequencyWeekly,
    laufzeitDays: laufzeitDays,
    laufzeitWeeks,
    screenKlasse: klass.klasse,
    cappedByRegion: capped,
    regionNames: regions.map(r => r.name),
    multiRegion,
    politScreensTotal,
    stimmTotal,
    reachUniqueAbs,
    regions,
    optimizerStatusCode: optimizerOut?.statusCode,
    mode: input.mode,
  });

  return {
    budget: input.budget,
    laufzeitDays: laufzeitDays,
    laufzeitWeeks,
    reachUniqueLow,
    reachUniqueHigh,
    reachUniqueAbs,
    reachUniqueLowPct,
    reachUniqueHighPct,
    frequencyCampaign: Math.round(frequencyCampaign * 10) / 10,
    frequencyWeekly: fWeekly,
    stimmTotal,
    poolCap: Math.round(poolCap),
    doohShare,
    displayShare,
    screenKlasse: klass.klasse,
    capLevel,
    impactLevel,
    efficiencyStatus,
    recommendedAction,
    cappedByRegion: capped,
    hinweise,
  };
}

// ─── Pool-Tier-Budget (Spec v3.8 §4) ─────────────────────────────────────────

function getPoolTier(pool: number): 'A' | 'B' | 'C' | 'D' {
  if (pool < 100_000) return 'A';
  if (pool < 300_000) return 'B';
  if (pool <= 700_000) return 'C';
  return 'D';
}

const TIER_BUDGET: Record<'A' | 'B' | 'C' | 'D', Record<PaketKey, number>> = {
  A: { sichtbar:  3_500, praesenz:  6_000, dominanz: 10_000 },
  B: { sichtbar:  5_000, praesenz:  9_000, dominanz: 15_000 },
  C: { sichtbar:  7_500, praesenz: 14_000, dominanz: 24_000 },
  D: { sichtbar: 10_000, praesenz: 18_000, dominanz: 30_000 },
};

function getPkgBudget(stimmTotal: number, key: PaketKey): number {
  return TIER_BUDGET[getPoolTier(stimmTotal)][key];
}

// ─── buildPackages — Pfad B (drei Pakete) ────────────────────────────────────

export function buildPackages(input: {
  regions: Region[];
  daysUntilVote?: number | null;
  partnerCodeBoostPct?: number;
}): PakeResult {
  const regions = dedupRegions(input.regions);
  const stimmTotal = sumStimm(regions);
  const multiRegion = regions.length > 1;

  const klass = multiRegion
    ? klassifiziereMehrereRegionen(regions)
    : regions[0]
      ? klassifiziereRegion(regions[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };

  const PKG_MIN: Record<PaketKey, number> = {
    sichtbar: 4000,
    praesenz: 6000,
    dominanz: 9000,
  };

  const buildOne = (key: PaketKey): Paket => {
    const spec = PAKET_SPECS[key];
    const laufzeitWeeks = spec.laufzeitDays / 7;

    // §8.6 DOOH-Vorlauf-Constraint
    const vorlauf = input.daysUntilVote != null ? input.daysUntilVote - spec.laufzeitDays : Infinity;
    const deliveryMode: 'standard' | 'display_only' = vorlauf >= DOOH_CUTOFF_DAYS ? 'standard' : 'display_only';
    const availability: 'available' | 'unavailable' = vorlauf < 1 ? 'unavailable' : 'available';

    // §8.1 v3.8: festes Tier-Budget aus Pool-Tier-Matrix (§4)
    const finalBudget = getPkgBudget(stimmTotal, key);

    // §8.1 v3.8: requiresConsultation = Komplexitäts-Trigger, nicht budgetgetrieben
    // TODO: spezielle_laufzeit + manueller_setup_bedarf fehlen noch (kein Signal im Paket-Pfad)
    const requiresConsultation = regions.length > 1;

    // §8.1 v3.13: fKampagne (Kampagnenkontakte) ist INPUT, Reach ist OUTPUT. laufzeitWeeks raus aus Formel.
    const split = deliveryMode === 'display_only' ? { dooh: 0, display: 1.0 } : klass.split;
    let impressionsInPool =
      ((finalBudget * split.dooh / CPM_DOOH) + (finalBudget * split.display / CPM_DISPLAY)) * 1000 * IN_POOL_FACTOR;
    if (input.partnerCodeBoostPct) {
      impressionsInPool /= (1 - input.partnerCodeBoostPct / 100);
    }
    const poolCap = stimmTotal * getReachCap(stimmTotal, spec.reachCapLevel);
    const fKampagne = spec.frequencyWeekly; // Kampagnenkontakte fix (Feld-Name folgt UI-Migration)
    const reachLinear = poolCap > 0 && fKampagne > 0
      ? impressionsInPool / fKampagne
      : 0;
    const reach = poolCap > 0
      ? poolCap * (1 - Math.exp(-REACH_CURVE_K * reachLinear / poolCap))
      : 0;
    const band = getUncertaintyBand(klass.politScreens);
    const reachUniqueAbs  = Math.round(reach);
    const reachUniqueLow  = Math.round(Math.max(0, reach * (1 - band)) / 500) * 500;
    const reachUniqueHigh = Math.round(Math.min(poolCap, reach * (1 + band)) / 500) * 500;
    const reachUniqueLowPct  = stimmTotal > 0 ? Math.round((reachUniqueLow  / stimmTotal) * 100) : 0;
    const reachUniqueHighPct = stimmTotal > 0 ? Math.round((reachUniqueHigh / stimmTotal) * 100) : 0;

    // §8.8 Qualitätsstatus gegen Effective-Frequency-Korridor (3–10 Kampagnenkontakte)
    const qualityStatus: 'balanced' | 'high_frequency' | 'thin' =
      fKampagne > F_MAX_WEEKLY ? 'high_frequency'  // F_MAX_WEEKLY = 10, entspricht EFFECTIVE_FREQUENCY_MAX
      : fKampagne < F_MIN_WEEKLY ? 'thin'           // F_MIN_WEEKLY = 3, entspricht EFFECTIVE_FREQUENCY_MIN
      : 'balanced';
    const contextFlag: 'mikro_limited' | undefined =
      (stimmTotal < 20000 && key === 'sichtbar') ? 'mikro_limited' : undefined;

    return {
      key,
      name: spec.name,
      budget: finalBudget,
      laufzeitDays: spec.laufzeitDays,
      laufzeitWeeks,
      frequencyCampaign: fKampagne,                                         // fix (Input), primär
      frequencyWeekly:   laufzeitWeeks > 0 ? fKampagne / laufzeitWeeks : 0, // abgeleitet, informativ
      reachUniqueLow,
      reachUniqueHigh,
      reachUniqueAbs,
      reachUniqueLowPct,
      reachUniqueHighPct,
      recommended: false, // set below after all three are built
      deliveryMode,
      availability,
      qualityStatus,
      contextFlag,
      requiresConsultation,
      doohShare: split.dooh,
    };
  };

  const sichtbar = buildOne('sichtbar');
  const praesenz  = buildOne('praesenz');
  const dominanz  = buildOne('dominanz');

  // §9.3 Empfehlung: praesenz → sichtbar → dominanz (nach Availability + requiresConsultation)
  const recommended: PaketKey =
    praesenz.availability === 'available' && !praesenz.requiresConsultation ? 'praesenz'
    : sichtbar.availability === 'available' && !sichtbar.requiresConsultation ? 'sichtbar'
    : dominanz.availability === 'available' && !dominanz.requiresConsultation ? 'dominanz'
    : 'praesenz';

  // §9.3 v3.9: Badge immer auf default_recommended_package — kein Frequenz-Guardrail
  sichtbar.recommended = 'sichtbar' === recommended;
  praesenz.recommended  = 'praesenz' === recommended;
  dominanz.recommended  = 'dominanz' === recommended;

  return {
    sichtbar,
    praesenz,
    dominanz,
    recommended,
    stimmTotal,
    screenKlasse: klass.klasse,
    freqGuardrail: false, // deprecated v3.9 — always false; kept for StepPackages backward-compat
    customHint: ['C', 'D'].includes(getPoolTier(stimmTotal)),
  };
}

// ─── checkDoohAvailability — Custom-Pfad DOOH-Zwei-Zustand (Regelkatalog v3.7) ─
//
// Prüft Setup-Vorlauf (10 Werktage) und Inventar-Klassifizierung.
// Wenn campaignStart undefined: Vorlauf-Check wird übersprungen (Rückwärtskompatibilität).
// Gibt channelMix = Klassen-Max-Schwelle zurück (aus region-buchbarkeit.ts).
// Multi-Region: klassifiziereMehrereRegionen() aggregiert (1:1 wiederverwenden).

export function checkDoohAvailability(
  regions: Region[],
  campaignStart: Date | undefined,
  today: Date = new Date(),
): DoohAvailability {
  if (campaignStart !== undefined) {
    const fruehesterStart = addBusinessDays(today, SETUP_VORLAUF_WERKTAGE);
    if (campaignStart < fruehesterStart) {
      return { available: false, reason: 'setup_vorlauf' };
    }
  }

  const klass = regions.length > 1
    ? klassifiziereMehrereRegionen(regions)
    : regions[0]
      ? klassifiziereRegion(regions[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };

  if (klass.klasse === 'display-dominant' && klass.politScreens === 0) {
    return { available: false, reason: 'no_inventory' };
  }

  const channelMix =
    klass.klasse === 'voll'     ? MAX_DOOH_SHARE_FULL :
    klass.klasse === 'begrenzt' ? MAX_DOOH_SHARE_LIMITED :
    MAX_DOOH_SHARE_DISPLAY_DOMINANT;

  return { available: true, channelMix };
}

// ─── getCampaignWindow — Custom-Pfad DOOH-Feasibility + effectiveLaufzeitDays ──
//
// Einziger Aufruf pro Render in StepPackages; alle Custom-Konsumenten lesen daraus.
// Timing-Logik: campaignStart = voteDate − requestedLaufzeitDays.
// Falls campaignStart < doohEarliestStart → display_only; effectiveLaufzeitDays per §7.3.
// doohShare=0 ist autoritativ bei display_only (unabhängig von channelMix).

export function getCampaignWindow(
  regions: Region[],
  voteDate: Date | null,
  requestedLaufzeitDays: number,
  today: Date = new Date(),
): CampaignWindow {
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const daysUntilVote = voteDate ? Math.ceil((voteDate.getTime() - todayMs) / 86400000) : null;
  const doohEarliestStart = addBusinessDays(today, SETUP_VORLAUF_WERKTAGE);
  const campaignStartRaw = voteDate
    ? new Date(voteDate.getTime() - requestedLaufzeitDays * 86400000)
    : null;

  if (campaignStartRaw !== null && campaignStartRaw < doohEarliestStart) {
    const effectiveLaufzeitDays = Math.min(
      requestedLaufzeitDays,
      Math.max(LAUFZEIT_MIN_DAYS, (daysUntilVote ?? 1) - 1),
    );
    return {
      modus: 'display_only',
      doohShare: 0,
      displayShare: 1,
      earliestStart: new Date(voteDate!.getTime() - effectiveLaufzeitDays * 86400000),
      effectiveLaufzeitDays,
      daysUntilVote,
    };
  }

  const deduped = dedupRegions(regions);
  const doohAvail = checkDoohAvailability(deduped, campaignStartRaw ?? undefined, today);

  if (!doohAvail.available) {
    return {
      modus: 'display_only',
      doohShare: 0,
      displayShare: 1,
      earliestStart: campaignStartRaw ?? doohEarliestStart,
      effectiveLaufzeitDays: requestedLaufzeitDays,
      daysUntilVote,
    };
  }

  return {
    modus: 'dooh_mix',
    doohShare: doohAvail.channelMix,
    displayShare: 1 - doohAvail.channelMix,
    earliestStart: doohEarliestStart,
    effectiveLaufzeitDays: requestedLaufzeitDays,
    daysUntilVote,
  };
}

// ─── calculateImpactCustom — Custom-Pfad Wirkungsfokus-Modell (Regelkatalog v3.7) ─
//
// Simulation ohne Optimizer: Wirkungsfokus bestimmt Ziel-Frequenz (invers in Reach).
// DOOH-Anteil wird intern aus Region-Klassifizierung bestimmt (nicht config.doohShare).
// freqWeekly/doohShare bleiben im Param für Rückwärtskompatibilität (deprecated, Phase B).
//
// Reach-Formel (v3.13: Kampagnenfrequenz als direkter Input):
//   fKampagneCustom = WIRKUNGSFOKUS_FREQUENZ[wirkungsfokus]  (Kampagnenkontakte)
//   reachLinear     = impressionenImPool / fKampagneCustom    (laufzeitWochen raus)
//   poolCap         = stimmTotal × getReachCap(stimmTotal, capLevel)
//   reach           = poolCap × (1 − e^(−k × reachLinear / poolCap))
//
// saturationRatio = reachLinear / poolCap (kann > 1.0 sein)

export function calculateImpactCustom({
  budget,
  laufzeitDays,
  freqWeekly: _freqWeekly,
  doohShare: _doohShare,
  regions,
  wirkungsfokus,
  campaignStart,
}: {
  budget: number;
  laufzeitDays: number;
  freqWeekly: number;
  doohShare: number;
  regions: Region[];
  wirkungsfokus?: Wirkungsfokus;
  campaignStart?: Date;
}): CustomImpactResult {
  const deduped = dedupRegions(regions);
  const stimmTotal = sumStimm(deduped);
  // Kalendertage für Wirkungsdauer (Regelkatalog v3.7: Zeitachsen-Trennung)
  const laufzeitWeeks = laufzeitDays / 7;

  // v3.13: Kampagnenkontakte aus Wirkungsfokus (Default: ausgewogen)
  const fKampagneCustom = WIRKUNGSFOKUS_FREQUENZ[wirkungsfokus ?? 'ausgewogen'];

  // DOOH-Verfügbarkeit → doohAnteil
  const doohAvail = checkDoohAvailability(deduped, campaignStart);
  const doohAnteil = doohAvail.available ? doohAvail.channelMix : 0;

  // Channel-Mix
  const cpmEffective = doohAnteil * CPM_DOOH + (1 - doohAnteil) * CPM_DISPLAY;
  const impressionsTotal = budget > 0 && cpmEffective > 0
    ? (budget * 1000) / cpmEffective
    : 0;
  const doohBudget    = budget * doohAnteil;
  const displayBudget = budget * (1 - doohAnteil);

  // In-Pool-Impressionen
  const impressionsInPool = impressionsTotal * IN_POOL_FACTOR;

  // GRPs (Gross Rating Points)
  const grps = stimmTotal > 0 ? (impressionsTotal / stimmTotal) * 100 : 0;

  // DOOH-Screens aus Region-Klassifikation
  const klass = deduped.length > 1
    ? klassifiziereMehrereRegionen(deduped)
    : deduped[0]
      ? klassifiziereRegion(deduped[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };
  const screens = klass.politScreens;

  // Pool-Cap: capLevel aus Wirkungsfokus (breit=L3, ausgewogen=L2, verankerung=L1), Spec §4 v3.11/v3.13
  const focusCapLevel: 1 | 2 | 3 = ({ breit: 3, ausgewogen: 2, verankerung: 1 } as const)[wirkungsfokus ?? 'ausgewogen'];
  const capLevel: 1 | 2 | 3 = stimmTotal > 0 ? focusCapLevel : 1;
  const poolCap = stimmTotal > 0 ? stimmTotal * getReachCap(stimmTotal, capLevel) : 0;

  // Reach via Kampagnenfrequenz (v3.13): fKampagneCustom direkt, laufzeitWeeks raus aus Formel
  let reach = 0;
  let reachLinear = 0;
  if (poolCap > 0 && fKampagneCustom > 0) {
    reachLinear = impressionsInPool / fKampagneCustom;
    reach = poolCap * (1 - Math.exp(-REACH_CURVE_K * reachLinear / poolCap));
  }
  const reachPercent = stimmTotal > 0 ? (reach / stimmTotal) * 100 : 0;

  // Sättigungs-Positionierung
  const saturationRatio = poolCap > 0 ? reachLinear / poolCap : 0;
  const saturationPosition: 'unter' | 'sweet' | 'ueber' =
    saturationRatio < 0.4  ? 'unter' :
    saturationRatio <= 1.0 ? 'sweet' :
    'ueber';

  const band = getUncertaintyBand(screens);
  const reachUniqueLow  = Math.round(Math.max(0, reach * (1 - band)) / 500) * 500;
  const reachUniqueHigh = Math.round(Math.min(poolCap, reach * (1 + band)) / 500) * 500;

  return {
    reach:             Math.round(reach),
    reachPercent:      Math.round(reachPercent * 10) / 10,
    reachUniqueLow,
    reachUniqueHigh,
    grps:              Math.round(grps * 10) / 10,
    impressionsTotal:  Math.round(impressionsTotal),
    screens,
    cpmEffective:      Math.round(cpmEffective * 100) / 100,
    doohBudget,
    displayBudget,
    saturationPosition,
    saturationRatio:   Math.round(saturationRatio * 1000) / 1000,
  };
}

// ─── calculateSweetSpotCustom — Inverse Sweet-Spot-Schätzung (Regelkatalog v3.7) ─
//
// Findet das Budget, das reachLinear / poolCap = SWEET_SPOT_TARGET_SATURATION ergibt.
// Inverse Berechnung: Sättigungsgrad → reachLinear → impressionenImPool → Budget.
// Cap-Level fokusabhängig: breit=3, ausgewogen=2, verankerung=1 (Spec §4 v3.11).
// Reach-Rückgabe: poolCap × (1 − e^(−k × SWEET_SPOT_TARGET_SATURATION)).

export function calculateSweetSpotCustom(
  regions: Region[],
  wirkungsfokus: Wirkungsfokus,
  laufzeitDays: number,
  doohAnteil: number,
): { budget: number; reach: number } {
  const deduped = dedupRegions(regions);
  const stimmTotal = sumStimm(deduped);
  if (stimmTotal === 0) return { budget: 0, reach: 0 };

  // v3.13: fKampagneCustom direkt (kein × laufzeitWeeks mehr). laufzeitDays bleibt ignoriert (Referenz-Budget).
  const fKampagneCustom = WIRKUNGSFOKUS_FREQUENZ[wirkungsfokus];
  const focusLevel      = ({ breit: 3, ausgewogen: 2, verankerung: 1 } as const)[wirkungsfokus];
  const poolCap         = stimmTotal * getReachCap(stimmTotal, focusLevel);

  const reachLinearTarget    = SWEET_SPOT_TARGET_SATURATION * poolCap;
  const impressionenImPool   = reachLinearTarget * fKampagneCustom;
  const impressionen         = impressionenImPool / IN_POOL_FACTOR;
  const mischCPM             = doohAnteil * CPM_DOOH + (1 - doohAnteil) * CPM_DISPLAY;
  const budget               = mischCPM > 0 ? (impressionen * mischCPM) / 1000 : 0;
  const reach                = poolCap * (1 - Math.exp(-REACH_CURVE_K * SWEET_SPOT_TARGET_SATURATION));

  return { budget: Math.round(budget), reach: Math.round(reach) };
}

export const GEMEINDE_NICHT_GEFUNDEN_HINWEIS =
  'Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen ' +
  'Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — ' +
  'wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte ' +
  'Gemeinde.';
