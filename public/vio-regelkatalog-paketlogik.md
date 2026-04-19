# VIO Regelkatalog: Dynamische Paketlogik – Politische Kampagnen

## 1. Produktprinzip

Drei Pakete mit fixen Namen, dynamisch berechneten Preisen je nach Region:
- **Sichtbar** – erster Impuls, kompakte Präsenz
- **Präsenz** – ausgewogene Kampagne, meist empfohlen
- **Dominanz** – maximale Intensität, früher Start

---

## 2. Paketdefinition

| Paket | Ziel-Reichweite (Tier 1) | Frequenz | Laufzeit | Min-Budget |
|---|---|---|---|---|
| Sichtbar | 15% | 3× | 14 Tage | CHF 4'000 |
| Präsenz  | 30% | 5× | 28 Tage | CHF 6'000 |
| Dominanz | 45% | 6× | 42 Tage | CHF 8'000 |

Ziel-Reichweite ist tier-abhängig (→ Abschnitt 4). Min-Budget wird pro Paket angewendet (paketspezifisch, nicht nur für Sichtbar).

Frequenz ist kombiniert DOOH + Display (gewichtet):
- DOOH (70% Budget): physische Präsenz, tiefere Frequenz
- Display (30% Budget): Online-Banner, gleicher User mehrfach erreichbar

---

## 3. Kampagnen-Timing & Zeitachse

`CAMPAIGN_END_OFFSET_DAYS = 0` — alle Pakete enden am Abstimmungstag.
Freigabe-Puffer: 10 Kalendertage (`MIN_SETUP_DAYS`) für DOOH-Freigabe.

### Formel Kampagnenstart
```
Sichtbar:  Abstimmungstag - 14 (Laufzeit) = Start 14 Tage vorher
Präsenz:   Abstimmungstag - 28 (Laufzeit) = Start 28 Tage vorher
Dominanz:  Abstimmungstag - 42 (Laufzeit) = Start 42 Tage vorher
```

### Datums-Gating Step 1 (Hard Constraints)
| Vorlauf bis Abstimmung | Status | Verhalten |
|---|---|---|
| < 10 Tage | Hard Block | Weiter-Button disabled, rote Fehlermeldung |
| 10–23 Tage | Warning | Amber-Hinweis, nur Sichtbar machbar |
| 24–37 Tage | Info | Lila-Hinweis, Präsenz nicht mehr machbar |
| ≥ 38 Tage | OK | kein Hinweis |

### UI-Anzeige Datum
- Datepicker-Min: heute + 10 Tage (`todayPlusDaysISO(MIN_SETUP_DAYS)`)
- Alle Pakete immer buchbar – kein Sperrdatum in Schritt 2

---

## 4. Preislogik

### CPM-Struktur
- DOOH: VK CHF 50 / EK CHF 25 | Display: VK CHF 15 / EK CHF 5
- Split: 70% DOOH / 30% Display (Impressions-Ebene)
- Misch-CPM VK: CHF 39.50 (0.7×50 + 0.3×15), EK: CHF 19.00 → Gross Margin 51.9%
- Konstante `MIXED_CPM = 39.5` in `lib/vio-paketlogik.ts` und `lib/b2b-paketlogik.ts`

### Min-Budgets (paketspezifisch)
- Sichtbar: CHF 4'000 | Präsenz: CHF 6'000 | Dominanz: CHF 8'000
- `getMinBudget(key: PkgKey)` exportiert aus `lib/vio-paketlogik.ts`

### Tiered Reach Caps
| Stimmberechtigte / Mitarbeitende | Sichtbar | Präsenz | Dominanz |
|---|---|---|---|
| < 50'000 | 15% | 30% | 45% |
| 50'000–200'000 | 8% | 15% | 25% |
| 200'000–500'000 | 4% | 8% | 14% |
| 500'000+ | 2% | 4% | 8% |

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

## 5. Empfehlungssystem (Variante B — Präsenz Default)

Psychologische Basis: Compromise Effect + Decoy Pricing. Präsenz ist immer Default-Empfehlung und erhält das „Empfohlen"-Badge. Dominanz wird nie aktiv empfohlen, bleibt aber buchbar.

| Tage bis Abstimmung | Empfehlung | UI-Hinweis |
|---|---|---|
| ≥ 38 Tage | Präsenz | (kein Hinweis) |
| 24–37 Tage | Sichtbar | „Für Präsenz wäre ein früherer Start ideal gewesen." |
| < 24 Tage | Sichtbar | „Die Abstimmung ist bald — maximale Intensität auf kleinem Zeitfenster." |
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

## 8. Pseudocode (Stand Go-Live)

```ts
const MIXED_CPM = 39.5
const CAMPAIGN_END_OFFSET_DAYS = 0   // endet am Abstimmungstag
const MIN_SETUP_DAYS = 10            // DOOH-Freigabe Puffer

const PACKAGE_META = {
  sichtbar: { name: 'Sichtbar', freq: 3, days: 14, minBudget: 4000 },
  praesenz: { name: 'Präsenz',  freq: 5, days: 28, minBudget: 6000 },
  dominanz: { name: 'Dominanz', freq: 6, days: 42, minBudget: 8000 },
}

function getReachPercent(voters, key) {
  if (voters < 50000)  return { sichtbar: 0.15, praesenz: 0.30, dominanz: 0.45 }[key]
  if (voters < 200000) return { sichtbar: 0.08, praesenz: 0.15, dominanz: 0.25 }[key]
  if (voters < 500000) return { sichtbar: 0.04, praesenz: 0.08, dominanz: 0.14 }[key]
  return                      { sichtbar: 0.02, praesenz: 0.04, dominanz: 0.08 }[key]
}

// Variante B: Präsenz immer Default, Dominanz nie automatisch empfohlen
function getRecommended(days) {
  if (days === null) return 'praesenz'
  if (days >= 38)   return 'praesenz'
  return 'sichtbar'
}

function getHinweis(days) {
  if (days === null || days >= 38) return null
  if (days >= 24) return 'Für Präsenz wäre ein früherer Start ideal gewesen.'
  return 'Die Abstimmung ist bald — maximale Intensität auf kleinem Zeitfenster.'
}

function buildPackage(key, voters, isRecommended, voteDate, hinweis) {
  const meta        = PACKAGE_META[key]
  const reachPct    = getReachPercent(voters, key)
  const reach       = voters * reachPct
  const impressions = reach * meta.freq
  const raw         = (impressions / 1000) * MIXED_CPM
  const final       = Math.max(meta.minBudget, roundBudget(raw))
  return { ...meta, reachPercent: reachPct, targetReachPeople: Math.round(reach),
    impressions: Math.round(impressions), rawBudget: raw, finalBudget: final,
    badge: isRecommended ? 'Empfohlen' : null,
    hinweis: isRecommended ? hinweis : null }
}
```

---

## 9. Edge Cases

### Kleine Gemeinden / tiefes Budget
- Min-Budget wird paketspezifisch angewendet: 4/6/8k (statt früher nur 2'500 für Sichtbar)
- Kein UI-Hinweis — Budget wird still geclamped
- Tatsächliche Reichweite kann über Tier-Prozentsatz liegen – nicht kommunizieren

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
