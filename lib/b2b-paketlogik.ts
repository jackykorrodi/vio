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

type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz'

const PACKAGE_META: Record<PkgKey, {
  name: string
  freq: number
  days: number
  minBudget: number
}> = {
  sichtbar: { name: 'Sichtbar', freq: 3, days: 14, minBudget: 4000 },
  praesenz: { name: 'Präsenz',  freq: 5, days: 28, minBudget: 6000 },
  dominanz: { name: 'Dominanz', freq: 6, days: 42, minBudget: 8000 },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundBudget(v: number): number {
  if (v < 10000) return Math.round(v / 100) * 100
  if (v < 50000) return Math.round(v / 500) * 500
  return Math.round(v / 1000) * 1000
}

function getReachPercent(mitarbeitende: number, key: PkgKey): number {
  if (mitarbeitende < 50000)   return ({ sichtbar: 0.15, praesenz: 0.30, dominanz: 0.45 })[key]
  if (mitarbeitende < 200000)  return ({ sichtbar: 0.08, praesenz: 0.15, dominanz: 0.25 })[key]
  if (mitarbeitende < 500000)  return ({ sichtbar: 0.04, praesenz: 0.08, dominanz: 0.14 })[key]
  return                             ({ sichtbar: 0.02, praesenz: 0.04, dominanz: 0.08 })[key]
}

function buildPackage(
  key: PkgKey,
  mitarbeitende: number,
  isRecommended: boolean,
): B2BPackageResult {
  const meta        = PACKAGE_META[key]
  const reachPct    = getReachPercent(mitarbeitende, key)
  const rawReach    = mitarbeitende * reachPct
  const capped      = Math.min(rawReach, mitarbeitende * 0.80)
  const impressions = capped * meta.freq
  const raw         = (impressions / 1000) * MIXED_CPM
  const rounded     = roundBudget(raw)
  const final       = Math.max(meta.minBudget, rounded)
  return {
    name:               meta.name,
    reachPercent:       reachPct,
    frequency:          meta.freq,
    durationDays:       meta.days,
    targetReachPeople:  Math.round(capped),
    impressions:        Math.round(impressions),
    finalBudget:        final,
    uniqueReachPercent: reachPct,
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
      sichtbar: buildPackage('sichtbar', mitarbeitende, false),
      praesenz: buildPackage('praesenz', mitarbeitende, true),
      dominanz: buildPackage('dominanz', mitarbeitende, false),
    },
  }
}
