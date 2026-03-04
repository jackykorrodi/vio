import { DOOH_CPM, DISPLAY_CPM, DOOH_SPLIT, DISPLAY_SPLIT, FREQUENCY } from './constants';

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
