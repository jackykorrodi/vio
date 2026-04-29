// DEPRECATED — nicht verwenden.
// Typen (Step1Output, PackageResult) sind nach lib/preislogik-adapter.ts verschoben.
// Logik (buildVioPackages) ist durch lib/preislogik.ts + lib/preislogik-adapter.ts ersetzt.
// Einziger verbleibender Import: components/steps/Step2Politik.tsx (ebenfalls DEPRECATED).
// Löschen sobald Step2Politik.tsx entfernt wird.

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
  dominanz: { name: 'Dominanz', freq: 6, days: 42, minBudget: 9000 },
}

// Gestaffelte Floor-Budgets pro Paket (immer unterschiedlich → UX-Differenzierung)
const MIN_BUDGET: Record<string, number> = {
  'Sichtbar': 4_000,
  'Präsenz':  6_000,
  'Dominanz': 9_000,
}

// Tiered Reach-Prozentsätze nach Wählerzahl
const REACH_TIERS = [
  { maxVoters:    50_000, sichtbar: 0.15, praesenz: 0.30, dominanz: 0.45 },
  { maxVoters:   200_000, sichtbar: 0.08, praesenz: 0.15, dominanz: 0.25 },
  { maxVoters:   500_000, sichtbar: 0.04, praesenz: 0.08, dominanz: 0.14 },
  { maxVoters: Infinity,  sichtbar: 0.02, praesenz: 0.04, dominanz: 0.08 },
]

function getTieredReach(voters: number): { sichtbar: number; praesenz: number; dominanz: number } {
  return REACH_TIERS.find(t => voters <= t.maxVoters)!
}

const MONTHS_DE = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`
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
  pkg: { name: string; freq: number; days: number },
  voters: number,
  reachOverride: number,
  isRecommended: boolean,
  voteDate: string | null | undefined,
  hinweis: string | null,
): PackageResult {
  const floorBudget    = MIN_BUDGET[pkg.name] ?? 4_000
  const maxReachPeople = Math.round(voters * 0.80)

  // Schritt 1: Rohrechnung
  const rawReach       = Math.round(voters * reachOverride)
  const rawImpressions = rawReach * pkg.freq
  const rawBudget      = (rawImpressions / 1000) * MIXED_CPM

  // Schritt 2: Budget-Grenzen anwenden
  const clampedBudget  = Math.min(MAX_BUDGET, Math.max(floorBudget, roundBudget(rawBudget)))
  const isBudgetCapped = clampedBudget !== roundBudget(rawBudget)

  // Schritt 3: Wenn Budget durch Floor oder Cap verändert wurde → Reach rückwärts berechnen
  let finalReach: number
  let finalImpressions: number

  if (isBudgetCapped) {
    // Rückwärts aus Budget + Frequenz
    const backwardsImpressions = (clampedBudget / MIXED_CPM) * 1000
    const backwardsReach       = Math.round(backwardsImpressions / pkg.freq)
    finalReach       = Math.min(backwardsReach, maxReachPeople)
    finalImpressions = Math.round(finalReach * pkg.freq)
  } else {
    finalReach       = Math.min(rawReach, maxReachPeople)
    finalImpressions = Math.round(finalReach * pkg.freq)
  }

  const dates = voteDate ? calcDates(voteDate, pkg.days) : null
  return {
    name:                 pkg.name,
    reachPercent:         reachOverride,
    frequency:            pkg.freq,
    durationDays:         pkg.days,
    targetReachPeople:    finalReach,
    impressions:          finalImpressions,
    rawBudget:            rawBudget,
    finalBudget:          clampedBudget,
    uniqueReachPercent:   voters > 0 ? finalReach / voters : reachOverride,
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
  const tiered      = getTieredReach(voters)
  return {
    eligibleVotersTotal: voters,
    daysUntilVote:       days,
    recommendedPackage:  recommended,
    packages: {
      sichtbar: buildPackage(PACKAGE_META.sichtbar, voters, tiered.sichtbar, recommended === 'sichtbar', voteDate, hinweis),
      praesenz: buildPackage(PACKAGE_META.praesenz, voters, tiered.praesenz, recommended === 'praesenz', voteDate, hinweis),
      dominanz: buildPackage(PACKAGE_META.dominanz, voters, tiered.dominanz, recommended === 'dominanz', voteDate, hinweis),
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
// Mit MIXED_CPM=39.5, Min 4/6/9k, Freq 3/5/6, Tiered Caps, MAX_BUDGET 50k:
//
//   Appenzell Innerrhoden 13k (Tier 1: 15/30/45%)
//     Sichtbar:  1'950 × 3  = 5'850 impr  → raw   231 → floor 4'000 → reach back (4k/39.5*1000)/3=33'755 → cap 80%=10'400 → 10'400
//     Präsenz:   3'900 × 5  = 19'500 impr → raw   770 → floor 6'000 → reach back (6k/39.5*1000)/5=30'380 → cap 10'400 → 10'400
//     Dominanz:  5'850 × 6  = 35'100 impr → raw 1'387 → floor 9'000 → reach back (9k/39.5*1000)/6=37'975 → cap 10'400 → 10'400
//
//   Stadt Köniz 30k (Tier 1: 15/30/45%)
//     Präsenz:  9'000 × 5 = 45'000 impr → raw 1'778 → floor 6'000 → reach back (6k/39.5*1000)/5=30'380 → cap 24'000 → 24'000
//
//   Winterthur 85k (Tier 2: 8/15/25%)
//     Sichtbar: 6'800 × 3  = 20'400 impr → raw   806 → floor 4'000 → final 4'000 (Min)
//     Präsenz: 12'750 × 5  = 63'750 impr → raw 2'518 → floor 6'000 → final 6'000 (Min)
//     Dominanz: 21'250 × 6 = 127'500 impr → raw 5'036 → floor 9'000 → final 9'000 (Min)
//
//   Kanton ZH 1.17M (Tier 4: 2/4/8%)
//     Sichtbar: 23'400 × 3  = 70'200 impr  → raw  2'773 → floor 4'000 → reach back 33'755 (kein 80%-cap)
//     Präsenz: 46'800 × 5  = 234'000 impr  → raw  9'243 → final 9'000 (Min, kein Cap)
//     Dominanz: 93'600 × 6 = 561'600 impr  → raw 22'183 → final 22'000
//
//   Schweiz 5.5M (Tier 4: 2/4/8%)
//     Sichtbar: 110'000 × 3  = 330'000 impr    → raw  13'035 → final 13'000
//     Präsenz: 220'000 × 5  = 1'100'000 impr   → raw  43'450 → final 43'500
//     Dominanz: 440'000 × 6 = 2'640'000 impr   → raw 104'280 → cap 50'000 → reach back (50k/39.5*1000)/6=210'970
