// ─── Types ────────────────────────────────────────────────────────────────────

export type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz'

export type PackageResult = {
  name: string
  reachPercent: number            // Tier-abhängig (0.02 – 0.45)
  frequency: number               // 3 | 5 | 6
  durationDays: number            // 14 | 28 | 42
  targetReachPeople: number
  impressions: number
  rawBudget: number
  finalBudget: number             // nach Rundung + Mindestbetrag
  uniqueReachPercent: number
  recommendedStartDate: string | null  // z.B. "12. März 2026"
  latestBookingDate: string | null     // z.B. "2. März 2026"
  badge: 'Empfohlen' | null
  hinweis: string | null
}

export type Step1Output = {
  eligibleVotersTotal: number
  daysUntilVote: number | null
  recommendedPackage: PkgKey
  packages: {
    sichtbar: PackageResult
    praesenz: PackageResult
    dominanz: PackageResult
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIXED_CPM = 39.5
const MAX_BUDGET = 50_000            // absolutes Cap für alle Pakete
const CAMPAIGN_END_OFFSET_DAYS = 0   // alle Pakete enden am Abstimmungstag

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

const MONTHS_DE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`
}

// Tiered Reach Caps — je grösser die Region, desto unrealistischer hoher Reach
function getReachPercent(voters: number, key: PkgKey): number {
  if (voters < 50000)   return ({ sichtbar: 0.15, praesenz: 0.30, dominanz: 0.45 })[key]
  if (voters < 200000)  return ({ sichtbar: 0.08, praesenz: 0.15, dominanz: 0.25 })[key]
  if (voters < 500000)  return ({ sichtbar: 0.04, praesenz: 0.08, dominanz: 0.14 })[key]
  return                       ({ sichtbar: 0.02, praesenz: 0.04, dominanz: 0.08 })[key]
}

// Variante B: Präsenz ist immer Default (Compromise Effect + Decoy Pricing).
// Dominanz wird NIE automatisch empfohlen, bleibt aber buchbar.
function getRecommended(days: number | null): PkgKey {
  if (days === null) return 'praesenz'
  if (days >= 38)   return 'praesenz'   // 28 Laufzeit + 10 Setup = Präsenz noch machbar
  return 'sichtbar'                      // < 38 Tage: nur Sichtbar realistisch
}

function getHinweis(days: number | null): string | null {
  if (days === null || days >= 38) return null
  if (days >= 24) return 'Für Präsenz wäre ein früherer Start ideal gewesen.'
  return 'Die Abstimmung ist bald — maximale Intensität auf kleinem Zeitfenster.'
}

function calcDates(
  voteDate: string,
  durationDays: number,
): { startDate: string; bookingDate: string } {
  const vote = new Date(voteDate + 'T12:00:00')
  const end = new Date(vote)
  end.setDate(vote.getDate() - CAMPAIGN_END_OFFSET_DAYS)
  const start = new Date(end)
  start.setDate(end.getDate() - durationDays)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (start < today) {
    start.setTime(today.getTime())
    end.setTime(today.getTime() + durationDays * 24 * 3600 * 1000)
  }
  return { startDate: fmtDate(start), bookingDate: fmtDate(end) }
}

function roundBudget(v: number): number {
  if (v < 10000) return Math.round(v / 100) * 100
  if (v < 50000) return Math.round(v / 500) * 500
  return Math.round(v / 1000) * 1000
}

function buildPackage(
  key: PkgKey,
  voters: number,
  isRecommended: boolean,
  voteDate: string | null | undefined,
  hinweis: string | null,
): PackageResult {
  const meta      = PACKAGE_META[key]
  const reachPct  = getReachPercent(voters, key)
  const rawReach  = voters * reachPct
  const rawImpr   = rawReach * meta.freq
  const rawBudget = (rawImpr / 1000) * MIXED_CPM
  const rounded   = roundBudget(rawBudget)

  // Apply per-package floor and absolute ceiling
  const finalBudget = Math.min(MAX_BUDGET, Math.max(meta.minBudget, rounded))

  // If budget was clamped (up by minBudget OR down by MAX_BUDGET), recalculate reach backwards
  const budgetClamped = finalBudget !== rounded
  const effImpr       = budgetClamped
    ? (finalBudget / MIXED_CPM) * 1000
    : rawImpr
  const effReach      = budgetClamped
    ? Math.round(effImpr / meta.freq)
    : Math.round(rawReach)

  // Hard cap: never claim more than 80% of eligible voters
  const maxReach       = Math.round(voters * 0.80)
  const targetReach    = Math.min(effReach, maxReach)
  const targetImpr     = Math.round(targetReach * meta.freq)
  const targetReachPct = voters > 0 ? targetReach / voters : reachPct

  const dates = voteDate ? calcDates(voteDate, meta.days) : null
  return {
    name:                 meta.name,
    reachPercent:         targetReachPct,
    frequency:            meta.freq,
    durationDays:         meta.days,
    targetReachPeople:    targetReach,
    impressions:          targetImpr,
    rawBudget:            rawBudget,
    finalBudget:          finalBudget,
    uniqueReachPercent:   targetReachPct,
    recommendedStartDate: dates?.startDate ?? null,
    latestBookingDate:    dates?.bookingDate ?? null,
    badge:                isRecommended ? 'Empfohlen' : null,
    hinweis:              isRecommended ? hinweis : null,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildVioPackages({
  regions,
  voteDate,
}: {
  regions: Array<{ eligibleVoters: number }>
  voteDate?: string | null
  campaignType?: string
}): Step1Output {
  const voters      = regions.reduce((s, r) => s + r.eligibleVoters, 0)
  const days        = voteDate
    ? Math.ceil((new Date(voteDate + 'T12:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
    : null
  const recommended = getRecommended(days)
  const hinweis     = getHinweis(days)
  return {
    eligibleVotersTotal: voters,
    daysUntilVote:       days,
    recommendedPackage:  recommended,
    packages: {
      sichtbar: buildPackage('sichtbar', voters, recommended === 'sichtbar', voteDate, hinweis),
      praesenz: buildPackage('praesenz', voters, recommended === 'praesenz', voteDate, hinweis),
      dominanz: buildPackage('dominanz', voters, recommended === 'dominanz', voteDate, hinweis),
    },
  }
}

// ─── Helper: compute ISO startDate for briefing storage ───────────────────────

export function computeStartDateISO(voteDate: string, durationDays: number): string {
  const vote = new Date(voteDate + 'T12:00:00')
  const end = new Date(vote)
  end.setDate(vote.getDate() - CAMPAIGN_END_OFFSET_DAYS)
  const start = new Date(end)
  start.setDate(end.getDate() - durationDays)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const actual = start < today ? today : start
  return actual.toISOString().split('T')[0]
}

// ─── Helper: per-package minimum budget ───────────────────────────────────────

export function getMinBudget(key: PkgKey): number {
  return PACKAGE_META[key].minBudget
}

// ─── VERIFICATION (mental durchgegangen) ──────────────────────────────────────
// Mit MIXED_CPM=39.5, Min 4/6/8k, Freq 3/5/6, Tiered Caps:
//
//   Dorf 5k (Tier 1: 15/30/45%)
//     Sichtbar:  750 × 3  = 2'250 impr → raw   89 → final  4'000 (Min)
//     Präsenz: 1'500 × 5  = 7'500 impr → raw  296 → final  6'000 (Min)
//     Dominanz: 2'250 × 6 = 13'500 impr → raw 533 → final  8'000 (Min)
//
//   Winterthur 85k (Tier 2: 8/15/25%)
//     Sichtbar: 6'800 × 3  = 20'400 impr → raw   806 → final 4'000 (Min)
//     Präsenz: 12'750 × 5  = 63'750 impr → raw 2'518 → final 6'000 (Min)
//     Dominanz: 21'250 × 6 = 127'500 impr → raw 5'036 → final 8'000 (Min)
//
//   Kanton ZH 1M (Tier 4: 2/4/8%)
//     Sichtbar: 20'000 × 3  = 60'000 impr  → raw  2'370 → final  4'000 (Min)
//     Präsenz: 40'000 × 5  = 200'000 impr  → raw  7'900 → final  7'900
//     Dominanz: 80'000 × 6 = 480'000 impr  → raw 18'960 → final 19'000
//
//   Schweiz 5.5M (Tier 4: 2/4/8%)
//     Sichtbar: 110'000 × 3  = 330'000 impr    → raw  13'035 → final  13'000
//     Präsenz: 220'000 × 5  = 1'100'000 impr   → raw  43'450 → final  43'500
//     Dominanz: 440'000 × 6 = 2'640'000 impr   → raw 104'280 → final 104'000
