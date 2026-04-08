# VIO Regelkatalog: Dynamische Paketlogik – Politische Kampagnen

## 1. Produktprinzip

Drei Pakete mit fixen Namen, dynamisch berechneten Preisen je nach Region:
- **Sichtbar** – erster Impuls, kompakte Präsenz
- **Präsenz** – ausgewogene Kampagne, meist empfohlen
- **Dominanz** – maximale Intensität, früher Start

---

## 2. Paketdefinition

| Paket | Ziel-Reichweite | Frequenz | Laufzeit | Opt. Buchung vor Abstimmung |
|---|---|---|---|---|
| Sichtbar | 15% | 3× | 14 Tage | 52 Tage vorher |
| Präsenz | 30% | 4× | 28 Tage | 66 Tage vorher |
| Dominanz | 45% | 7× | 35 Tage | 73 Tage vorher |

Frequenz ist kombiniert DOOH + Display (gewichtet):
- DOOH (70% Budget): physische Präsenz, tiefere Frequenz
- Display (30% Budget): Online-Banner, gleicher User mehrfach erreichbar

---

## 3. Briefwahl-Logik & Zeitachse

Briefwahl-Offset: 28 Tage vor Abstimmungstag kommen Unterlagen an.
Freigabe-Puffer: 10 Kalendertage (7 Werktage) für DOOH-Freigabe bei politischen Kampagnen.

### Formel Kampagnenstart
```
Sichtbar:  Abstimmungstag - 28 (Briefwahl) - 14 (Laufzeit) = Start 42 Tage vorher
Präsenz:   Abstimmungstag - 28 (Briefwahl) - 28 (Laufzeit) = Start 56 Tage vorher
Dominanz:  Abstimmungstag - 28 (Briefwahl) - 35 (Laufzeit) = Start 63 Tage vorher
```

### Formel Optimales Buchungsdatum
```
Optimales Buchungsdatum = Kampagnenstart - 10 Tage (Freigabe-Puffer)

Sichtbar:  52 Tage vor Abstimmung
Präsenz:   66 Tage vor Abstimmung
Dominanz:  73 Tage vor Abstimmung
```

### UI-Anzeige Datum
- „Empfohlener Kampagnenstart: 12. März 2026"
- „Für einen optimalen Start buche bis spätestens 2. März 2026"
- Wenn optimales Buchungsdatum in Vergangenheit: „Deine Kampagne startet sobald die Freigabe erfolgt ist (ca. 7 Werktage)."
- Alle Pakete immer buchbar – kein Sperrdatum

---

## 4. Preislogik

### Fixe Annahmen
- DOOH-Anteil: 70% | CPM CHF 50
- Display-Anteil: 30% | CPM CHF 15
- Misch-CPM: CHF 39.50 (0.7×50 + 0.3×15)
- Mindestbudget Sichtbar: CHF 2'500 (still angewendet, kein UI-Hinweis)

### Formeln
```
eligibleVoters        = Summe Stimmberechtigte aller gewählten Regionen
targetReachPeople     = eligibleVoters × reachPercent
requiredImpressions   = targetReachPeople × frequency
rawBudget             = (requiredImpressions / 1000) × 39.50
```

### Budget-Rundung
```
< CHF 10'000       → auf 100er runden
CHF 10'000–50'000  → auf 500er runden
> CHF 50'000       → auf 1'000er runden
```

---

## 5. Empfehlungssystem

Basis-Empfehlung: **Präsenz**

| Tage bis Abstimmung | Empfehlung | UI-Hinweis |
|---|---|---|
| ≥ 63 Tage | Dominanz | (kein Hinweis) |
| 49–62 Tage | Präsenz | (kein Hinweis) |
| 35–48 Tage | Sichtbar | „Für Präsenz wäre ein früherer Start ideal gewesen." |
| < 35 Tage | Sichtbar | „Die Abstimmung ist bald – maximale Intensität auf kleinem Zeitfenster." |
| Kein Datum | Präsenz | (kein Hinweis) |

Alle Pakete immer buchbar. Empfehlung ändert sich, nichts wird deaktiviert.

---

## 6. Kampagnentyp

Beeinflusst in Phase 1 nur Texte – nicht Preis, Reichweite oder Frequenz.

| Typ | Textton |
|---|---|
| JA-Kampagne | Mobilisierend, Zustimmung stärken |
| NEIN-Kampagne | Kritisch, Widerstand aufbauen |
| Kandidatenwahl | Persönlich, Bekanntheit aufbauen |
| Event & Mobilisierung | Zeitkritisch, Aufmerksamkeit erzeugen |

---

## 7. State-Transfer Schritt 1 → Schritt 2

Schritt 1 berechnet alles. Schritt 2 rendert nur – keine eigene Preislogik.

### TypeScript Typen

```ts
type PackageResult = {
  name: string
  reachPercent: number              // 0.15 | 0.30 | 0.45
  frequency: number                 // 3 | 4 | 7
  durationDays: number              // 14 | 28 | 35
  targetReachPeople: number
  impressions: number
  rawBudget: number
  finalBudget: number               // nach Rundung + Mindestbetrag
  uniqueReachPercent: number
  recommendedStartDate: string | null  // z.B. "12. März 2026"
  latestBookingDate: string | null     // z.B. "2. März 2026"
  badge: 'Empfohlen' | null
  hinweis: string | null
}

type Step1Output = {
  eligibleVotersTotal: number
  daysUntilVote: number | null
  recommendedPackage: 'sichtbar' | 'praesenz' | 'dominanz'
  packages: {
    sichtbar: PackageResult
    praesenz: PackageResult
    dominanz: PackageResult
  }
}
```

