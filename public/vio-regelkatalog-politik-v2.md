# VIO Regelkatalog: Preislogik & Kampagnenplanung – Politik v2

> **Status:** Final (4. Mai 2026) — v2.3
> **Scope:** Politik-Flow. B2B/B2C migrieren später auf dieselbe Logik.
> **Ersetzt:** v2.2 (28.04.2026)
> **Zielablage:** `public/vio-regelkatalog-politik-v2.md`
> **Single Source of Truth für:** `lib/preislogik.ts`, Step2PolitikBudget, Wirkungsindikator

---

## 1. Produktprinzip – Zwei Pfade, ein Wirkungsindikator

VIO bietet zwei Einstiegspfade in die Kampagnenplanung. Beide nutzen **dieselbe deterministische Reach-Funktion** und münden im gleichen Wirkungsindikator.

### Pfad A – Budget-first

User kennt sein Budget und will sofort sehen, was er damit erreicht.

```
Input:    Region(en) + Budget + Laufzeit
Output:   Reichweite-Range + emergente Frequenz + Channel-Split
```

### Pfad B – Pakete mit Feintuning

User ist unentschieden und sucht Orientierung. Drei Pakete dienen als Anker, werden aber per Slider feintunbar.

```
Input:    Region(en) + Paket-Vorauswahl (Sichtbar / Präsenz / Dominanz)
Output:   Drei Karten → User wählt → selber Wirkungsindikator wie Pfad A
```

### Pfad-Bestimmung

In Step 1 entscheidet der User implizit über den Pfad:

- Budget-Slider bewegt → **Pfad A** aktiv
- Paket gewählt → **Pfad B** aktiv

Wechsel zwischen Pfaden ist jederzeit möglich. **Bei gleichem Budget und gleicher Region ist die Reach-Anzeige in beiden Pfaden identisch** — der einzige Unterschied ist das Default-Tupel (Budget × Laufzeit × cap_level), das jedes Paket vorgibt.

### Was nicht mehr im Flow ist

Die Frage nach Kampagnentyp (JA / NEIN / Kandidatur / Mobilisierung) und Wahl vs. Abstimmung ist komplett entfernt. Differenzierung erfolgt bei Bedarf im Creative-Step.

---

## 2. Variablen & Konstanten

### Produktkonstanten

| Variable | Wert | Zweck |
|---|---|---|
| `B_MIN` | CHF 4'000 | Absolutes Mindestbudget, Hard Floor |
| `B_HARD_MAX` | CHF 100'000 | Absolute Obergrenze, darüber Hard Stop |
| `B_NUDGE_STRONG` | CHF 30'000 | Prominente Beratungs-Bubble, aber weiter buchbar |
| `B_NUDGE_SOFT` | CHF 20'000 | Dezenter Calendly-Nudge |
| `DAILY_MIN` | CHF 150 / Tag | Splicky-DSP-Floor (sonst keine Auslieferung) |
| `LAUFZEIT_MIN` | 7 Tage | Minimale Kampagnendauer |
| `LAUFZEIT_MAX` | 84 Tage (12 Wo) | Maximale Kampagnendauer |

### Frequenz-Leitplanken (pro Woche, intern)

| Variable | Wert | Zweck |
|---|---|---|
| `F_MIN_WEEKLY` | **2.5× / Woche** | Unter dieser Schwelle: unwirksam — *abgesenkt von 3.0 in v2.3, damit Sichtbar-Paket (3×) nicht laufend `too_thin` triggert* |
| `F_MAX_WEEKLY` | 10× / Woche | Ab hier: Werbemüdigkeit |

### Reach-Konstanten

| Variable | Wert | Zweck |
|---|---|---|
| `MAX_REACH_CAP` | 80% | Absolute Obergrenze des erreichbaren Pools |
| `EXPONENT_BUDGET_LAUFZEIT` | 0.75 | Konkave Kopplung Budget↔Laufzeit |
| `REACH_CURVE_K` | **0.4** | Hofmans-Saturation-Parameter — modelliert ungleichmässige Verteilung in DOOH-Inventar (k=1.0 = Zufallsverteilung; k<1 = Pendler/Standort-Konzentration) |

### CPM-Tarife

| Kanal | CPM | Quelle |
|---|---|---|
| DOOH | CHF 50 | VIO-Verkaufspreis inkl. Marge |
| Display | CHF 15 | VIO-Verkaufspreis inkl. Marge |

### OTS-Kalibrierung

| Variable | Wert | Zweck |
|---|---|---|
| `DOOH_OTS_MULTIPLIER` | **1.8** | 1 Ad Play = 1.8 Audience Contacts — *abgesenkt von 2.0 in v2.3, konservativster Wert der CH-DOOH-Branchen-Range (1.8–2.5), Splicky-Validierung ausstehend* |

Der **Misch-CPM wird dynamisch** pro Kampagne berechnet, nicht als fixer Wert. Formel siehe Abschnitt 7.

### Ziel-Frequenzen pro Paket (kommunikativ + Default-Budget-Kalibrierung)

| Paket | `target_f_weekly` | Laufzeit | `target_f_campaign` |
|---|---|---|---|
| Sichtbar | 3× / Woche | 14 Tage (2 Wo) | 6× |
| Präsenz | 5× / Woche | 28 Tage (4 Wo) | 20× |
| **Dominanz** | **6× / Woche** | **42 Tage (6 Wo)** | **36×** |

