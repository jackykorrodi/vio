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
  const meta        = PACKAGE_META[key]
  const reachPct    = getReachPercent(voters, key)
  const reach       = voters * reachPct
  const impressions = reach * meta.freq
  const raw         = (impressions / 1000) * MIXED_CPM
  const rounded     = roundBudget(raw)
  const final       = Math.max(meta.minBudget, rounded)       // paketspezifisches Min-Budget
  const dates       = voteDate ? calcDates(voteDate, meta.days) : null
  return {
    name:                 meta.name,
    reachPercent:         reachPct,
    frequency:            meta.freq,
    durationDays:         meta.days,
    targetReachPeople:    Math.round(reach),
    impressions:          Math.round(impressions),
    rawBudget:            raw,
    finalBudget:          final,
    uniqueReachPercent:   reachPct,
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