---

## 8. Pseudocode

```ts
const MIXED_CPM = 39.5
const MIN_SICHTBAR_BUDGET = 2500
const BRIEFWAHL_OFFSET_DAYS = 28
const FREIGABE_CALENDAR_DAYS = 10

const PACKAGES = {
  sichtbar: { name: 'Sichtbar', reach: 0.15, freq: 3, days: 14 },
  praesenz: { name: 'Präsenz',  reach: 0.30, freq: 4, days: 28 },
  dominanz: { name: 'Dominanz', reach: 0.45, freq: 7, days: 35 },
}

function getRecommended(days: number | null) {
  if (days === null) return 'praesenz'
  if (days >= 63)   return 'dominanz'
  if (days >= 49)   return 'praesenz'
  return 'sichtbar'
}

function getHinweis(days: number | null) {
  if (!days || days >= 49) return null
  if (days >= 35) return 'Für Präsenz wäre ein früherer Start ideal gewesen.'
  return 'Die Abstimmung ist bald – maximale Intensität auf kleinem Zeitfenster.'
}

function calcDates(voteDate: string, durationDays: number) {
  const vote = new Date(voteDate)
  const start = new Date(vote)
  start.setDate(vote.getDate() - BRIEFWAHL_OFFSET_DAYS - durationDays)
  const booking = new Date(start)
  booking.setDate(start.getDate() - FREIGABE_CALENDAR_DAYS)
  const fmt = (d: Date) => d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })
  return { startDate: fmt(start), bookingDate: fmt(booking) }
}

function roundBudget(v: number) {
  if (v < 10000)  return Math.round(v / 100) * 100
  if (v < 50000)  return Math.round(v / 500) * 500
  return Math.round(v / 1000) * 1000
}

function buildPackage(pkg, voters, isRecommended, voteDate, hinweis) {
  const reach       = voters * pkg.reach
  const impressions = reach * pkg.freq
  const raw         = (impressions / 1000) * MIXED_CPM
  const rounded     = roundBudget(raw)
  const final       = pkg.name === 'Sichtbar' ? Math.max(MIN_SICHTBAR_BUDGET, rounded) : rounded
  const dates       = voteDate ? calcDates(voteDate, pkg.days) : null
  return {
    ...pkg,
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

function buildVioPackages({ regions, voteDate, campaignType }) {
  const voters      = regions.reduce((s, r) => s + r.eligibleVoters, 0)
  const days        = voteDate
    ? Math.ceil((new Date(voteDate).getTime() - new Date().getTime()) / 86400000)
    : null
  const recommended = getRecommended(days)
  const hinweis     = getHinweis(days)
  return {
    eligibleVotersTotal: voters,
    daysUntilVote:       days,
    recommendedPackage:  recommended,
    packages: {
      sichtbar: buildPackage(PACKAGES.sichtbar, voters, recommended === 'sichtbar', voteDate, hinweis),
      praesenz: buildPackage(PACKAGES.praesenz, voters, recommended === 'praesenz', voteDate, hinweis),
      dominanz: buildPackage(PACKAGES.dominanz, voters, recommended === 'dominanz', voteDate, hinweis),
    },
  }
}
```

---

## 9. Edge Cases

### Kleine Gemeinden (Sichtbar < CHF 2'500)
- Mindestbudget CHF 2'500 wird still angewendet
- Kein UI-Hinweis
- Tatsächliche Reichweite kann über 15% liegen – nicht kommunizieren

### Abstimmungsdatum fehlt oder in Vergangenheit
- Kein Zeitdruck-Override
- Präsenz bleibt empfohlen
- Kein Startdatum anzeigen

### Mehrere Regionen kombiniert
- Stimmberechtigte werden summiert
- Normale Paketlogik ohne Sonderregel

### Optimales Buchungsdatum in Vergangenheit
- Buchung immer möglich
- UI-Text: „Deine Kampagne startet sobald die Freigabe erfolgt ist (ca. 7 Werktage)."

---

## 10. UI-Regeln

- Empfohlenes Paket mit Badge „Empfohlen" hervorheben
- Empfohlenes Startdatum prominent unter Paketnamen zeigen
- Optimales Buchungsdatum als sekundäre Info
- Hinweis-Text als farbige Info-Box (wenn vorhanden)
- Frequenz nie als „FC" – immer als „Ø X Kontakte pro Person"
- Immer absolute Zahl + Prozent: „~420'000 Personen (30% der Stimmberechtigten)"
- Alle Pakete immer buchbar
- Infobox zur DOOH-Freigabe immer anzeigen:

> „Digitale Aussenwerbung für politische Kampagnen muss von jedem Standortbetreiber individuell freigegeben werden. Dieser Prozess dauert in der Regel 5–7 Werktage. Wir empfehlen deshalb frühzeitig zu buchen – damit deine Kampagne pünktlich live geht und du den wichtigsten Zeitraum vor der brieflichen Stimmabgabe optimal nutzt."
