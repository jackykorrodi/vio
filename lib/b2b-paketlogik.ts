// ─── Types ────────────────────────────────────────────────────────────────────

export type B2BPackageResult = {
  name: string
  reachPercent: number
  frequency: number
  durationDays: number
  targetReachPeople: number
  impressions: number
  finalBudget: number
  uniqueReachPercent: number
  badge: 'Empfohlen' | null
}

export type B2BStep1Output = {
  mitarbeitendeTotal: number
  recommendedPackage: 'sichtbar' | 'praesenz' | 'dominanz'
  packages: {
    sichtbar: B2BPackageResult
    praesenz: B2BPackageResult
    dominanz: B2BPackageResult
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIXED_CPM = 39.5
const MIN_SICHTBAR_BUDGET = 2500

const PACKAGES = {
  sichtbar: { name: 'Sichtbar', reach: 0.15, freq: 3, days: 14 },
  praesenz: { name: 'Präsenz',  reach: 0.30, freq: 4, days: 28 },
  dominanz: { name: 'Dominanz', reach: 0.45, freq: 7, days: 35 },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundBudget(v: number): number {
  if (v < 10000) return Math.round(v / 100) * 100
  if (v < 50000) return Math.round(v / 500) * 500
  return Math.round(v / 1000) * 1000
}

function buildPackage(
  pkg: { name: string; reach: number; freq: number; days: number },
  mitarbeitende: number,
  isRecommended: boolean,
): B2BPackageResult {
  const rawReach    = mitarbeitende * pkg.reach
  const capped      = Math.min(rawReach, mitarbeitende * 0.80)
  const impressions = capped * pkg.freq
  const raw         = (impressions / 1000) * MIXED_CPM
  const rounded     = roundBudget(raw)
  const final       = pkg.name === 'Sichtbar' ? Math.max(MIN_SICHTBAR_BUDGET, rounded) : rounded
  return {
    name:               pkg.name,
    reachPercent:       pkg.reach,
    frequency:          pkg.freq,
    durationDays:       pkg.days,
    targetReachPeople:  Math.round(capped),
    impressions:        Math.round(impressions),
    finalBudget:        final,
    uniqueReachPercent: pkg.reach,
    badge:              isRecommended ? 'Empfohlen' : null,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildB2BPackages({
  mitarbeitende,
}: {
  mitarbeitende: number
}): B2BStep1Output {
  return {
    mitarbeitendeTotal: mitarbeitende,
    recommendedPackage: 'praesenz',
    packages: {
      sichtbar: buildPackage(PACKAGES.sichtbar, mitarbeitende, false),
      praesenz: buildPackage(PACKAGES.praesenz, mitarbeitende, true),
      dominanz: buildPackage(PACKAGES.dominanz, mitarbeitende, false),
    },
  }
}
