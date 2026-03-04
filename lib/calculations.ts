import { DOOH_CPM, DISPLAY_CPM, DOOH_SPLIT, DISPLAY_SPLIT, FREQUENCY } from './constants';
import { AnalysisResult, UnternehmensgroesseOption } from './types';

// ── B2B Reach ──────────────────────────────────────────────────────────────

// Estimated number of registered companies per Swiss canton (BFS-based estimates)
const CANTON_COMPANIES: Record<string, number> = {
  ZH: 45000, BE: 28000, SG: 18000, AG: 22000, VD: 20000, GE: 15000,
  LU: 14000, TI: 10000, BS: 8000,  BL: 7000,  FR: 8000,  SO: 7000,
  TG: 8000,  VS: 7000,  GR: 6000,  NE: 5000,  SH: 3000,  ZG: 5000,
  SZ: 4000,  AR: 2000,  AI: 500,   GL: 1000,  JU: 2000,  NW: 1000,
  OW: 800,   UR: 600,
};

// Share of total companies per NOGA sector group
function getNogaMultiplier(nogaCode: string | null): number {
  if (!nogaCode) return 0.10;
  const n = parseInt(nogaCode, 10);
  if (isNaN(n))            return 0.10;
  if (n === 47)            return 0.12; // Detailhandel
  if (n >= 55 && n <= 56)  return 0.08; // Gastronomie & Hotellerie
  if (n >= 41 && n <= 43)  return 0.15; // Bau & Handwerk
  if (n >= 86 && n <= 88)  return 0.07; // Gesundheit & Soziales
  if (n === 85)            return 0.04; // Bildung
  if (n >= 64 && n <= 66)  return 0.06; // Finanz & Versicherung
  if (n === 68)            return 0.05; // Immobilien
  if (n >= 58 && n <= 63)  return 0.09; // IT & Kommunikation
  if (n >= 10 && n <= 33)  return 0.11; // Produktion & Industrie
  if (n >= 49 && n <= 53)  return 0.06; // Transport & Logistik
  if (n === 84)            return 0.02; // Öffentliche Verwaltung
  return 0.10;
}

// Distribution and average reachable employees per size tier
const GROESSE_CONFIG: Record<UnternehmensgroesseOption, { fraction: number; avgEmployees: number }> = {
  micro: { fraction: 0.70, avgEmployees: 4   },
  klein: { fraction: 0.20, avgEmployees: 18  },
  mittel: { fraction: 0.08, avgEmployees: 80  },
  gross:  { fraction: 0.02, avgEmployees: 300 },
};

export function calculateB2BReach(
  analysis: AnalysisResult | null,
): { unternehmen: number; mitarbeiter: number } {
  if (!analysis) return { unternehmen: 0, mitarbeiter: 0 };

  // If no canton selected, use all cantons
  const cantons = analysis.region?.length ? analysis.region : Object.keys(CANTON_COMPANIES);
  const nogaMultiplier = getNogaMultiplier(analysis.nogaCode);
  // If no size selected, include all sizes
  const sizes: UnternehmensgroesseOption[] = analysis.unternehmensgroesse?.length
    ? analysis.unternehmensgroesse
    : ['micro', 'klein', 'mittel', 'gross'];

  let totalUnternehmen = 0;
  let totalMitarbeiter = 0;

  for (const canton of cantons) {
    const base = CANTON_COMPANIES[canton] ?? 0;
    const brancheCompanies = base * nogaMultiplier;
    for (const size of sizes) {
      const cfg = GROESSE_CONFIG[size];
      const companiesAtSize = brancheCompanies * cfg.fraction;
      totalUnternehmen += companiesAtSize;
      totalMitarbeiter += companiesAtSize * cfg.avgEmployees;
    }
  }

  return {
    unternehmen: Math.round(totalUnternehmen),
    mitarbeiter: Math.round(totalMitarbeiter),
  };
}

// ── B2C Reach ──────────────────────────────────────────────────────────────

export function calculateReach(budget: number, laufzeit: number): {
  uniquePeople: number;
  doohImpressions: number;
  displayImpressions: number;
  totalCost: number;
} {
  const doohBudget = budget * DOOH_SPLIT;
  const displayBudget = budget * DISPLAY_SPLIT;
  const doohImpressions = (doohBudget / DOOH_CPM) * 1000;
  const displayImpressions = (displayBudget / DISPLAY_CPM) * 1000;
  const totalImpressions = doohImpressions + displayImpressions;
  const uniquePeople = Math.round(totalImpressions / FREQUENCY);
  return {
    uniquePeople,
    doohImpressions: Math.round(doohImpressions),
    displayImpressions: Math.round(displayImpressions),
    totalCost: budget,
  };
}

// ── Formatting ─────────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('de-CH').format(n);
}

export function formatCHF(n: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(n);
}