Diese Frequenzen sind **Marketing-Versprechen + Kalibrierungs-Anker für Default-Budgets**. Sie sind NICHT Divisoren in der Reach-Formel — Frequenz wird emergent berechnet (Schritt 8 in §4). Bei Default-Budget des jeweiligen Pakets liegt die emergente `f_weekly` näherungsweise bei diesen Werten.

---

## 3. Die fünf Stellschrauben und ihr Zusammenspiel

### Primärinputs (User steuert)

1. **Region(en)** – bestimmt Pool, Tier, DOOH-Inventar, Cap-Levels
2. **Budget** – Hauptinput in Pfad A, feintunbar in Pfad B
3. **Laufzeit** – gekoppelt an Budget (konkav)

### Abgeleitete Werte (System berechnet)

4. **Frequenz** (emergent aus Reach-Berechnung)
5. **Channel-Split** (dynamisch aus `screens_politik`)

### Zusammenspiel-Regeln

- Bei jeder Änderung eines Primärinputs werden alle abgeleiteten Werte neu berechnet
- Bei jeder Änderung wird gegen Leitplanken geprüft (`F_MIN_WEEKLY`, `F_MAX_WEEKLY`, `DAILY_MIN`, `MAX_REACH_CAP`)
- Bei Leitplanken-Verletzung erscheint ein Hinweis (Abschnitt 12), aber kein Auto-Override
- Budget↔Laufzeit sind **visuell gekoppelt** (Exponent 0.75)

---

## 4. Preislogik – Die eine Formel

```typescript
// Inputs
budget           // CHF, >= B_MIN, <= B_HARD_MAX
laufzeit_days    // Tage, LAUFZEIT_MIN <= x <= LAUFZEIT_MAX
regions[]        // gewählte Regionen mit stimm + screens_politik
pkg              // optional: 'sichtbar' | 'praesenz' | 'dominanz' (nur Pfad B)

// Schritt 1 — Pool-Aggregation (mit Überlappungs-Deduplizierung, Abschnitt 10)
stimm_total          = dedupStimm(regions)
screens_politik_total = sumPolitScreens(regions)

// Schritt 2 — Tier & Split (Abschnitt 7)
split = getChannelSplit(screens_politik_total)
mixed_cpm = split.dooh * 50 + split.display * 15

// Schritt 3 — Audience Contacts (mit OTS=1.8 für DOOH)
imps_dooh    = (budget * split.dooh / CPM_DOOH) * 1000
imps_display = (budget * split.display / CPM_DISPLAY) * 1000

contacts_dooh    = imps_dooh    * DELIVERY_DOOH    * DOOH_OTS_MULTIPLIER
contacts_display = imps_display * DELIVERY_DISPLAY
contacts_total   = contacts_dooh + contacts_display

// Schritt 4 — Cap-Level bestimmen
// Pfad B: fix aus Paket (1=Sichtbar, 2=Präsenz, 3=Dominanz)
// Pfad A: inferieren — wähle Level, dessen emergente f_weekly am nächsten
//          am jeweiligen target_f_weekly liegt (siehe inferCapLevel)
cap_level = pkg ? capLevelFromPkg(pkg) : inferCapLevel(contacts_total, stimm_total, laufzeit_weeks)

// Schritt 5 — Pool-Target (asymptotisches Maximum für Saturation)
pool_target = stimm_total * getReachCap(stimm_total, cap_level)

// Schritt 6 — Hofmans-Saturation (ersetzt das harte min() aus v2.2)
ratio = contacts_total / pool_target
saturation_factor = 1 - exp(-REACH_CURVE_K * ratio)
unique_reach = pool_target * saturation_factor

// Schritt 7 — Hard Floor MAX_REACH_CAP
unique_reach = min(unique_reach, stimm_total * MAX_REACH_CAP)

// Schritt 8 — Wearout (>8 Wochen, Floor 0.70 in v2.3)
unique_reach = applyWearoutCurve(unique_reach, laufzeit_weeks)

// Schritt 9 — Emergente Frequenz (für UI + Decision-Engine)
laufzeit_weeks = laufzeit_days / 7
f_campaign = unique_reach > 0 ? contacts_total / unique_reach : 0
f_weekly   = f_campaign / laufzeit_weeks

// Schritt 10 — Capped-Status (für UI-Hinweis)
capped = saturation_factor > 0.85
       || unique_reach >= stimm_total * MAX_REACH_CAP * 0.99

// Schritt 11 — Unsicherheits-Band (Floor 12% in v2.3)
band      = getUncertaintyBand(screens_politik_total)
reach_von = round(unique_reach * (1 - band), 500)
reach_bis = round(min(stimm_total * MAX_REACH_CAP, unique_reach * (1 + band)), 500)
```

### Cap-Level-Inferenz (Pfad A, Schritt 4)

```typescript
function inferCapLevel(contacts, stimm, weeks): 1 | 2 | 3 {
  const targetFreqs = { 1: 3, 2: 5, 3: 6 }  // f_weekly pro Paket
  const distances = []

  for (const level of [1, 2, 3]) {
    const pool = stimm * getReachCap(stimm, level)
    const sat = 1 - Math.exp(-REACH_CURVE_K * contacts / pool)
    const reach = Math.min(pool * sat, stimm * MAX_REACH_CAP)
    const fw = reach > 0 ? contacts / (reach * weeks) : 0
    distances.push({ level, distance: Math.abs(fw - targetFreqs[level]) })
  }

  return distances.sort((a, b) => a.distance - b.distance)[0].level
}
```

