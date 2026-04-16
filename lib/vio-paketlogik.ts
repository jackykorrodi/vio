// ─── Types ────────────────────────────────────────────────────────────────────

export type PackageResult = {
  name: string
  reachPercent: number            // 0.15 | 0.30 | 0.45
  frequency: number               // 3 | 4 | 7
  durationDays: number            // 14 | 28 | 35
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
  recommendedPackage: 'sichtbar' | 'praesenz' | 'dominanz'
  packages: {
    sichtbar: PackageResult
    praesenz: PackageResult
    dominanz: PackageResult
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIXED_CPM = 39.5
const MIN_SICHTBAR_BUDGET = 4000
const CAMPAIGN_END_OFFSET_DAYS = 3  // campaignEnd = voteDate − 3 days

const PACKAGES = {
  sichtbar: { name: 'Sichtbar', reach: 0.15, freq: 3, days: 14 },
  praesenz: { name: 'Präsenz',  reach: 0.30, freq: 4, days: 28 },
  dominanz: { name: 'Dominanz', reach: 0.45, freq: 7, days: 35 },
}

const MONTHS_DE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`
}

function getRecommended(days: number | null): 'sichtbar' | 'praesenz' | 'dominanz' {
  if (days === null) return 'praesenz'
  if (days >= 63)   return 'dominanz'
  if (days >= 49)   return 'praesenz'
  return 'sichtbar'
}

function getHinweis(days: number | null): string | null {
  if (!days || days >= 49) return null
  if (days >= 35) return 'Für Präsenz wäre ein früherer Start ideal gewesen.'
  return 'Die Abstimmung ist bald – maximale Intensität auf kleinem Zeitfenster.'
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

function getReachPercents(voters: number): { sichtbar: number; praesenz: number; dominanz: number } {
  if (voters < 50000) {
    return { sichtbar: 0.15, praesenz: 0.30, dominanz: 0.45 }
  } else if (voters < 200000) {
    return { sichtbar: 0.08, praesenz: 0.15, dominanz: 0.25 }
  } else if (voters < 500000) {
    return { sichtbar: 0.04, praesenz: 0.08, dominanz: 0.14 }
  } else {
    return { sichtbar: 0.02, praesenz: 0.04, dominanz: 0.08 }
  }
}

function buildPackage(
  pkg: { name: string; reach: number; freq: number; days: number },
  voters: number,
  isRecommended: boolean,
  voteDate: string | null | undefined,
  hinweis: string | null,
): PackageResult {
  const reach       = voters * pkg.reach
  const impressions = reach * pkg.freq
  const raw         = (impressions / 1000) * MIXED_CPM
  const rounded     = roundBudget(raw)
  const final       = Math.max(MIN_SICHTBAR_BUDGET, rounded)
  const dates       = voteDate ? calcDates(voteDate, pkg.days) : null
  return {
    name:                 pkg.name,
    reachPercent:         pkg.reach,
    frequency:            pkg.freq,
    durationDays:         pkg.days,
    targetReachPeople:    Math.round(reach),
    impressions:          Math.round(impressions),
    rawBudget:            raw,
    finalBudget:          final,
    uniqueReachPercent:   pkg.reach,
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
    packages: (() => {
      const rp = getReachPercents(voters)
      return {
        sichtbar: buildPackage({ ...PACKAGES.sichtbar, reach: rp.sichtbar }, voters, recommended === 'sichtbar', voteDate, hinweis),
        praesenz: buildPackage({ ...PACKAGES.praesenz, reach: rp.praesenz }, voters, recommended === 'praesenz', voteDate, hinweis),
        dominanz: buildPackage({ ...PACKAGES.dominanz, reach: rp.dominanz }, voters, recommended === 'dominanz', voteDate, hinweis),
      }
    })(),
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
