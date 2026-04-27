// VIO Preislogik — Single Source of Truth
//
// Ersetzt schrittweise lib/vio-paketlogik.ts und lib/b2b-paketlogik.ts.
// Diese Datei wird in Paket B.2/B.3 in die UI-Komponenten eingebunden.
//
// Basis: Regelkatalog v2.1 (public/vio-regelkatalog-politik-v2.md)
// Erstellt: 22.04.2026

import type { Region } from './regions';
import { klassifiziereMehrereRegionen, klassifiziereRegion } from './region-buchbarkeit';

// ─── Konstanten ──────────────────────────────────────────────────────────────

export const B_MIN = 4000;               // CHF Mindestbudget (hard floor)
export const B_NUDGE_SOFT = 20000;       // CHF dezenter Calendly-Nudge
export const B_NUDGE_STRONG = 30000;     // CHF prominente Beratungs-Bubble
export const B_HARD_MAX = 100000;        // CHF absolute Obergrenze (Hard Stop)

export const DAILY_MIN = 150;            // CHF Tagesbudget-Floor (Splicky)
export const LAUFZEIT_MIN_DAYS = 7;
export const LAUFZEIT_MAX_DAYS = 84;     // 12 Wochen

export const F_MIN_WEEKLY = 3;           // unter dieser Schwelle: unwirksam
export const F_REC_WEEKLY = 5;           // VIO-Empfehlung Präsenz
export const F_MAX_WEEKLY = 10;          // ab hier Werbemüdigkeit

export const MAX_REACH_CAP = 0.80;       // max 80% des Pools erreichbar
export const EXPONENT_BUDGET_LAUFZEIT = 0.75;  // konkave Kopplung

// CPM-Tarife (inkl. VIO-Marge)
export const CPM_DOOH = 50;
export const CPM_DISPLAY = 15;

// Delivery-Faktoren (DSP-Kalibrierung) — TBD mit Dani validieren
export const DELIVERY_DOOH = 0.75;
export const DELIVERY_DISPLAY = 0.90;

export const REACH_CURVE_K = 0.4;   // Hofmans-Steilheit, CH-Politik kalibriert
export const ER3_BETA = 5.0;        // Effective Reach Heterogenität (Long-Tail)
export const ER3_OFFSET = 0.5;      // Schwelle avg_freq für >=3 Kontakte

// TODO: mit ersten 10 Splicky-Kampagnen validieren (aktuell CH-DOOH-Branchenschätzung)
// Splicky CPM = Cost per 1000 Ad Plays (nicht Audience Contacts) → Multiplier nötig
export const DOOH_OTS_MULTIPLIER = 2.5;

// ─── Typen ───────────────────────────────────────────────────────────────────

export type HinweisCode =
  | 'ok'
  | 'below_min_budget'
  | 'too_thin'
  | 'overkill'
  | 'daily_below_floor'
  | 'capped_by_region'
  | 'screen_class_begrenzt'
  | 'screen_class_display_dom'
  | 'screen_class_multi_mixed'
  | 'no_dooh_inventory'
  | 'calendly_nudge_soft'
  | 'calendly_nudge_strong'
  | 'hard_stop_budget';

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
  reachVon: number;
  reachBis: number;
  reachMitte: number;
  reachVonPct: number;
  reachBisPct: number;

  // Frequenz
  frequencyCampaign: number;  // z.B. 20 (= Ø 20× pro Person über die Kampagne)
  frequencyWeekly: number;    // z.B. 5 (intern zur Validierung)

  // Pool
  stimmTotal: number;
  poolCap: number;            // effektiv erreichbare Pool-Grösse

  // Channel
  doohShare: number;          // z.B. 0.70
  displayShare: number;       // z.B. 0.30
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';

  // Hofmans
  impPerCapita: number;        // Kontakte / Stimmberechtigte
  reachFactor: number;         // Hofmans-Sättigungsfaktor (0–1)
  uniqueReachHofmans: number;  // Absolute Unique Reach (vor Pool-Cap)
  er3Factor: number;           // Effective Reach ≥3 Faktor (0–1)
  er3Reach: number;            // Absoluter Effective Reach 3+

  // Flags
  cappedByRegion: boolean;
  hinweise: Hinweis[];
}

export type PaketKey = 'sichtbar' | 'praesenz' | 'dominanz';

export interface Paket {
  key: PaketKey;
  name: string;
  budget: number;
  laufzeitDays: number;
  laufzeitWeeks: number;
  frequencyCampaign: number;
  frequencyWeekly: number;
  reachVon: number;
  reachBis: number;
  reachMitte: number;
  reachVonPct: number;
  reachBisPct: number;
  er3Factor: number;
  er3Reach: number;
  recommended: boolean;
}