**Begründung**: Pfad A wählt das Cap-Level, dessen emergente Wochen-Frequenz am nächsten am Paket-Versprechen liegt. Bei niedrigem Budget tendenziell Sichtbar, bei mittlerem Präsenz, bei hohem Dominanz.

### Output-Struktur (ImpactResult)

| Feld | Beschreibung |
|---|---|
| `reachVon / reachBis` | Unique Reach Range (Headline-Zahl im UI) |
| `reachMitte` | Mittenwert, Haupt-KPI |
| `frequencyCampaign` | Emergente Gesamt-Frequenz |
| `frequencyWeekly` | Emergente Wochen-Frequenz (intern + UI sekundär) |
| `capLevel` | 1 / 2 / 3 — Cap-Level (fix in Pfad B, inferiert in Pfad A) |
| `impactLevel` | `'sichtbar'` / `'praesenz'` / `'dominanz'` — UI-Label |
| `efficiencyStatus` | `'too_thin'` / `'balanced'` / `'overkill'` / `'capped'` |
| `recommendedAction` | `{ action, target }` / `null` |
| `cappedByRegion` | `true` wenn `capped === true` |

### Budget↔Laufzeit-Kopplung (Exponent 0.75)

Wenn User die Laufzeit ändert, wird Budget automatisch gekoppelt:

```typescript
// Referenz: Präsenz @ 28 Tage
budget_new = budget_reference * (laufzeit_days_new / 28) ^ 0.75
```

