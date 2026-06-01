import type { BriefingData } from '@/lib/types';
import { ALL_REGIONS } from '@/lib/regions';
import type { Region } from '@/lib/regions';
import { calculateImpact, calculateImpactCustom, PKG_CAP_LEVEL } from '@/lib/preislogik';
import type { PaketKey } from '@/lib/preislogik';

export interface ResolvedImpact {
  reach: number;
}

export interface ResolvedCampaign {
  pfad: 'paket' | 'custom';
  budget: number;
  laufzeitDays: number;
  laufzeitWeeks: number;
  impact: ResolvedImpact;
}

function toRegions(briefing: BriefingData): Region[] {
  return (briefing.selectedRegions ?? []).map(r => {
    const match = ALL_REGIONS.find(x => x.name === r.name);
    if (match) return match;
    return {
      name: r.name,
      type: (r.type as 'stadt' | 'kanton' | 'schweiz') ?? 'stadt',
      kanton: r.kanton ?? 'CH',
      pop: r.stimm * 2,
      stimm: r.stimm,
    };
  });
}

// Pure, idempotent, no exceptions. Falls back to safe defaults for missing fields.
export function resolveCampaign(briefing: BriefingData): ResolvedCampaign {
  const isCustom = briefing.pfad === 'custom' && !!briefing.customConfig;

  if (isCustom) {
    const cc = briefing.customConfig!;
    const budget = cc.budget ?? 0;
    const laufzeitDays = cc.laufzeitDays ?? 0;
    const laufzeitWeeks = laufzeitDays / 7;
    const regions = toRegions(briefing);
    let reach = 0;
    if (budget > 0 && laufzeitDays > 0 && regions.length > 0) {
      try {
        reach = calculateImpactCustom({
          budget,
          laufzeitDays,
          freqWeekly: cc.freqWeekly ?? 0,
          doohShare: cc.doohShare ?? 0,
          wirkungsfokus: cc.wirkungsfokus,
          regions,
          campaignStart: undefined,
        }).reach;
      } catch { /* safe default: 0 */ }
    }
    return { pfad: 'custom', budget, laufzeitDays, laufzeitWeeks, impact: { reach } };
  }

  // Paket path
  const vioData = briefing.vioPackages ?? null;
  const selectedPkg = ((briefing.selectedPackage ?? vioData?.recommendedPackage ?? 'praesenz') as PaketKey);
  const pkg = vioData?.packages?.[selectedPkg] ?? null;
  const budget = (briefing.budget && briefing.budget > 0)
    ? briefing.budget
    : (pkg?.finalBudget ?? 6000);
  const laufzeitWeeks = (briefing.laufzeit && briefing.laufzeit > 0)
    ? briefing.laufzeit
    : (pkg ? Math.round(pkg.durationDays / 7) : 4);
  const laufzeitDays = laufzeitWeeks * 7;
  const regions = toRegions(briefing);
  let reach = 0;
  if (regions.length > 0 && budget > 0) {
    try {
      const impact = calculateImpact({
        budget,
        laufzeitDays,
        regions,
        mode: 'paketLevel',
        paketLevel: PKG_CAP_LEVEL[selectedPkg],
      });
      reach = impact?.reachUniqueAbs ?? 0;
    } catch { /* safe default: 0 */ }
  }
  return { pfad: 'paket', budget, laufzeitDays, laufzeitWeeks, impact: { reach } };
}

// Throws loudly on invalid resolved state. Call before Pipedrive submit only.
export function assertRequiredFields(rc: ResolvedCampaign): void {
  if (rc.budget <= 0) {
    throw new Error(`resolveCampaign assert: budget <= 0 (pfad=${rc.pfad})`);
  }
  if (rc.laufzeitDays <= 0) {
    throw new Error(`resolveCampaign assert: laufzeitDays <= 0 (pfad=${rc.pfad})`);
  }
  if (!isFinite(rc.impact.reach) || rc.impact.reach < 0) {
    throw new Error(`resolveCampaign assert: impact.reach ungültig (${rc.impact.reach}, pfad=${rc.pfad})`);
  }
}
