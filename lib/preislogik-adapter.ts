// Adapter: mappt PakeResult (lib/preislogik.ts) auf Step1Output-Struktur
// (lib/vio-paketlogik.ts), damit bestehende UI-Komponenten (StepPackages,
// StepSummaryPolitik) unverändert weiterlaufen können.
//
// TEMPORÄR: Wird in Paket B.2b entfernt, sobald Step 2 + 3 direkt auf
// preislogik.ts umgestellt sind.

import type { Region } from './regions';
import { buildPackages } from './preislogik';
import type { Step1Output, PackageResult } from './vio-paketlogik';

const CAMPAIGN_END_OFFSET_DAYS = 0;

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function fmtDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function calcDates(
  voteDate: string,
  durationDays: number,
): { startDate: string; bookingDate: string } {
  const vote = new Date(voteDate + 'T12:00:00');
  const end = new Date(vote);
  end.setDate(vote.getDate() - CAMPAIGN_END_OFFSET_DAYS);
  const start = new Date(end);
  start.setDate(end.getDate() - durationDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    start.setTime(today.getTime());
    end.setTime(today.getTime() + durationDays * 24 * 3600 * 1000);
  }
  return { startDate: fmtDate(start), bookingDate: fmtDate(end) };
}

function getHinweis(days: number | null): string | null {
  if (days === null || days >= 38) return null;
  if (days >= 24) return 'Für Präsenz wäre ein früherer Start ideal gewesen.';
  return 'Die Abstimmung ist bald — maximale Intensität auf kleinem Zeitfenster.';
}

function getRecommended(days: number | null): 'sichtbar' | 'praesenz' | 'dominanz' {
  if (days === null) return 'praesenz';
  if (days >= 38) return 'praesenz';
  return 'sichtbar';
}

/**
 * Neuer Entry-Point, der PakeResult (neue Logik) in Step1Output (alte Struktur) mappt.
 * Drop-in-Replacement für buildVioPackages aus vio-paketlogik.ts.
 */
export function buildVioPackagesV2({
  regions,
  voteDate,
}: {
  regions: Region[];
  voteDate?: string | null;
  campaignType?: string;
}): Step1Output {
  const pakeResult = buildPackages({ regions });

  const voters = pakeResult.stimmTotal;
  const days = voteDate
    ? Math.ceil(
        (new Date(voteDate + 'T12:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000,
      )
    : null;

  const recommended = getRecommended(days);
  const hinweis = getHinweis(days);

  const mapPkg = (key: 'sichtbar' | 'praesenz' | 'dominanz'): PackageResult => {
    const p = pakeResult[key];
    const dates = voteDate ? calcDates(voteDate, p.laufzeitDays) : null;
    const isRecommended = key === recommended;
    return {
      name: p.name,
      reachPercent: voters > 0 ? p.reachMitte / voters : 0,
      frequency: p.frequencyWeekly,
      durationDays: p.laufzeitDays,
      targetReachPeople: p.reachMitte,
      impressions: Math.round(p.reachMitte * p.frequencyCampaign),
      rawBudget: p.budget,
      finalBudget: p.budget,
      uniqueReachPercent: voters > 0 ? p.reachMitte / voters : 0,
      recommendedStartDate: dates?.startDate ?? null,
      latestBookingDate: dates?.bookingDate ?? null,
      badge: isRecommended ? 'Empfohlen' : null,
      hinweis: isRecommended ? hinweis : null,
    };
  };

  return {
    eligibleVotersTotal: voters,
    daysUntilVote: days,
    recommendedPackage: recommended,
    packages: {
      sichtbar: mapPkg('sichtbar'),
      praesenz: mapPkg('praesenz'),
      dominanz: mapPkg('dominanz'),
    },
  };
}