**Beispiele (Referenz Präsenz CHF 13'500 @ 28 Tage, Stadt Zürich):**

| Laufzeit | Budget | Tagesbudget | f_weekly emergent |
|---|---|---|---|
| 14 Tage | CHF 8'000 | CHF 570 | ~5.5× |
| 21 Tage | CHF 10'900 | CHF 520 | ~5.2× |
| **28 Tage** | **CHF 13'500** | **CHF 480** | **~5.0×** |
| 42 Tage | CHF 17'800 | CHF 425 | ~5.5× (leichte Wearout-Anhebung) |
| 56 Tage | CHF 21'600 | CHF 385 | ~5.8× |
| 84 Tage | CHF 28'500 | CHF 340 | ~6.5× (Wearout greift, Cap näher) |

Die emergente Frequenz steigt bei langen Laufzeiten leicht an, weil Wearout den Reach reduziert und so den f_emergent-Quotienten erhöht. Das ist gewolltes Verhalten und kein Bug.

Die Kopplung ist **überschreibbar**: User kann Budget-Slider nach Laufzeit-Änderung frei bewegen.

---

## 5. Frequenz-Modell

### Frequenz ist emergent, nicht eingestellt

Im neuen Modell (v2.3) wird Frequenz **nicht mehr als Divisor** in der Reach-Formel verwendet. Sie ergibt sich aus Reach und Contacts:

```
f_campaign = contacts_total / unique_reach
f_weekly   = f_campaign / laufzeit_weeks
```

Das ist mathematisch sauberer und stellt sicher, dass die kommunizierte Frequenz immer mit der berechneten Reach konsistent ist.

### Paket-Versprechen vs. Realität

Die Pakete haben kommunikative Ziel-Frequenzen (3 / 5 / 6 ×/Wo). Die Default-Budgets der Pakete sind so kalibriert, dass die emergente Frequenz **näherungsweise** dem Versprechen entspricht. Bei Saturation-Anschlag (User hat sehr viel Budget für kleine Region gewählt) liegt die emergente Frequenz **über** dem Versprechen — das ist physikalisch korrekt und wird über `capped`-Hinweis kommuniziert.

### Validierung gegen absolute Leitplanken

- `f_weekly < F_MIN_WEEKLY (2.5)` → `efficiencyStatus: 'too_thin'`
- `f_weekly > F_MAX_WEEKLY (10)` → `efficiencyStatus: 'overkill'`
- `capped === true` → `efficiencyStatus: 'capped'`
- Sonst → `efficiencyStatus: 'balanced'`

### UI-Anzeige

```
Ø 20× pro Person während der Kampagne
(≈ 5× pro Woche über 4 Wochen)
```

Die Wochen-Angabe ist erklärender Kontext, nicht Primärmetrik.

---

## 6. Reach-Caps nach Pool-Grösse (tiered, +50% in v2.3)

Die Caps definieren das **asymptotische Maximum** der Saturation-Kurve pro Paket-Niveau. In v2.3 wurden die Werte um ca. 50% angehoben, um näher an Branchenrealität zu liegen — gleichzeitig wurde das harte Capping durch eine weiche Saturation-Kurve ersetzt (siehe §4 Schritt 6).

| Pool-Grösse (`stimm_total`) | Sichtbar (Lvl 1) | Präsenz (Lvl 2) | Dominanz (Lvl 3) |
|---|---|---|---|
| < 50'000 | **22%** | **45%** | **65%** |
| 50'000 – 200'000 | **12%** | **22%** | **38%** |
| 200'000 – 500'000 | **6%** | **12%** | **21%** |
| > 500'000 | **3%** | **6%** | **12%** |

Vorher (v2.2): 15/30/45 · 8/15/25 · 4/8/14 · 2/4/8.

### Zusätzlicher harter Cap

`MAX_REACH_CAP = 80%` – niemals höher, auch bei unendlichem Budget. Greift erst nach Saturation und Wearout.

### Wirkung der Saturation-Kurve

Statt `reach = min(raw_reach, pool_cap)` rechnet v2.3:

```
reach = pool_target × (1 - exp(-0.4 × contacts / pool_target))
```

**Eigenschaften:**

- Bei wenig Budget (`contacts << pool_target`): Reach steigt fast linear mit Budget
- Bei mittlerem Budget (`contacts ≈ pool_target`): Reach ≈ 33% des Pools
- Bei hohem Budget (`contacts ≈ 5× pool_target`): Reach ≈ 86% des Pools
- Bei sehr hohem Budget: Asymptotische Annäherung an Pool, niemals Überschreitung

Konkrete Werte je `ratio = contacts / pool_target`:

| ratio | saturation_factor | reach / pool |
|---|---|---|
| 0.5 | 0.18 | 18% |
| 1.0 | 0.33 | 33% |
| 2.0 | 0.55 | 55% |
| 3.0 | 0.70 | 70% |
| 5.0 | 0.86 | 86% |
| 10.0 | 0.98 | 98% |

Die Kurve ist mit `k=0.4` bewusst konservativ kalibriert (DOOH-Inventar ist nicht zufällig verteilt — Pendler treffen gleiche Plakate mehrfach, andere Personen nie). Validierung gegen reale Splicky-Daten nach den ersten 10 Kampagnen.

---

## 7. Channel-Split und Screen-Klassen

### 7.1 Grundprinzip

Der DOOH/Display-Split ist **nicht fix**, sondern passt sich der Screen-Verfügbarkeit der Zielregion an. Drei Screen-Klassen, automatisch berechnet.

### 7.2 Berechnung politisch freigegebener Screens

```
politScreens = max(screens × 0.7, screens_politik aus JSON)
```

- `screens` = theoretisches Gesamt-Inventar (aus `dooh-screens.json`)
- `0.7` = konservative Freigabequote (CH-Schnitt ~78%)
- `screens_politik` = operativ validierter Wert pro Region, falls höher

### 7.3 Die drei Screen-Klassen

| Klasse | Bedingung | DOOH / Display | Misch-CPM | UI-Hinweis |
|---|---|---|---|---|
| **Voll** | `politScreens ≥ 30` | 70% / 30% | CHF 39.50 | kein Hinweis |
| **Begrenzt** | `politScreens 10–29` | 50% / 50% | CHF 32.50 | dezenter Hinweis |
| **Display-dominant** | `politScreens < 10` | 20% / 80% | CHF 22.00 | klarer Hinweis |

Kantone und „Gesamte Schweiz" sind immer Klasse **Voll**.

### 7.4 Hinweis-Texte

**Begrenzt:**
> „In {Gemeinde} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal."

**Display-dominant:**
> „In {Gemeinde} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt."

**Mehrere Regionen mit gemischten Klassen:**
> „In Teilen deiner Region-Auswahl ist DOOH-Inventar begrenzt — der Online-Anteil wird entsprechend erhöht."

### 7.5 Aggregation bei Mehrfach-Region-Auswahl (geändert in v2.3)

Bei gewählter Kombination mehrerer Regionen:

- **`screens_politik_total`**: Summe der `politScreens` aller gewählten Regionen
- **Klasse**: Bestimmt aus dem aggregierten `screens_politik_total` (NICHT mehr „strengste" wie v2.2)
  - `screens_politik_total ≥ 30` → Voll
  - `screens_politik_total 10–29` → Begrenzt
  - `screens_politik_total < 10` → Display-dominant
- **Split**: Aus der aggregierten Klasse abgeleitet (70/30, 50/50, 20/80)
- **Hinweise**: Pro Region einzeln zeigen, wenn einzelne Regionen abweichende Klassen haben

**Begründung der Änderung**: Die alte „strengste"-Logik produzierte irreführende Klassifikationen — Stadt Zürich + Kleingemeinde wurde als „Display-dominant" klassifiziert, obwohl 99% des Inventars aus Zürich kommt. Aggregation ist mathematisch korrekter.

### 7.6 Edge Case: Kein DOOH verfügbar

Wenn `politScreens === 0`: Auto-Split 100% Display. Hinweis `no_dooh_inventory`.

---

## 8. Laufzeit-Korridore & Wearout

### Laufzeit-Korridor (angepasst an Budget)

```typescript
function getLaufzeitCorridor(budget: number): { min: number; max: number } {
  if (budget < 6000)   return { min: 7,  max: 21 }  // 1–3 Wochen
  if (budget < 15000)  return { min: 14, max: 42 }  // 2–6 Wochen — angepasst für Dominanz
  if (budget < 30000)  return { min: 21, max: 56 }  // 3–8 Wochen
  return                 { min: 28, max: 84 }        // 4–12 Wochen
}
```

**Hinweis**: Korridor `< 15000` wurde von max=35 auf max=42 erweitert, damit Dominanz (42 Tage) bei Min-Budget noch buchbar ist.

**Hard Min:** 7 Tage · **Hard Max:** 84 Tage (12 Wochen)

### Wearout-Kurve (>8 Wochen, Floor 0.70 in v2.3)

```typescript
function applyWearoutCurve(unique_reach: number, laufzeit_weeks: number): number {
  if (laufzeit_weeks <= 8) return unique_reach
  const wearout_factor = 1 - (laufzeit_weeks - 8) * 0.03
  const clamped = Math.max(wearout_factor, 0.70)  // war 0.80 in v2.2
  return unique_reach * clamped
}
```

**Beispiele:**
- 8 Wochen → Faktor 1.00
- 10 Wochen → Faktor 0.94
- 12 Wochen → Faktor 0.88
- 16 Wochen → Faktor 0.76
- 18+ Wochen → Floor 0.70 (war 0.80)

**Begründung**: 80% war optimistisch. Branchenliteratur zeigt 60–70% Floor für Long-Run-Kampagnen. 70% ist konservativ ohne unrealistisch zu werden.

---

## 9. Buchbarkeit von Regionen

(unverändert ggü. v2.2)

### Qualifikations-Regel (ODER-Logik)

```
(stimm ≥ 10'000) ODER (politScreens ≥ 20)
UND NICHT in PERMANENTLY_EXCLUDED
```

Kantone und „Gesamte Schweiz" sind immer buchbar.

### Permanent ausgeschlossene Gemeinden

- Küsnacht (ZH) — nicht zu verwechseln mit Küssnacht (SZ), das buchbar ist
- Martigny
- Opfikon
- Veyrier

### Aktuelle Liste

| Kategorie | Anzahl |
|---|---|
| Kantone | 26 |
| Städte/Gemeinden (Klasse Voll) | 61 |
| Städte/Gemeinden (Klasse Begrenzt) | 32 |
| Städte/Gemeinden (Klasse Display-dominant) | 10 |
| **Gesamt buchbar** | **130** (inkl. Schweiz) |

### „Meine Gemeinde fehlt"-Hinweis

> „Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte Gemeinde."

Konstante: `GEMEINDE_NICHT_GEFUNDEN_HINWEIS` in `lib/region-buchbarkeit.ts`.

### Implementierung

Logik gekapselt in `lib/region-buchbarkeit.ts`. Exports: `isBuchbar`, `filterBuchbareRegionen`, `getPolitScreens`, `klassifiziereRegion`, `klassifiziereMehrereRegionen`, `PERMANENTLY_EXCLUDED`, `GEMEINDE_NICHT_GEFUNDEN_HINWEIS`.

---

## 10. Regionen-Kombinations-Regeln

(unverändert ggü. v2.2)

### Regel 1 – Gesamte Schweiz absorbiert alles

Wenn `Gesamte Schweiz` gewählt: alle anderen Regionen ignoriert.

### Regel 2 – Kanton absorbiert enthaltene Städte

Wenn `Kanton X` + `Stadt Y` (in Kanton X): Stadt absorbiert, im UI als „inkludiert" markiert.

### Regel 3 – Städte ohne Überlappung werden summiert

`Stadt Zürich + Stadt Winterthur + Stadt Basel` → `stimm_total = sum(alle drei)`

### Regel 4 – Mehrere Kantone

Normale Summierung, keine Überlappung.

### Implementierung (Pseudocode)

```typescript
function dedupStimm(regions: Region[]): number {
  if (regions.some(r => r.type === 'schweiz')) return SCHWEIZ.stimm

  const kantone = regions.filter(r => r.type === 'kanton')
  const staedte_outside = regions.filter(r =>
    r.type === 'stadt' && !kantone.some(k => k.kanton === r.kanton)
  )

  return sum(kantone.map(r => r.stimm)) + sum(staedte_outside.map(r => r.stimm))
}
```

Analog für `screens_politik_total`.

---

## 11. Calibration Constants (DSP-Matching)

```typescript
const CALIBRATION = {
  dooh: {
    cpm: 50,
    deliveryFactor: 0.75,
    otsMultiplier: 1.8,           // war 2.0 in v2.2
    uncertaintyBand: 0.10,
  },
  display: {
    cpm: 15,
    deliveryFactor: 0.90,
    uncertaintyBand: 0.05,
  },
  reach: {
    curveK: 0.4,                  // Hofmans-Saturation
    wearoutFloor: 0.70,           // war 0.80 in v2.2
    maxCap: 0.80,
  }
} as const
```

### Unsicherheits-Band je nach Screen-Dichte (Floor 12% in v2.3)

```typescript
function getUncertaintyBand(screens_politik_total: number): number {
  if (screens_politik_total < 30)   return 0.20  // ±20%
  if (screens_politik_total < 150)  return 0.15  // ±15% (war 13%)
  if (screens_politik_total < 500)  return 0.13  // ±13% (war 10%)
  return 0.12                                      // ±12% Floor (war 7%)
}
```

**Begründung der Anhebung**: ±7% suggerierte eine Präzision, die DOOH-Forecasting in der Realität nicht hält (branchentypisch ±15–25%). 12% Floor ist ehrlich und reduziert Reklamationsrisiko.

### Was der User NIE sieht

- Impressions (weder prognostiziert noch geliefert)
- CPM-Werte
- Delivery-Faktoren, OTS-Multiplikator
- CHF-Beträge pro Kanal
- Saturation-Kurven-Parameter

### Was der User IMMER sieht

- Reichweite als Range (von–bis)
- Frequenz pro Kampagne + „≈ pro Woche"
- Laufzeit in Tagen oder Wochen
- Ungefähre Anzahl erreichter Stimmberechtigter

---

## 12. Hinweis-System

### 12.1 Hinweise zu Budget und Frequenz

| Zustand | Trigger | UI-Text |
|---|---|---|
| `ok` | Alle Checks passieren | (kein Hinweis) |
| `below_min_budget` | `budget < B_MIN` | „Mindestbudget CHF 4'000 – wir heben automatisch an." + Auto-Snap |
| `too_thin` | `f_weekly < 2.5` | „Dein Budget ist für {X} Wochen zu dünn verteilt. Empfehlung: Laufzeit auf {Y} Wochen reduzieren." + Button „Anwenden" |
| `overkill` | `f_weekly > 10` | „Deine Frequenz ist sehr hoch. Empfehlung: Budget reduzieren oder Region erweitern." |
| `daily_below_floor_global` | `budget / days < 150` | „Tagesbudget unter CHF 150 – Ausspielung nicht garantiert." |
| `daily_below_floor_region` | `budget_region_anteil / days < 150` | „In {Region} liegt das Tagesbudget unter CHF 150 – Ausspielung dort nicht garantiert. Empfehlung: Region entfernen oder Budget erhöhen." |
| `capped_by_region` | `saturation_factor > 0.85` ODER `MAX_REACH_CAP` erreicht | „Maximale Reichweite in {Region} fast erreicht. Mehr Budget bringt nur noch wenig zusätzliche Personen." |
| `wearout_warning` | `laufzeit_weeks > 8` | „Lange Kampagnen verlieren Effizienz ab Woche 9. Für maximale Wirkung: 4–8 Wochen." |

**Geändert in v2.3**: `daily_below_floor` wurde aufgesplittet in global + pro Region. Bei Multi-Region-Auswahl wird zusätzlich geprüft, ob das anteilige Tagesbudget pro Region über CHF 150 liegt — ohne diese Prüfung würden Kampagnen in Regionen unter dem Floor stillschweigend nicht ausgespielt.

### 12.2 Hinweise zu Screen-Klassen

| Zustand | Trigger | UI-Text |
|---|---|---|
| `screen_class_begrenzt` | Region ist Klasse „Begrenzt" | „In {Gemeinde} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal." |
| `screen_class_display_dom` | Region ist Klasse „Display-dominant" | „In {Gemeinde} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt." |
| `screen_class_multi_mixed` | Mehrere Regionen, einzelne abweichend | „In Teilen deiner Region-Auswahl ist DOOH-Inventar begrenzt — der Online-Anteil wird entsprechend erhöht." |
| `no_dooh_inventory` | `politScreens === 0` | „Keine DOOH-Flächen verfügbar. Kampagne läuft zu 100% als Display." |

### 12.3 Hinweise zu Budget-Grenzen

| Zustand | Trigger | UI-Text |
|---|---|---|
| `calendly_nudge_soft` | `budget >= 20'000 && budget < 30'000` | Dezent: „Ab CHF 20'000 bieten wir persönliche Beratung. [Termin buchen]" |
| `calendly_nudge_strong` | `budget >= 30'000 && budget < 100'000` | Prominente Card: „Grosse Kampagne geplant? Ab CHF 30'000 empfehlen wir ein persönliches Gespräch. Du kannst aber auch direkt weiterbuchen. [Termin buchen] [Weiter buchen]" |
| `hard_stop_budget` | `budget >= 100'000` | „Kampagnen ab CHF 100'000 planen wir persönlich. Buchung nur nach Gespräch möglich. [Termin buchen]" — Buchen-Button deaktiviert |

### 12.4 Hinweise zu Regionen-Auswahl

| Zustand | Trigger | UI-Text |
|---|---|---|
| `region_overlap` | Überlappung in Auswahl | „{Stadt X} ist in Kanton {Y} enthalten und wird inkludiert." |
| `gemeinde_nicht_gefunden` | Statisch in Auswahl-UI | siehe §9 |

### 12.5 Priorität bei mehreren Treffern

1. `hard_stop_budget` (blockierend)
2. `below_min_budget` (blockierend)
3. `daily_below_floor_region` (blockierend, weil Auslieferung gefährdet)
4. `daily_below_floor_global` (Empfehlung)
5. `too_thin` / `overkill` (Empfehlung)
6. `capped_by_region` (Info)
7. `calendly_nudge_strong` / `calendly_nudge_soft` (Nudge)
8. `screen_class_*` / `no_dooh_inventory` (Kontext)
9. `wearout_warning` (Kontext, ab Woche 9)
10. `region_overlap` (Kontext)

### 12.6 Design-Regeln

- Dezent farbig (Violet-Akzent), kein Rot/Ampel-System
- Keine Emojis oder Icons (Ausnahme: ✓ in StepLayout)
- Tonalität: informativ und lösungsorientiert

---

## 13. UI-Regeln

### Allgemein

- **Reichweite immer als Range:** „180'000 – 220'000 Zürcherinnen und Zürcher"
- **Niemals CPM, Impressions, Delivery-Faktoren, OTS, Saturation-Parameter zeigen**
- **Niemals absoluten CHF-Split zeigen**
- **Frequenz primär als Kampagnen-Summe**, Wochen-Wert als sekundärer Kontext
- **Stimmberechtigte immer mit approximiertem Wert anzeigen**

### Pfad A (Budget-first)

```
Dein Budget: CHF 100'000
[────────────────●]  CHF 4'000 ── CHF 100'000
Laufzeit: 56 Tage
[──────────●────]    7 ── 84 Tage
┌─ Wirkungsindikator ──────────────────────────────────┐
│ DOMINANZ                                             │
│                                                      │
│  ca. 310'000 – 400'000                               │
│  Bernerinnen und Berner                              │
│                                                      │
│  ABDECKUNG     KONTAKTDRUCK     ZEITRAUM             │
│  ~32–41%       Ø 6.0×           56 Tage             │
│  der Stimm.    ≈ 6× / Woche     22. Mrz – 17. Mai   │
│                                                      │
│  KANAL-MIX            KLASSE: VOLL                   │
│  ████████████░░░░░░                                  │
│  70% Digitale Plakate    30% Online-Display          │
└──────────────────────────────────────────────────────┘
```

### Pfad B (Pakete)

```
┌─ Sichtbar ──┐  ┌─ Präsenz ✓ ─┐  ┌─ Dominanz ─┐
│  CHF 4'000  │  │  CHF 13'500 │  │  CHF 22'000 │
│  2 Wochen   │  │  4 Wochen   │  │  6 Wochen   │
│  ca. 6×     │  │  ca. 20×    │  │  ca. 36×    │
└─────────────┘  └─────────────┘  └─────────────┘

[Ausgewählt: Präsenz]

[Wirkungsindikator identisch zu Pfad A]
```

**Wichtig**: Frequenzen werden mit „ca." kommuniziert, weil sie emergent sind und je nach Region leicht variieren.

---

## 14. Pakete – Finale Definition (v2.3)

| Paket | `target_f_weekly` | Laufzeit | `target_f_campaign` | Cap-Level |
|---|---|---|---|---|
| **Sichtbar** | 3× / Woche | 14 Tage | 6× | 1 |
| **Präsenz** (Empfohlen) | 5× / Woche | 28 Tage | 20× | 2 |
| **Dominanz** | **6× / Woche** | **42 Tage** | **36×** | 3 |

**Geändert in v2.3**: Dominanz war 8×/35d in v2.2, ist jetzt **6×/42d**. Begründung:
- Politische Kampagnen profitieren von Dauer mehr als von Spitzen-Frequenz (Briefwahl-Fenster ist 28+ Tage)
- 6× ist seriöser kommunizierbar als 8× (näher an Werbemüdigkeits-Schwelle 10×)
- 42 Tage = 6 Wochen = sauberes Vielfaches der Wochen-Logik
- 35 Tage hat Dominanz-Min-Budget aus dem Laufzeit-Korridor `< 15000` herausfallen lassen — 42 Tage passt in den auf 42 erweiterten Korridor

### Default-Budget-Berechnung pro Paket (mit OTS=1.8 in v2.3)

```typescript
function calculatePackageBudget(pkg, regions): number {
  const stimm_total = dedupStimm(regions)
  const screens_politik_total = sumPolitScreens(regions)
  const split = getChannelSplit(screens_politik_total)
  const pool_target = stimm_total * getReachCap(stimm_total, pkg.level)

  // Ziel-Contacts so wählen, dass emergente Frequenz ≈ target_f_campaign
  // Dafür: contacts ≈ target_f_campaign × pool_target × saturation-Korrektur
  // Als grobe Approximation: target_contacts = target_f_campaign × pool_target × 0.7
  // (0.7 berücksichtigt Saturation-Verlust bei k=0.4)
  const target_contacts = pkg.f_campaign * pool_target * 0.7

  // Aufteilung Contacts → Imps zurück (mit OTS=1.8)
  const imps_dooh    = (target_contacts * split.dooh)    / 1.8
  const imps_display = (target_contacts * split.display) / 1.0

  const budget_dooh    = (imps_dooh    / 1000) * 50
  const budget_display = (imps_display / 1000) * 15
  const raw_budget = budget_dooh + budget_display

  return Math.max(roundBudget(raw_budget), B_MIN)
}
```

### Beispiel-Budgets Stadt Zürich (stimm 310'000, Klasse Voll)

| Paket | Cap-Level | Pool-Target | target_contacts | Budget |
|---|---|---|---|---|
| Sichtbar | 1 (6%) | 18'600 | 78'120 | ~CHF 2'500 → **CHF 4'000** (Floor) |
| Präsenz | 2 (12%) | 37'200 | 520'800 | **~CHF 13'500** |
| Dominanz | 3 (21%) | 65'100 | 1'640'520 | **~CHF 42'000** → calendly_nudge_strong |

Dominanz Stadt Zürich überschreitet `B_NUDGE_STRONG` (CHF 30'000) → prominente Beratungs-Bubble, direkte Buchung bleibt aber möglich.

### Paket-Empfehlung

Default-Empfehlung immer **Präsenz**.

### Briefwahl-Logik (unverändert)

```
Kampagnenende   = Abstimmungstag - 28 Tage (Briefwahl)
Kampagnenstart  = Kampagnenende - Laufzeit
Freigabe-Puffer = 10 Kalendertage (7 Werktage) vor Start
```

---

## 15. Edge Cases

### Abstimmungsdatum in Vergangenheit oder leer
- Keine Start-/Enddatum-Berechnung
- Präsenz als Default
- Kein Zeitdruck-Hinweis

### Kampagnenstart in Vergangenheit
- Buchung immer möglich
- UI-Text: „Deine Kampagne startet nach Freigabe (ca. 7 Werktage)."

### Region ohne DOOH-Inventar
- Auto-Split 100% Display
- Hinweis `no_dooh_inventory`

### Extreme Kombinationen
- `capped_by_region` greift (Saturation > 0.85)
- Empfehlung: Budget reduzieren oder Region erweitern

### User will Budget unter CHF 4'000
- Slider snappt auf CHF 4'000

### User will Laufzeit über 12 Wochen
- Slider-Max ist hart 84 Tage

### Multi-Region mit ungleichen Daily-Budgets
- Pro Region wird `budget_region / days >= 150` geprüft
- Hinweis `daily_below_floor_region` bei Verletzung

---

## 16. Migration Plan – Arbeitspakete

### ✅ Paket A – Datenbereinigung & Buchbarkeit (ERLEDIGT 22.04.2026)

### ✅ Paket B – Preislogik-Konsolidierung v2.2 (ERLEDIGT)

### Paket E – v2.3-Migration (NÄCHSTER SCHRITT)

**Ziel:** Alle v2.3-Änderungen in `lib/preislogik.ts` umsetzen.

Umfang:
1. Konstanten anpassen: `F_MIN_WEEKLY=2.5`, `DOOH_OTS_MULTIPLIER=1.8`, `REACH_CURVE_K=0.4`, `WEAROUT_FLOOR=0.70`
2. Reach-Caps anheben (+50%-Tabelle in §6)
3. `applyHofmansSaturation()` einführen, `min(raw, cap)` ersetzen
4. `inferCapLevel()` neu schreiben (Pfad A) — Distanz zu paket-Frequenz statt Schwellwert-Inferenz
5. `calculatePackageBudget()` mit OTS=1.8 anpassen
6. Dominanz-Spec auf 6×/42d
7. Multi-Region-Klassen-Aggregation in `region-buchbarkeit.ts` ändern
8. `daily_below_floor`-Check pro Region erweitern
9. Uncertainty-Band auf neue Werte (20/15/13/12)

**Geschätzter Aufwand:** 3–4 Prompts

### Paket C – UI Pfad A / Pfad B
(unverändert ggü. v2.2-Plan)

### Paket D – Testing & Kalibrierung (nach Go-Live)

- Erste 10 Kampagnen mit Splicky/Adform tracken
- `REACH_CURVE_K=0.4` validieren — primärer Kalibrierungs-Parameter
- `DOOH_OTS_MULTIPLIER=1.8` gegen reale Audience-Messungen validieren
- `WEAROUT_FLOOR=0.70` validieren
- Reach-Caps validieren — sind +50% gegenüber v2.2 angemessen?
- B2B/B2C auf dieselbe Logik migrieren

---

## 17. Offene Punkte (TBD-Liste)

| Punkt | Status | Verantwortlich |
|---|---|---|
| Delivery-Faktoren DOOH/Display | Arbeitshypothese 0.75/0.90 | Dani, nach ersten 10 Kampagnen |
| `REACH_CURVE_K=0.4` validieren | Wichtigster Kalibrierungs-Parameter | Jacky + Dani |
| `DOOH_OTS_MULTIPLIER=1.8` validieren | Konservativster Branchenwert | Jacky + Dani |
| Reach-Caps (+50% in v2.3) validieren | Rückkehr zu v2.2-Werten möglich | Jacky + Dani |
| Wearout-Floor 0.70 validieren | Konservativ modelliert | Beobachten nach Go-Live |
| B2B/B2C Migration auf v2.3 | Geplant | Post-Go-Live |
| Splicky-API Post-Campaign-Abgleich | Nice-to-have | Mittelfristig |
| **AGB/Impressum Partner-Code-Klausel** | **Offen, vor Partner-Code-Launch zwingend** | **Jacky** |
| Partner-Code-System-Review | Offenes Thema, ausserhalb v2.3 | Jacky |

---

## 18. Partner-Code-System

(unverändert ggü. v2.2 — wird in separater Iteration überarbeitet)

Inhalt §18.1–§18.10 wie in v2.2. Die Discount/Commission-Logik wird in einer separaten Iteration neu bewertet.

---

## 19. Versionshistorie

| Version | Datum | Änderung |
|---|---|---|
| v1 | – | `vio-regelkatalog-paketlogik.md` – fixe Pakete, lineare Formel |
| v2 | 21.04.2026 | Hybrid-Flow, dynamischer Split, Wochen-Frequenz-Leitplanken, konkave Budget-Laufzeit-Kopplung, tiered Reach-Caps, Wearout, Dedup, Kampagnentyp entfernt, Partner-Code-System |
| v2.1 | 22.04.2026 | Drei-Klassen-Screen-System; Buchbarkeit (ODER-Regel); Kantone auf BFS 2024; 16 nicht-buchbare Gemeinden entfernt; Paket A umgesetzt |
| v2.2 | 28.04.2026 | Hofmans/ER3 raus; rawReach = contacts/(F_REC_WEEKLY × weeks); Cap-Level-Inferenz; Decision-Engine-Signale; wearout_warning; OTS=2.0 |
| **v2.3** | **04.05.2026** | **Hofmans-Saturation zurück (k=0.4); Frequenz emergent; Dominanz 6×/42d (war 8×/35d); OTS=1.8 (war 2.0); Reach-Caps +50%; F_MIN_WEEKLY=2.5 (war 3); Wearout-Floor=0.70 (war 0.80); Uncertainty-Band-Floor=12% (war 7%); Multi-Region-Klassifikation aus aggregiertem politScreens_total (war „strengste"); daily_below_floor pro Region; Laufzeit-Korridor `<15000` auf max=42 erweitert; Pfad A/B Reach-Symmetrie hergestellt** |

---

**Ende Regelkatalog v2.3**