export interface PakeResult {
  sichtbar: Paket;
  praesenz: Paket;
  dominanz: Paket;
  recommended: PaketKey;
  stimmTotal: number;
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';
}

// ─── Paket-Definitionen (politisch-stark kalibriert) ─────────────────────────

const PAKET_SPECS: Record<PaketKey, {
  name: string;
  weeklyFreq: number;
  laufzeitDays: number;
  reachCapLevel: 1 | 2 | 3;
}> = {
  sichtbar: { name: 'Sichtbar', weeklyFreq: 3, laufzeitDays: 14, reachCapLevel: 1 },
  praesenz: { name: 'Präsenz', weeklyFreq: 5, laufzeitDays: 28, reachCapLevel: 2 },
  dominanz: { name: 'Dominanz', weeklyFreq: 8, laufzeitDays: 35, reachCapLevel: 3 },
};

// ─── Reach-Caps nach Pool-Grösse (tiered) ────────────────────────────────────

function getReachCap(stimmTotal: number, level: 1 | 2 | 3): number {
  if (stimmTotal < 50000) {
    return level === 1 ? 0.15 : level === 2 ? 0.30 : 0.45;
  }
  if (stimmTotal < 200000) {
    return level === 1 ? 0.08 : level === 2 ? 0.15 : 0.25;
  }
  if (stimmTotal < 500000) {
    return level === 1 ? 0.04 : level === 2 ? 0.08 : 0.14;
  }
  return level === 1 ? 0.02 : level === 2 ? 0.04 : 0.08;
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
  if (budget < 6000) return { minDays: 7, maxDays: 21 };
  if (budget < 15000) return { minDays: 14, maxDays: 35 };
  if (budget < 30000) return { minDays: 21, maxDays: 56 };
  return { minDays: 28, maxDays: 84 };
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
  return Math.max(factor, 0.80);
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

// ─── Hinweis-Generierung ─────────────────────────────────────────────────────

function buildHinweise(ctx: {
  budget: number;
  frequencyWeekly: number;
  laufzeitDays: number;
  screenKlasse: 'voll' | 'begrenzt' | 'display-dominant';
  cappedByRegion: boolean;
  regionNames: string[];
  multiRegion: boolean;
  politScreensTotal: number;
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

  // Priorität 2: Empfehlungen
  if (ctx.frequencyWeekly < 0.5) {
    const emptohleneWochen = Math.max(1, Math.floor(ctx.laufzeitDays / 7 / 2));
    hinweise.push({
      code: 'too_thin',
      text: `Dein Budget ist für ${Math.round(ctx.laufzeitDays / 7)} Wochen zu dünn verteilt. Empfehlung: Laufzeit auf ${emptohleneWochen} Wochen reduzieren.`,
      priority: 2,
    });
  }
  if (ctx.frequencyWeekly > F_MAX_WEEKLY) {
    hinweise.push({
      code: 'overkill',
      text: 'Deine Frequenz ist sehr hoch. Empfehlung: Budget reduzieren oder Region erweitern.',
      priority: 2,
    });
  }
  const dailyBudget = ctx.budget / ctx.laufzeitDays;
  if (dailyBudget < DAILY_MIN) {
    hinweise.push({
      code: 'daily_below_floor',
      text: 'Tagesbudget unter CHF 150 – Ausspielung nicht garantiert. Kürzere Laufzeit empfohlen.',
      priority: 2,
    });
  }

  // Priorität 3: Info
  if (ctx.cappedByRegion) {
    const regionText = ctx.regionNames.length === 1 ? ctx.regionNames[0] : 'deiner Auswahl';
    hinweise.push({
      code: 'capped_by_region',
      text: `Maximale Reichweite in ${regionText} erreicht. Mehr Budget bringt keine zusätzlichen Personen.`,
      priority: 3,
    });
  }

  // Priorität 4: Nudges
  if (ctx.budget >= B_NUDGE_STRONG) {
    hinweise.push({
      code: 'calendly_nudge_strong',
      text: 'Grosse Kampagne geplant? Ab CHF 30\'000 empfehlen wir ein persönliches Gespräch. Du kannst aber auch direkt weiterbuchen.',
      priority: 4,
    });
  } else if (ctx.budget >= B_NUDGE_SOFT) {
    hinweise.push({
      code: 'calendly_nudge_soft',
      text: 'Ab CHF 20\'000 bieten wir persönliche Beratung.',
      priority: 4,
    });
  }

  // Priorität 5: Kontext (Screen-Klasse)
  if (ctx.politScreensTotal === 0) {
    hinweise.push({
      code: 'no_dooh_inventory',
      text: 'Keine DOOH-Flächen verfügbar. Kampagne läuft zu 100% als Display.',
      priority: 5,
    });
  } else if (ctx.multiRegion && ctx.screenKlasse !== 'voll') {
    hinweise.push({
      code: 'screen_class_multi_mixed',
      text: ctx.screenKlasse === 'begrenzt'
        ? 'In deiner Region-Auswahl ist DOOH-Inventar teilweise begrenzt — der Online-Anteil wird entsprechend erhöht.'
        : 'In Teilen deiner Region-Auswahl erreichen wir deine Zielgruppe primär online.',
      priority: 5,
    });
  } else if (!ctx.multiRegion && ctx.screenKlasse === 'begrenzt') {
    const name = ctx.regionNames[0] ?? 'deiner Region';
    hinweise.push({
      code: 'screen_class_begrenzt',
      text: `In ${name} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal.`,
      priority: 5,
    });
  } else if (!ctx.multiRegion && ctx.screenKlasse === 'display-dominant') {
    const name = ctx.regionNames[0] ?? 'deiner Region';
    hinweise.push({
      code: 'screen_class_display_dom',
      text: `In ${name} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt.`,
      priority: 5,
    });
  }

  return hinweise.sort((a, b) => a.priority - b.priority);
}

// ─── Kern: calculateImpact — Pfad A (Budget-first) ───────────────────────────

export function calculateImpact(input: {
  budget: number;
  laufzeitDays: number;
  regions: Region[];
}): ImpactResult {
  const regions = dedupRegions(input.regions);
  const stimmTotal = sumStimm(regions);
  const multiRegion = regions.length > 1;

  // Channel-Split via region-buchbarkeit
  const klass = multiRegion
    ? klassifiziereMehrereRegionen(regions)
    : regions[0]
      ? klassifiziereRegion(regions[0])
      : { klasse: 'voll' as const, politScreens: 0, split: { dooh: 0.70, display: 0.30 }, hinweis: null };

  const doohShare = klass.split.dooh;
  const displayShare = klass.split.display;
  const politScreensTotal = klass.politScreens;

  // Dynamischer Misch-CPM
  const mixedCpm = doohShare * CPM_DOOH + displayShare * CPM_DISPLAY;
  void mixedCpm; // used indirectly via budget split below

  // Total-Kontakte aus Budget (mit Delivery-Faktoren + OTS-Multiplier für DOOH)
  const doohBudget = input.budget * doohShare;
  const displayBudget = input.budget * displayShare;
  const doohContacts = (doohBudget / CPM_DOOH) * 1000 * DELIVERY_DOOH * DOOH_OTS_MULTIPLIER;
  const displayContacts = (displayBudget / CPM_DISPLAY) * 1000 * DELIVERY_DISPLAY;
  const impressionsEffective = doohContacts + displayContacts;

  // Laufzeit
  const laufzeitWeeks = input.laufzeitDays / 7;

  // Hofmans-Sättigungskurve
  const impPerCapita = stimmTotal > 0 ? impressionsEffective / stimmTotal : 0;
  const reachFactor = 1 - 1 / (1 + REACH_CURVE_K * impPerCapita);
  const uniqueReachHofmans = stimmTotal * reachFactor;

  // Pool-Cap
  const poolCap = stimmTotal * MAX_REACH_CAP;
  let uniqueReach = Math.min(uniqueReachHofmans, poolCap);
  const cappedByRegion = uniqueReachHofmans > poolCap;

  // Wearout bei Laufzeit > 8 Wochen
  uniqueReach = uniqueReach * applyWearoutFactor(laufzeitWeeks);

  // Effective Reach 3+
  const avgFreq = uniqueReach > 0 ? impressionsEffective / uniqueReach : 0;
  const er3Factor = Math.max(0, 1 - Math.exp(-(avgFreq - ER3_OFFSET) / ER3_BETA));
  const er3Reach = Math.round(uniqueReach * er3Factor);

  // Effektive Frequenzen (read-only für UI)
  const frequencyWeekly = (uniqueReach > 0 && laufzeitWeeks > 0)
    ? impressionsEffective / (uniqueReach * laufzeitWeeks)
    : 0;
  const frequencyCampaign = frequencyWeekly * laufzeitWeeks;

  // Unsicherheits-Band je nach Screen-Klasse
  const band = klass.klasse === 'voll' ? 0.07
    : klass.klasse === 'begrenzt' ? 0.10
    : 0.13;

  const reachMitte = Math.round(uniqueReach);
  const reachVon = Math.round(Math.max(0, uniqueReach * (1 - band)) / 500) * 500;
  const reachBis = Math.round(Math.min(poolCap, uniqueReach * (1 + band)) / 500) * 500;

  const reachVonPct = stimmTotal > 0 ? Math.round((reachVon / stimmTotal) * 100) : 0;
  const reachBisPct = stimmTotal > 0 ? Math.round((reachBis / stimmTotal) * 100) : 0;

  // Hinweise
  const hinweise = buildHinweise({
    budget: input.budget,
    frequencyWeekly,
    laufzeitDays: input.laufzeitDays,
    screenKlasse: klass.klasse,
    cappedByRegion,
    regionNames: regions.map(r => r.name),
    multiRegion,
    politScreensTotal,
  });

  return {
    budget: input.budget,
    laufzeitDays: input.laufzeitDays,
    laufzeitWeeks,
    reachVon,
    reachBis,
    reachMitte,
    reachVonPct,
    reachBisPct,
    frequencyCampaign: Math.round(frequencyCampaign * 10) / 10,
    frequencyWeekly: Math.round(frequencyWeekly * 10) / 10,
    stimmTotal,
    poolCap: Math.round(poolCap),
    doohShare,
    displayShare,
    screenKlasse: klass.klasse,
    cappedByRegion,
    impPerCapita: Math.round(impPerCapita * 10) / 10,
    reachFactor: Math.round(reachFactor * 1000) / 1000,
    uniqueReachHofmans: Math.round(uniqueReachHofmans),
    er3Factor: Math.round(er3Factor * 1000) / 1000,
    er3Reach,
    hinweise,
  };
}

// ─── buildPackages — Pfad B (drei Pakete) ────────────────────────────────────

export function buildPackages(input: {
  regions: Region[];
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
    const reachCap = getReachCap(stimmTotal, spec.reachCapLevel);
    const targetReach = stimmTotal * reachCap;
    const laufzeitWeeks = spec.laufzeitDays / 7;

    // Kontakte pro CHF je Kanal (Umkehrung von calculateImpact)
    const doohYield = (1000 / CPM_DOOH) * DELIVERY_DOOH * DOOH_OTS_MULTIPLIER;
    const displayYield = (1000 / CPM_DISPLAY) * DELIVERY_DISPLAY;
    const mixedYield = klass.split.dooh * doohYield + klass.split.display * displayYield;
    const totalContactsNeeded = targetReach * spec.weeklyFreq * laufzeitWeeks;
    const rawBudget = totalContactsNeeded / mixedYield;
    const finalBudget = Math.max(PKG_MIN[key], roundBudget(rawBudget));

    // Reach-Range
    const band = klass.klasse === 'voll' ? 0.07
      : klass.klasse === 'begrenzt' ? 0.10
      : 0.13;
    const reachMitte = Math.round(targetReach);
    const reachVon = Math.round(Math.max(0, targetReach * (1 - band)) / 500) * 500;
    const reachBis = Math.round(targetReach * (1 + band) / 500) * 500;
    const reachVonPct = stimmTotal > 0 ? Math.round((reachVon / stimmTotal) * 100) : 0;
    const reachBisPct = stimmTotal > 0 ? Math.round((reachBis / stimmTotal) * 100) : 0;

    // Effective Reach 3+ für dieses Paket
    const pkgAvgFreq = spec.weeklyFreq * laufzeitWeeks;
    const pkgEr3Factor = Math.max(0, 1 - Math.exp(-(pkgAvgFreq - ER3_OFFSET) / ER3_BETA));
    const pkgEr3Reach = Math.round(reachMitte * pkgEr3Factor);

    return {
      key,
      name: spec.name,
      budget: finalBudget,
      laufzeitDays: spec.laufzeitDays,
      laufzeitWeeks,
      frequencyCampaign: spec.weeklyFreq * laufzeitWeeks,
      frequencyWeekly: spec.weeklyFreq,
      reachVon,
      reachBis,
      reachMitte,
      reachVonPct,
      reachBisPct,
      er3Factor: Math.round(pkgEr3Factor * 1000) / 1000,
      er3Reach: pkgEr3Reach,
      recommended: key === 'praesenz',
    };
  };

  return {
    sichtbar: buildOne('sichtbar'),
    praesenz: buildOne('praesenz'),
    dominanz: buildOne('dominanz'),
    recommended: 'praesenz',
    stimmTotal,
    screenKlasse: klass.klasse,
  };
}

// ─── Konstanten-Export für UI ────────────────────────────────────────────────

export const GEMEINDE_NICHT_GEFUNDEN_HINWEIS =
  'Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen ' +
  'Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — ' +
  'wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte ' +
  'Gemeinde.';
