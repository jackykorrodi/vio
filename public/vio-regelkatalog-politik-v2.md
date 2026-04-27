# VIO Regelkatalog: Preislogik & Kampagnenplanung – Politik v2

> **Status:** Final (27. April 2026) — v2.2
> **Scope:** Politik-Flow. B2B/B2C migrieren später auf dieselbe Logik.
> **Ersetzt:** `public/vio-regelkatalog-paketlogik.md`
> **Zielablage:** `public/vio-regelkatalog-politik-v2.md`
> **Single Source of Truth für:** `lib/preislogik.ts`, Step2PolitikBudget, Wirkungsindikator

---

## 1. Produktprinzip – Zwei Pfade, ein Wirkungsindikator

VIO bietet zwei Einstiegspfade in die Kampagnenplanung. Beide münden im gleichen Wirkungsindikator und nutzen dieselbe Berechnungslogik.

### Pfad A – Budget-first

User kennt sein Budget und will sofort sehen, was er damit erreicht.

```
Input:    Region(en) + Budget + Laufzeit
Output:   Reichweite-Range + Frequenz + Channel-Split
```

### Pfad B – Pakete mit Feintuning

User ist unentschieden und sucht Orientierung. Drei Pakete dienen als Anker, werden aber per Slider feintunbar.

```
Input:    Region(en) + Paket-Vorauswahl (Sichtbar / Präsenz / Dominanz)
Output:   Drei Karten → User wählt → selber Wirkungsindikator wie Pfad A
```

### Pfad-Bestimmung

In Step 1 entscheidet der User implizit über den Pfad:

- Budget-Slider bewegt (oder Wert eingegeben) → **Pfad A** aktiv
- "Ich weiss es noch nicht"-Toggle aktiv → **Pfad B** aktiv

Wechsel zwischen Pfaden ist jederzeit möglich. Der Budget-Wert wird beim Wechsel übernommen.

### Was nicht mehr im Flow ist

Die Frage nach Kampagnentyp (JA / NEIN / Kandidatur / Mobilisierung) und Wahl vs. Abstimmung ist **komplett entfernt**. Sie hatte keinen Einfluss auf Preis, Reichweite oder Frequenz. Differenzierung erfolgt bei Bedarf im Creative-Step (Headline-Vorschläge).

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
| `F_MIN_WEEKLY` | 3× / Woche | Unter dieser Schwelle: unwirksam |
| `F_REC_WEEKLY` | 5× / Woche | VIO-Empfehlung Präsenz |
| `F_MAX_WEEKLY` | 10× / Woche | Ab hier: Werbemüdigkeit |

### Reach-Konstanten

| Variable | Wert | Zweck |
|---|---|---|
| `MAX_REACH_CAP` | 80% | Absolute Obergrenze des erreichbaren Pools |
| `EXPONENT_BUDGET_LAUFZEIT` | 0.75 | Konkave Kopplung Budget↔Laufzeit |
| `REACH_CURVE_K` | 0.4 | Hofmans-Steilheit (Impressions pro Kopf → Reach). Kalibrierung nach 10 Kampagnen. |
| `ER3_BETA` | 5.0 | Effective Reach 3+ Heterogenität (Long-Tail-Faktor). |
| `ER3_OFFSET` | 0.5 | Mindest-Kampagnenfrequenz für Erinnerungswirkung. |

### CPM-Tarife

| Kanal | CPM | Quelle |
|---|---|---|
| DOOH | CHF 50 | VIO-Verkaufspreis inkl. Marge |
| Display | CHF 15 | VIO-Verkaufspreis inkl. Marge |

Der **Misch-CPM wird dynamisch** pro Kampagne berechnet, nicht als fixer Wert. Formel siehe Abschnitt 7.

---

## 3. Die fünf Stellschrauben und ihr Zusammenspiel

### Primärinputs (User steuert)

1. **Region(en)** – bestimmt Pool, Tier, DOOH-Inventar, Caps
2. **Budget** – Hauptinput in Pfad A, feintunbar in Pfad B
3. **Laufzeit** – gekoppelt an Budget (konkav)

### Abgeleitete Werte (System berechnet)

4. **Frequenz** (implizit aus Budget, Pool, Laufzeit)
5. **Channel-Split** (dynamisch aus `screens_politik`)

### Zusammenspiel-Regeln

- Bei jeder Änderung eines Primärinputs werden alle abgeleiteten Werte neu berechnet
- Bei jeder Änderung wird gegen Leitplanken geprüft (`F_MIN_WEEKLY`, `F_MAX_WEEKLY`, `DAILY_MIN`, `MAX_REACH_CAP`)
- Bei Leitplanken-Verletzung erscheint ein Hinweis (Abschnitt 11), aber kein Auto-Override
- Budget↔Laufzeit sind **visuell gekoppelt**: Änderung an einem bewegt den anderen mit (konkav, Exponent 0.75)

---

## 4. Preislogik – Die eine Formel

```typescript
// Inputs
budget           // CHF, >= B_MIN, <= B_HARD_MAX
laufzeit_days    // Tage, LAUFZEIT_MIN <= x <= LAUFZEIT_MAX
regions[]        // gewählte Regionen mit stimm + screens_politik

// Schritt 1 — Pool-Aggregation (mit Überlappungs-Deduplizierung, Abschnitt 9)
stimm_total          = dedupStimm(regions)
screens_politik_total = sum(regions[i].screens_politik)

// Schritt 2 — Tier & Split (Abschnitt 7)
split = getChannelSplit(screens_politik_total)
mixed_cpm = split.dooh * 50 + split.display * 15

// Schritt 3 — Impressions aus Budget
total_impressions = (budget / mixed_cpm) * 1000

// Schritt 4 — Reach-Cap (Abschnitt 6)
pool_cap = getReachCapByPoolSize(stimm_total, paket_level)
max_reachable = stimm_total * pool_cap

// Schritt 5 — Delivery-Anpassung (Abschnitt 10)
delivered_impressions_dooh    = total_impressions * split.dooh * CAL.dooh.delivery
delivered_impressions_display = total_impressions * split.display * CAL.display.delivery

// Schritt 6 — Hofmans-Sättigung (ersetzt lineare Frequenz-Formel)
// Modell: je mehr Impressions pro Kopf, desto weniger zusätzliche Unique Reach
laufzeit_weeks        = laufzeit_days / 7
impressions_effective = delivered_impressions_dooh + delivered_impressions_display

imp_per_capita   = impressions_effective / stimm_total
reach_factor     = 1 - 1 / (1 + REACH_CURVE_K * imp_per_capita)
unique_reach_raw = stimm_total * MAX_REACH_CAP * reach_factor
unique_reach     = applyWearoutCurve(unique_reach_raw, laufzeit_weeks)
capped_by_region = reach_factor >= 0.95

// Effektive Frequenzen (emergent, nicht mehr als Zielgrösse)
f_campaign_effective = unique_reach > 0 ? impressions_effective / unique_reach : 0
f_weekly_effective   = laufzeit_weeks > 0 ? f_campaign_effective / laufzeit_weeks : 0

// Schritt 7 — Effective Reach 3+ (Erinnerungswirkung)
// Beta-Approximation: wie viele Unique-Reach-Personen ≥3 Kontakte erhalten
er3_factor        = max(0, 1 - exp(-(f_campaign_effective - ER3_OFFSET) / ER3_BETA))
effective_reach_3 = unique_reach * er3_factor

// Schritt 8 — Campaign Mode (für UI-Badge und Hinweise)
campaign_mode = f_weekly_effective > F_MAX_WEEKLY ? 'overkill'
              : f_weekly_effective < 1.5           ? 'awareness'
              : f_weekly_effective < 4.5           ? 'balanced'
              : 'mobilization'

// Schritt 9 — Unsicherheits-Band
band      = getUncertaintyBand(screens_politik_total)
reach_von = round(unique_reach * (1 - band), 500)
reach_bis = round(unique_reach * (1 + band), 500)
er3_von   = round(effective_reach_3 * (1 - band), 500)
er3_bis   = round(effective_reach_3 * (1 + band), 500)
```

### Output-Struktur (ImpactResult)

| Feld | Beschreibung |
|---|---|
| `reachVon / reachBis` | Unique Reach Range (Headline-Zahl im UI) |
| `effectiveReach3plus` | Personen mit ≥3 Kontakten (Erinnerungswirkung) |
| `effectiveReach3plusVon/Bis` | Effective Reach als Range |
| `frequencyCampaign` | Durchschnittliche Gesamt-Frequenz (emergent) |
| `frequencyWeekly` | Durchschnittliche Wochen-Frequenz (intern, Validierung) |
| `campaignMode` | awareness / balanced / mobilization / overkill |

### Budget↔Laufzeit-Kopplung (Exponent 0.75)

Wenn User die Laufzeit ändert, wird Budget automatisch gekoppelt:

```typescript
// Referenz: Präsenz @ 28 Tage
budget_new = budget_reference * (laufzeit_days_new / 28) ^ 0.75
```

**Beispiele (Referenz Präsenz CHF 13'500 @ 28 Tage):**

| Laufzeit | Budget | Tagesbudget | F_weekly |
|---|---|---|---|
| 14 Tage | CHF 8'000 | CHF 570 | 5.5× |
| 21 Tage | CHF 10'900 | CHF 520 | 5.2× |
| **28 Tage** | **CHF 13'500** | **CHF 480** | **5.0×** |
| 42 Tage | CHF 17'800 | CHF 425 | 4.5× |
| 56 Tage | CHF 21'600 | CHF 385 | 4.0× |
| 84 Tage | CHF 28'500 | CHF 340 | 3.4× |

Die Kopplung ist **überschreibbar**: User kann Budget-Slider nach Laufzeit-Änderung frei bewegen. Beim nächsten Laufzeit-Event wird die Kopplung wiederhergestellt.

---

## 5. Frequenz-Modell

### Zwei Metriken, gleiche Information

**Intern (Validierung + Splicky-Steuerung):**

```
F_weekly = impressions_effective / (unique_reach × laufzeit_weeks)
```

Gegen Leitplanken geprüft:
- `F_weekly < 3` → Hinweis "Zu dünn für Wirkung"
- `F_weekly > 10` → Hinweis "Werbemüdigkeit"

**Extern (User-Anzeige):**

```
F_campaign = F_weekly × laufzeit_weeks
```

Angezeigt als:

```
Ø 20× pro Person während der Kampagne
(≈ 5× pro Woche über 4 Wochen)
```

Die Wochen-Angabe ist erklärender Kontext, nicht Primärmetrik.

### Campaign Mode (neu ab v2.2)

Die Wochen-Frequenz bestimmt nicht mehr die Reach, sondern emergiert aus ihr. Sie dient als Qualitäts-Label für die UI.

| Mode | F_weekly | UI-Badge | Bedeutung |
|---|---|---|---|
| `awareness` | < 1.5× | "AWARENESS" | Breite Streuung, wenig Wiederholung |
| `balanced` | 1.5–4.5× | "STANDARD" | Ausgewogene Wirkung |
| `mobilization` | 4.5–10× | "MOBILISIERUNG" | Hohe Wiederholung, Endspurt |
| `overkill` | > 10× | "SEHR HOHE FREQUENZ" | Werbemüdigkeit-Risiko, Hinweis aktiv |

Hinweis `too_thin` triggert neu bei f_weekly < 0.5 (statt < F_MIN_WEEKLY = 3). Begründung: awareness-Mode (~1×/Wo) ist ein legitimer Kampagnentyp.

### Warum Wochen-Leitplanken intern

Krugman's Effective-Frequency-Regel (3+) gilt nur innerhalb eines Entscheidungszeitfensters. Eine 12-Wochen-Kampagne mit 4× Gesamt-Frequenz (= 0.33× / Woche) ist nicht wirksam, auch wenn die Summe formal "ausreicht". Die Wochenmetrik fängt das zuverlässig ab.

---

## 6. Reach-Caps nach Pool-Grösse (tiered)

Die realistisch erreichbare Reichweite hängt nicht-linear von der Populationsgrösse ab. Je grösser der Pool, desto tiefer der prozentuale Anteil, der mit vernünftigem Budget erreichbar ist.

| Pool-Grösse (stimm_total) | Sichtbar | Präsenz | Dominanz |
|---|---|---|---|
| < 50'000 | 15% | 30% | 45% |
| 50'000 – 200'000 | 8% | 15% | 25% |
| 200'000 – 500'000 | 4% | 8% | 14% |
| > 500'000 | 2% | 4% | 8% |

### Zusätzlicher harter Cap

`MAX_REACH_CAP = 80%` – niemals höher, auch bei unendlichem Budget.

### Wirkung

Die Caps verhindern, dass lineare CPM-Rechnungen unrealistische Reichweiten liefern (z.B. Kanton ZH mit CHF 20'000 = theoretisch 40% Reach, real max 8%).

Bei Cap-Anschlag greift Hinweis `capped_by_region` (Abschnitt 11).

---

## 7. Channel-Split und Screen-Klassen

### 7.1 Grundprinzip

Der DOOH/Display-Split ist **nicht fix**, sondern passt sich der Screen-Verfügbarkeit der Zielregion an. VIO arbeitet mit drei Screen-Klassen, die automatisch den Split und allfällige UI-Hinweise bestimmen.

### 7.2 Berechnung politisch freigegebener Screens

Nicht jeder DOOH-Screen ist standardmässig für politische Werbung freigegeben. Retail-Screens (Apotheken, Shoppingcenter, Kinos etc.) sind meist ausgeschlossen.

**Arbeitshypothese (empirisch validiert auf Basis Schweizer DOOH-Netz):**

```
politScreens = max(screens × 0.7, screens_politik aus JSON)
```

- `screens` = theoretisches Gesamt-Inventar (aus `dooh-screens.json`)
- `0.7` = Freigabequote (CH-Schnitt ~78%, konservativ bei 70% angesetzt)
- `screens_politik` = operativ validierter Wert pro Region, falls höher

Die `max()`-Logik ist defensiv-optimistisch: Wenn die Datenbasis für eine Region bereits höhere Werte zeigt, nutzen wir diese.

### 7.3 Die drei Screen-Klassen

| Klasse | Bedingung | DOOH / Display | Misch-CPM | UI-Hinweis |
|---|---|---|---|---|
| **Voll** | `politScreens ≥ 30` | 70% / 30% | CHF 39.50 | kein Hinweis |
| **Begrenzt** | `politScreens 10–29` | 50% / 50% | CHF 32.50 | dezenter Hinweis |
| **Display-dominant** | `politScreens < 10` | 20% / 80% | CHF 22.00 | klarer Hinweis |

**Kantone und „Gesamte Schweiz"** sind **immer Klasse Voll** (Aggregat-Inventar ist ausreichend).

### 7.4 Hinweis-Texte

**Begrenzt:**
> „In {Gemeinde} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal."

**Display-dominant:**
> „In {Gemeinde} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt."

**Mehrere Regionen mit gemischten Klassen:**
> „In Teilen deiner Region-Auswahl ist DOOH-Inventar begrenzt — der Online-Anteil wird entsprechend erhöht."

### 7.5 Aggregation bei Mehrfach-Region-Auswahl

Bei gewählter Kombination mehrerer Regionen:

- **Split:** Gewichteter Durchschnitt nach `stimm`-Anteil jeder Region
- **Klasse:** Strengste (Display-dominant > Begrenzt > Voll)
- **Hinweis:** Angepasster Multi-Region-Text (siehe oben)

### 7.6 Edge Case: Kein DOOH verfügbar

Wenn `politScreens === 0` (theoretisch möglich, in unserer aktuellen Liste ausgeschlossen): Auto-Split 100% Display. Hinweis `no_dooh_inventory` (Abschnitt 11).

---

## 8. Laufzeit-Korridore & Wearout

### Laufzeit-Korridor (angepasst an Budget)

Der Laufzeit-Slider passt seine Grenzen automatisch ans Budget an:

```typescript
function getLaufzeitCorridor(budget: number): { min: number; max: number } {
  if (budget < 6000)   return { min: 7,  max: 21 }  // 1–3 Wochen
  if (budget < 15000)  return { min: 14, max: 35 }  // 2–5 Wochen
  if (budget < 30000)  return { min: 21, max: 56 }  // 3–8 Wochen
  return                 { min: 28, max: 84 }        // 4–12 Wochen
}
```

**Hard Min:** 7 Tage · **Hard Max:** 84 Tage (12 Wochen)

### Wearout-Kurve (>8 Wochen)

Ab Woche 9 verliert jede zusätzliche Impression überproportional an Wirkung – Werbemüdigkeit setzt ein. Modellierung:

```typescript
function applyWearoutCurve(
  unique_reach: number,
  laufzeit_weeks: number
): number {
  if (laufzeit_weeks <= 8) return unique_reach

  const wearout_factor = 1 - (laufzeit_weeks - 8) * 0.03
  const clamped = Math.max(wearout_factor, 0.80)
  return unique_reach * clamped
}
```

**Beispiele:**
- 8 Wochen → Faktor 1.00 (kein Abschlag)
- 10 Wochen → Faktor 0.94 (6% Abschlag)
- 12 Wochen → Faktor 0.88 (12% Abschlag)
- 16 Wochen → Faktor 0.80 (harter Floor, falls doch erlaubt)

### Status Wearout-Kurve

Modelliert mit konservativen Werten (3% pro Zusatzwoche, Floor 80%). **Nach ersten 20 Kampagnen** gegen reale Delivery-Daten validieren und ggf. justieren.

---

## 9. Buchbarkeit von Regionen

Nicht jede Schweizer Gemeinde wird im VIO-Politik-Flow angeboten. Es gibt eine harte Qualifikations-Regel, die bestimmt, welche Gemeinden in der Auswahl erscheinen.

### 9.1 Qualifikations-Regel (ODER-Logik)

Eine Gemeinde ist buchbar, wenn:

```
(stimm ≥ 10'000) ODER (politScreens ≥ 20)
UND NICHT in PERMANENTLY_EXCLUDED
```

Die ODER-Verknüpfung stellt sicher, dass **entweder Relevanz (genug Wähler:innen) oder Inventar (genug Screens)** gegeben ist. Beides zusammen ist nicht nötig.

**Kantone und „Gesamte Schweiz"** sind **immer buchbar**.

### 9.2 Permanent ausgeschlossene Gemeinden

Vier Gemeinden sind unabhängig von den Schwellen ausgeschlossen (0 standardmässig freigegebene Screens):

- Küsnacht (ZH) – **nicht zu verwechseln mit Küssnacht (SZ)**, das buchbar ist
- Martigny
- Opfikon
- Veyrier

### 9.3 Aktuelle Liste

Nach Anwendung der Regel (Stand 22.04.2026):

| Kategorie | Anzahl |
|---|---|
| Kantone | 26 |
| Städte/Gemeinden (Klasse Voll) | 61 |
| Städte/Gemeinden (Klasse Begrenzt) | 32 |
| Städte/Gemeinden (Klasse Display-dominant) | 10 |
| **Gesamt buchbar** | **130** (inkl. Schweiz) |

16 ursprünglich gelistete Gemeinden wurden entfernt, weil sie weder die stimm- noch die Screen-Schwelle erreichten.

### 9.4 „Meine Gemeinde fehlt"-Hinweis

Im UI der Regionen-Auswahl erscheint unter dem Suchfeld (oder als Fallback, wenn eine Suche leer zurückkommt):

> „Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte Gemeinde."

Konstante im Code: `GEMEINDE_NICHT_GEFUNDEN_HINWEIS` in `lib/region-buchbarkeit.ts`.

### 9.5 Implementierung

Die Logik ist in `lib/region-buchbarkeit.ts` gekapselt. Exports:

- `isBuchbar(region)` – boolean
- `filterBuchbareRegionen(regions)` – gefilterte Liste
- `getPolitScreens(region)` – berechnete Anzahl politischer Screens
- `klassifiziereRegion(region)` – Klasse + Split + Hinweis
- `klassifiziereMehrereRegionen(regions)` – aggregiert für Mehrfach-Auswahl
- `PERMANENTLY_EXCLUDED` – Set der ausgeschlossenen Namen
- `GEMEINDE_NICHT_GEFUNDEN_HINWEIS` – UI-Text-Konstante

Nicht-buchbare Gemeinden sind **physisch aus der `STAEDTE`-Liste entfernt**, nicht nur zur Laufzeit gefiltert. Dies garantiert, dass die Auswahl immer konsistent mit der Buchbarkeit ist.

---

## 10. Regionen-Kombinations-Regeln

Bei Mehrfachauswahl werden Überlappungen dedupliziert.

### Regel 1 – Gesamte Schweiz absorbiert alles

Wenn `Gesamte Schweiz` gewählt: alle anderen Regionen werden ignoriert. Hinweis: `"Gesamte Schweiz deckt alle anderen Auswahlen ab."`

### Regel 2 – Kanton absorbiert enthaltene Städte

Wenn `Kanton X` + `Stadt Y` (in Kanton X) gewählt: Stadt wird absorbiert, aber im UI als "inkludiert" markiert (nicht entfernt).

Beispiel: Kanton ZH + Stadt Zürich + Stadt Winterthur → `stimm_total = Kanton ZH`, UI zeigt "Stadt Zürich und Winterthur sind inkludiert".

### Regel 3 – Städte ohne Überlappung werden summiert

`Stadt Zürich + Stadt Winterthur + Stadt Basel` → `stimm_total = sum(alle drei)`

### Regel 4 – Mehrere Kantone

Normale Summierung, keine Überlappung (Kantone sind disjunkt).

### Implementierung (Pseudocode)

```typescript
function dedupStimm(regions: Region[]): number {
  if (regions.some(r => r.type === 'schweiz')) {
    return SCHWEIZ.stimm
  }

  const kantone = regions.filter(r => r.type === 'kanton')
  const staedte_outside = regions.filter(r =>
    r.type === 'stadt' &&
    !kantone.some(k => k.kanton === r.kanton)
  )

  return sum(kantone.map(r => r.stimm))
       + sum(staedte_outside.map(r => r.stimm))
}
```

Analog für `screens_politik_total`.

---

## 11. Calibration Constants (DSP-Matching)

Diese Konstanten kalibrieren unsere Prognose gegen reale Splicky/Adform-Delivery. Sie werden nach ersten ~10 Kampagnen justiert.

```typescript
const CALIBRATION = {
  dooh: {
    cpm: 50,
    deliveryFactor: 0.75,   // TBD mit Dani
    uncertaintyBand: 0.10,
  },
  display: {
    cpm: 15,
    deliveryFactor: 0.90,   // TBD mit Dani
    uncertaintyBand: 0.05,
  }
} as const

// Letzter Abgleich: [DATUM von PERSON nach N Kampagnen]
```

### Unsicherheits-Band je nach Screen-Dichte

```typescript
function getUncertaintyBand(screens_politik_total: number): number {
  if (screens_politik_total < 30)   return 0.20  // ±20%
  if (screens_politik_total < 150)  return 0.13  // ±13%
  if (screens_politik_total < 500)  return 0.10  // ±10%
  return 0.07                                      // ±7%
}
```

### Was der User NIE sieht

- Impressions (weder prognostiziert noch geliefert)
- CPM-Werte
- Delivery-Faktoren
- CHF-Beträge pro Kanal
- Fill-Rates

### Was der User IMMER sieht

- Reichweite als Range (von–bis)
- Frequenz pro Kampagne + "≈ pro Woche"
- Laufzeit in Tagen oder Wochen
- Ungefähre Anzahl erreichter Stimmberechtigter (immer!)

### Offen (TBD)

- Echte Delivery-Faktoren nach ersten 10 Kampagnen validieren
- Splicky-API-Integration für Post-Campaign-Abgleich (Mittelfristig)

---

## 12. Hinweis-System

Alle Hinweise sind **informativ**, kein Auto-Override. Das System zeigt maximal einen prominenten Hinweis gleichzeitig.

### 12.1 Hinweise zu Budget und Frequenz

| Zustand | Trigger | UI-Text |
|---|---|---|
| `ok` | Alle Checks passieren | (kein Hinweis) |
| `below_min_budget` | `budget < B_MIN` | „Mindestbudget CHF 4'000 – wir heben automatisch an." + Auto-Snap |
| `too_thin` | `F_weekly < 3` | „Dein Budget ist für {X} Wochen zu dünn verteilt. Empfehlung: Laufzeit auf {Y} Wochen reduzieren." + Button „Anwenden" |
| `overkill` | `F_weekly > 10` | „Deine Frequenz ist sehr hoch. Empfehlung: Budget reduzieren oder Region erweitern." |
| `daily_below_floor` | `budget / days < 150` | „Tagesbudget unter CHF 150 – Ausspielung nicht garantiert. Kürzere Laufzeit empfohlen." |
| `capped_by_region` | `unique_reach_raw > max_reachable` | „Maximale Reichweite in {Region} erreicht. Mehr Budget bringt keine zusätzlichen Personen." |

### 12.2 Hinweise zu Screen-Klassen

Diese Hinweise informieren über die Zusammensetzung der Kampagne basierend auf dem verfügbaren DOOH-Inventar (siehe Abschnitt 7).

| Zustand | Trigger | UI-Text |
|---|---|---|
| `screen_class_begrenzt` | Gewählte Region ist Klasse „Begrenzt" | „In {Gemeinde} läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal." |
| `screen_class_display_dom` | Gewählte Region ist Klasse „Display-dominant" | „In {Gemeinde} erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt." |
| `screen_class_multi_mixed` | Mehrere Regionen mit gemischten Klassen | „In Teilen deiner Region-Auswahl ist DOOH-Inventar begrenzt — der Online-Anteil wird entsprechend erhöht." |
| `no_dooh_inventory` | `politScreens === 0` (Edge Case) | „Keine DOOH-Flächen verfügbar. Kampagne läuft zu 100% als Display." |

### 12.3 Hinweise zu Budget-Grenzen

| Zustand | Trigger | UI-Text |
|---|---|---|
| `calendly_nudge_soft` | `budget >= 20'000 && budget < 30'000` | Dezent: „Ab CHF 20'000 bieten wir persönliche Beratung. [Termin buchen]" |
| `calendly_nudge_strong` | `budget >= 30'000 && budget < 100'000` | Prominente Card: „Grosse Kampagne geplant? Ab CHF 30'000 empfehlen wir ein persönliches Gespräch. Du kannst aber auch direkt weiterbuchen. [Termin buchen] [Weiter buchen]" |
| `hard_stop_budget` | `budget >= 100'000` | „Kampagnen ab CHF 100'000 planen wir persönlich. Buchung nur nach Gespräch möglich. [Termin buchen]" — Buchen-Button deaktiviert |

### 12.4 Hinweise zu Regionen-Auswahl

| Zustand | Trigger | UI-Text |
|---|---|---|
| `region_overlap` | Überlappung in Auswahl (siehe Abschnitt 10) | „{Stadt X} ist in Kanton {Y} enthalten und wird inkludiert." |
| `gemeinde_nicht_gefunden` | Info-Baustein in Auswahl-UI | „Deine Gemeinde ist nicht in der Liste? Das liegt am Verhältnis zwischen Einwohnerzahl und verfügbaren DOOH-Flächen vor Ort. Melde dich bei uns — wir finden eine Lösung, zum Beispiel über den Kanton oder eine benachbarte Gemeinde." |

### 12.5 Priorität bei mehreren Treffern

Wenn mehrere Hinweise gleichzeitig zutreffen, wird nur einer prominent angezeigt. Priorität (absteigend):

1. `hard_stop_budget` (blockierend)
2. `below_min_budget` (blockierend)
3. `too_thin` / `overkill` / `daily_below_floor` (Empfehlung)
4. `capped_by_region` (Info)
5. `calendly_nudge_strong` / `calendly_nudge_soft` (Nudge)
6. `screen_class_*` (Kontext)
7. `region_overlap` (Kontext)

Die Gemeinde-nicht-gefunden-Info ist **kein Trigger-Hinweis**, sondern ein statischer Baustein in der Regionen-Auswahl-Komponente.

### 12.6 Design-Regeln

- Hinweise sind dezent farbig (Violet-Akzent), kein Rot/Ampel-System
- Keine Emojis oder Icons (Ausnahme: ✓ in StepLayout)
- Tonalität: informativ und lösungsorientiert, nie warnend

---

## 13. UI-Regeln

### Allgemein

- **Reichweite immer als Range:** "180'000 – 220'000 Zürcherinnen und Zürcher"
- **Niemals CPM, Impressions, Delivery-Faktoren, Fill-Rate zeigen**
- **Niemals absoluten CHF-Split zeigen** (weder DOOH-Anteil in CHF noch Display-Anteil in CHF)
- **Frequenz primär als Kampagnen-Summe**, Wochen-Wert als sekundärer Kontext
- **Stimmberechtigte immer mit approximiertem Wert anzeigen** (Transparenz, Basis der Rechnung)

### Pfad A (Budget-first)

```
Dein Budget: CHF 100'000
[────────────────●]  CHF 4'000 ── CHF 100'000
Laufzeit: 56 Tage
[──────────●────]    7 ── 84 Tage
┌─ Wirkungsindikator ──────────────────────────────────┐
│ AWARENESS                                            │
│                                                      │
│  310'000 – 355'000                                   │
│  Bernerinnen und Berner                              │
│                                                      │
│  Davon 220'000–260'000 mit Erinnerungswirkung        │
│  (mind. 3× gesehen)                                  │
│                                                      │
│  ABDECKUNG     KONTAKTDRUCK     ZEITRAUM             │
│  40–46%        Ø 5.8×           56 Tage             │
│  der Stimm.    ≈ 0.7× / Woche   22. Mrz – 17. Mai   │
│                                                      │
│  KANAL-MIX            KLASSE: VOLL                   │
│  ████████████░░░░░░                                  │
│  70% Digitale Plakate    30% Online-Display          │
└──────────────────────────────────────────────────────┘
```

### Pfad B (Pakete)

```
┌─ Sichtbar ──┐  ┌─ Präsenz ✓ ─┐  ┌─ Dominanz ─┐
│  CHF 4'000  │  │  CHF 13'500 │  │  CHF 27'000 │
│  2 Wochen   │  │  4 Wochen   │  │  5 Wochen   │
│  6× gesamt  │  │  20× gesamt │  │  40× gesamt │
└─────────────┘  └─────────────┘  └─────────────┘

[Ausgewählt: Präsenz]

[Wirkungsindikator identisch zu Pfad A]

Feintuning:
  Budget:    [────●────]  CHF 13'500
  Laufzeit:  [──●──]      28 Tage
```

### Paket-Slider-Konflikt

Wenn User Paket wählt und Slider ausserhalb der Paket-Range zieht:
- Paket bleibt visuell aktiv (Haken bleibt)
- Kleiner Hinweis: "Das entspricht eher {anderes Paket} →" (klickbar)
- **Keine** automatische Paket-Änderung, **keine** Slider-Snap-Zurück

### Pfad-Wechsel

In beiden Pfaden ist Wechsel möglich:
- Pfad A → Pfad B: Button "Pakete ansehen" (Budget-Wert als Start übernommen)
- Pfad B → Pfad A: Button "Eigenes Budget eingeben" (Paket-Budget als Start)

---

## 14. Pakete – Finale Definition

Paket-Frequenzen sind politisch-stark kalibriert (high-involvement). Budgets werden dynamisch aus Region + Frequenz + Laufzeit berechnet.

| Paket | F_weekly | Laufzeit | F_campaign | Ziel-Reach |
|---|---|---|---|---|
| **Sichtbar** | 3× / Woche | 14 Tage | 6× | Reach-Cap Level 1 |
| **Präsenz** (Empfohlen) | 5× / Woche | 28 Tage | 20× | Reach-Cap Level 2 |
| **Dominanz** | 8× / Woche | 35 Tage | 40× | Reach-Cap Level 3 |

### Budget-Berechnung pro Paket (nicht mehr fix)

```typescript
function calculatePackageBudget(pkg, regions): number {
  const reach_cap = getReachCapByPoolSize(stimm_total, pkg.level)
  const target_reach = stimm_total * reach_cap

  const impressions = target_reach * pkg.f_weekly * (pkg.days / 7)
  const split = getChannelSplit(screens_politik_total)
  const mixed_cpm = split.dooh * 50 + split.display * 15

  const raw_budget = (impressions / 1000) * mixed_cpm
  return Math.max(roundBudget(raw_budget), B_MIN)
}
```

Beispiel-Budgets **Stadt Zürich** (stimm 310'000, screens_politik 869):

| Paket | Reach-Cap | Ziel-Reach | Impressions | Budget |
|---|---|---|---|---|
| Sichtbar | 4% | 12'400 | 74'400 | CHF 2'900 → **CHF 4'000** (Floor) |
| Präsenz | 8% | 24'800 | 496'000 | **CHF 19'500** |
| Dominanz | 14% | 43'400 | 1'736'000 | **CHF 68'400** → überschreitet Self-Service |

Für Dominanz-Stadt-ZH greift `calendly_nudge_strong` → prominente Beratungs-Bubble, direkte Buchung bleibt aber möglich.

### Paket-Empfehlung

Da der Kampagnentyp entfernt wurde, ist die Default-Empfehlung immer **Präsenz**. Keine Datum-basierte Dynamik mehr (Briefwahl-Logik bleibt nur für Startdatums-Berechnung relevant).

### Briefwahl-Logik (unverändert)

Die Formel für Kampagnenstart bleibt erhalten:

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

### Kampagnenstart in Vergangenheit (optimales Datum verpasst)
- Buchung immer möglich
- UI-Text: "Deine Kampagne startet nach Freigabe (ca. 7 Werktage)."

### Region ohne DOOH-Inventar
- Auto-Split 100% Display
- Hinweis `no_dooh_inventory`
- Reach-Band weiter (±20%)

### Extreme Kombinationen (z.B. Gemeinde + CHF 30'000)
- `capped_by_region` greift
- Empfehlung: Budget reduzieren oder Region erweitern

### User will Budget unter CHF 4'000
- Slider snappt auf CHF 4'000
- Hinweis `below_min_budget` kurz eingeblendet

### User will Laufzeit über 12 Wochen
- Slider-Max ist hart 84 Tage
- Kein Hinweis nötig (Slider lässt's nicht zu)

### Ausgeschlossene Gemeinden
Vier Gemeinden bleiben permanent ausgeschlossen (0 standard-Screens):
Küsnacht, Martigny, Opfikon, Veyrier.

---

## 16. Migration Plan – Arbeitspakete

### ✅ Paket A – Datenbereinigung & Buchbarkeit (ERLEDIGT 22.04.2026)
**Ziel:** Saubere Basisdaten + Buchbarkeits-Logik für Gemeinden.

Umgesetzt:
- `lib/regions.ts`: Alle 26 Kantone auf BFS-Zahlen Stand 31.12.2024
- `lib/regions.ts`: 16 nicht-buchbare Gemeinden aus STAEDTE entfernt
- `lib/region-buchbarkeit.ts` NEU: Buchbarkeits-Logik (ODER-Regel), Screen-Klassen-System (Voll/Begrenzt/Display-dominant), automatischer DOOH/Display-Split, Mehrfach-Region-Aggregation
- Verteilung nach Umsetzung: 61 Voll, 32 Begrenzt, 10 Display-dominant

### Paket B – Preislogik-Konsolidierung (NÄCHSTER SCHRITT)

**Ziel:** Eine Datei als Single Source of Truth.

1. `lib/preislogik.ts` NEU anlegen (ersetzt `vio-paketlogik.ts` und `b2b-paketlogik.ts`)
2. Import und Verwendung von `klassifiziereRegion()` aus `region-buchbarkeit.ts` für Channel-Split
3. Calibration Constants, Reach-Caps, Budget-Laufzeit-Kopplung (^0.75), Wearout, Dedup
4. Export `calculateImpact()` und `buildPackages()`
5. Alte Dateien als `.DEPRECATED.ts` markieren (nicht sofort löschen)

**Geschätzter Aufwand:** 3–4 Prompts

### Paket C – UI Pfad A / Pfad B

**Ziel:** Neuer Flow mit Wirkungsindikator und integrierten Hinweisen.

1. `Step1Politik.tsx`: Wahl/Abstimmung-Frage entfernen, Pfad-Logik prüfen
2. `Step2PolitikBudget.tsx`: Pfad A und Pfad B als Varianten
3. Neue Komponente `<ImpactIndicator />` – wird von beiden Pfaden verwendet
4. Hinweis-System als Komponente `<CampaignHint />`
5. Regionen-Auswahl: `filterBuchbareRegionen()` einbauen, `GEMEINDE_NICHT_GEFUNDEN_HINWEIS` anzeigen
6. Screen-Klassen-Hinweise (Begrenzt / Display-dominant) bei Region-Auswahl live zeigen
7. Paket-Karten aktualisieren mit neuen Frequenzen

**Geschätzter Aufwand:** 2–3 Prompts

### Paket D – Testing & Kalibrierung (nach Go-Live)

- Erste 10 Kampagnen mit Splicky/Adform tracken
- Delivery-Faktoren in CALIBRATION justieren
- Wearout-Kurve validieren
- Freigabequote 70% gegen reale Partner-Freigaben validieren
- B2B/B2C auf dieselbe Logik migrieren

---

## 17. Offene Punkte (TBD-Liste)

| Punkt | Status | Verantwortlich |
|---|---|---|
| Delivery-Faktoren DOOH/Display | Arbeitshypothese 0.75/0.90 | Dani, nach ersten 10 Kampagnen |
| Hofmans-Kalibrierungsparameter k=0.4 validieren | Nach ersten 10 Kampagnen Splicky-Daten abgleichen, ggf. k anpassen | Jacky + Dani |
| ER3_BETA=5.0 validieren | Effective Reach 3+ gegen reale Delivery testen | Jacky + Dani |
| Wearout-Kurve validieren | Konservativ modelliert | Beobachten nach Go-Live |
| Echte BFS-Zahlen Top-20-Städte | Cluster-Schätzungen | Paket A |
| B2B/B2C Migration | Geplant | Post-Go-Live |
| Splicky-API Post-Campaign-Abgleich | Nice-to-have | Mittelfristig |
| **AGB/Impressum Partner-Code-Klausel** | **Offen, vor Partner-Code-Launch zwingend** | **Jacky** |
| Partner-Code-Auszahlungsschwelle | Vorschlag CHF 200, nicht final | Jacky |

### AGB-Formulierung Partner-Codes (Empfehlung)

Vor Aktivierung des Partner-Code-Systems muss folgende (oder äquivalente) Klausel in AGB und/oder Preisteil verankert sein:

> "Partner-Codes gewähren Preisvorteile gegenüber unseren Standardtarifen. Die Auslieferungskonditionen werden entsprechend der gewährten Konditionen angepasst."

Diese Formulierung schützt vor UWG-Risiken (Art. 3 Abs. 1 lit. b – irreführende Preisangaben) und ist juristisch sauber. Niemals extern mit "10% Rabatt" werben, stattdessen konsequent "Partner-Konditionen" verwenden.

---

## 18. Partner-Code-System

### 18.1 Prinzip

Partner-Codes gewähren registrierten Partnern (Agenturen, Multiplikatoren) die Möglichkeit, ihren Kunden einen Preisvorteil zu vermitteln und gleichzeitig selber eine Provision zu verdienen. Technisch bleibt die VIO-Marge konstant – der CPM wird intern angepasst, faktische Wirkung (Reach) reduziert sich entsprechend.

**Wichtig:** Externe Kommunikation nie mit "Rabatt" werben, stattdessen "Partner-Konditionen". AGB-Formulierung siehe Abschnitt 16 (TBD).

### 18.2 Code-Eigenschaften

- **Ein Code pro Partner** – persönlich, nicht übertragbar
- **Unbegrenzt gültig**, beliebig oft einsetzbar durch verschiedene Kunden
- **Rabatt 5–15% konfigurierbar pro Code** – Default 10%
- **Kommission = gleicher Prozentsatz** wie Rabatt (10% Rabatt → 10% Kommission)
- **Keine Lifetime-Verfolgung** – Provision fällt nur an, wenn der Code tatsächlich bei der Buchung eingegeben wurde. Ein vermittelter Kunde, der später ohne Code wiederkauft, generiert keine Provision.
- **Kein Code-Stacking** – pro Buchung ist nur ein Code möglich

### 18.3 UI-Platzierung

Das Code-Feld gehört in **Step 1 Politik, unauffällig und collapsed by default**.

Begründung: Der Code muss vor dem Wirkungsindikator aktiv sein, damit die adjustierte Reichweite-Anzeige im gesamten weiteren Flow konsistent ist. Eine spätere Abfrage würde entlarven, dass der angezeigte "Rabatt" keine echte Leistungsänderung bewirkt.

```
Step 1 Politik (nach den bestehenden Feldern)
  ...
  [ ▾ Hast du einen Partner-Code? ]   ← collapsed

Wenn expandiert:
  Partner-Code:  [____________]  [Prüfen]
                 Code wird automatisch validiert
```

**Niemals prominent platzieren** – das würde Aufmerksamkeit erzeugen und die unauffällige Integration torpedieren.

### 18.4 Berechnungslogik

Die VIO-Netto-Einnahmen müssen identisch sein, ob mit oder ohne Code. Das erreichen wir, indem die Impressions auf Basis des Netto-Budgets (nach Rabatt und Kommission) berechnet werden:

```typescript
function calculateImpact(input: {
  budget_displayed: number,
  partnerCode?: {
    discount: number,    // 0.05 – 0.15
    commission: number,  // gleich discount
  }
}): ImpactResult {

  const discount = input.partnerCode?.discount ?? 0
  const commission = input.partnerCode?.commission ?? 0

  // Was der User zahlt (nach Rabatt)
  const budget_user_pays = input.budget_displayed * (1 - discount)

  // Was VIO netto nach Partner-Auszahlung einnimmt
  // Kommission wird auf Basis-Budget berechnet (vor Rabatt)
  const budget_vio_netto = budget_user_pays
                         - (input.budget_displayed * commission)

  // Impressions und Reichweite basieren auf VIO-Netto, nicht auf User-Zahlung
  const total_impressions = (budget_vio_netto / mixed_cpm) * 1000

  // ...rest der Logik wie in Abschnitt 4
}
```

**Beispiel:**

| Szenario | Ohne Code | Mit Code 10% |
|---|---|---|
| Angezeigtes Budget | CHF 10'000 | CHF 10'000 |
| User-Zahlung | CHF 10'000 | CHF 9'000 |
| Kommission an Partner | – | CHF 1'000 |
| VIO-Netto | CHF 10'000 | CHF 8'000 |
| Impressions (Misch-CPM 39.50) | 253'164 | 202'531 |
| Reichweite (Präsenz-Split, 4 Wo) | 50'600 | 40'500 |

Der User sieht im UI die Reichweite 40'500 – aber nie die 50'600 zum Vergleich. Die reduzierte Wirkung ist nicht wahrnehmbar, weil keine Baseline vorliegt.

### 18.5 Code-Verwaltung

**Pipedrive als Single Source of Truth** für Code-Definitionen.

Empfohlene Struktur: Custom Entity "Partner-Codes" oder dedizierte Pipeline mit folgenden Feldern:

| Feld | Typ | Zweck |
|---|---|---|
| `code_string` | String | z.B. "AG-FRITZ-25" |
| `owner_name` | String | Name des Partners |
| `owner_email` | Email | Kontakt für Reports & Auszahlung |
| `owner_contact_id` | Referenz | Pipedrive-Contact-ID |
| `discount_pct` | Number | 0.05 – 0.15 |
| `commission_pct` | Number | 0.05 – 0.15 (meist = discount) |
| `active` | Boolean | Ein/Aus-Schalter |
| `usage_count` | Number | Automatisch inkrementiert |
| `total_commission_owed` | Currency | Aufsummiert, quartalsweise zurückgesetzt |
| `last_used_at` | Date | Letzte Verwendung |
| `notes` | Text | Freitextfeld |

### 18.6 n8n-Automationen

Bei jeder Buchung mit Code triggert ein n8n-Flow:

1. **Validierung** des Codes gegen Pipedrive-Record (aktiv? existiert?)
2. **Deal-Anreicherung:** Partner-Felder im Booking-Deal füllen (siehe 18.8)
3. **Code-Record Update:** `usage_count +1`, `total_commission_owed += booking_commission`, `last_used_at`
4. **Email an Partner** (optional, konfigurierbar): "Dein Code wurde verwendet, aktuelle Provision CHF X"

**Quartals-Flow (1. Tag des Quartals):**

1. Alle Codes mit `total_commission_owed > 0` auslesen
2. Pro Partner: Report generieren (Anzahl Nutzungen, Gesamtbetrag)
3. Email an Partner: "Bitte stelle uns eine Rechnung über CHF X"
4. Nach Zahlungseingang manuell zurücksetzen (`total_commission_owed = 0`)

### 18.7 Schutz gegen Missbrauch

- **Frontend-Validierung** nur gegen API-Liste aktiver Codes (`active = true`)
- **Rate-Limit:** Max 5 ungültige Code-Eingaben pro Session
- **Code-Format:** 6–12 Zeichen alphanumerisch, Präfix nach Partner-Typ
  - `AG-` für Agenturen (z.B. `AG-FRITZ-25`)
  - `PT-` für Parteien (z.B. `PT-GLP-10`)
  - `VN-` für Verbände und NGOs
  - `EX-` für Expert:innen / Einzelpersonen
- **Kein Code-Stacking:** Pro Buchung maximal ein Code
- **Keine öffentliche Code-Liste:** Codes werden nur direkt an Partner kommuniziert

### 18.8 Pflichtfelder im Booking-Deal (Pipedrive)

Beim Abschluss mit Code werden im Deal zusätzlich gespeichert:

| Feld | Inhalt |
|---|---|
| `partner_code_used` | Code-String (leer wenn keiner) |
| `discount_applied_chf` | Rabatt-Betrag in CHF |
| `commission_due_chf` | Kommission an Owner in CHF |
| `partner_owner_id` | Pipedrive-Contact-ID des Code-Owners |
| `booking_budget_displayed` | Angezeigtes Bruttobudget |
| `booking_budget_user_paid` | Tatsächlich gezahlter Betrag |
| `booking_budget_vio_netto` | VIO-Netto nach Kommission |

Damit ist das Controlling jederzeit in der Lage, Partner-Abrechnungen nachzuvollziehen.

### 18.9 Auszahlung

- **Quartalsweise** (4× pro Jahr)
- Partner stellt VIO eine Rechnung über die kumulierte Provision
- Mindestauszahlungsschwelle: TBD (Vorschlag CHF 200, darunter Carry-over ins nächste Quartal)
- Zahlungsziel: 30 Tage nach Rechnungseingang

### 18.10 Status

Partner-Code-System wird **nach Go-Live** aktiviert (Priorität 2). Voraussetzungen vor Aktivierung:

- AGB-Klausel (siehe Abschnitt 17) finalisiert und online
- Pipedrive-Custom-Entity aufgesetzt
- n8n-Flows gebaut und getestet
- Frontend-Integration in Step 1 Politik
- Mindestens 3 aktive Partner-Codes zur Lancierung

---

## 19. Versionshistorie

| Version | Datum | Änderung |
|---|---|---|
| v1 | – | `vio-regelkatalog-paketlogik.md` – fixe Pakete, lineare Formel |
| v2 | 21.04.2026 | Hybrid-Flow, dynamischer Split, Wochen-Frequenz-Leitplanken, konkave Budget-Laufzeit-Kopplung, tiered Reach-Caps, Wearout, Dedup, Kampagnentyp entfernt, Partner-Code-System |
| v2.1 | 22.04.2026 | Drei-Klassen-Screen-System (Voll/Begrenzt/Display-dominant) mit automatischem Channel-Split; neuer Abschnitt 9 Buchbarkeit (ODER-Regel: stimm≥10k ODER politScreens≥20); Kantone auf BFS 2024; 16 nicht-buchbare Gemeinden entfernt; Hinweis-System um Screen-Klassen-Hinweise erweitert; Paket A umgesetzt |
| v2.2 | 27.04.2026 | Hofmans-Sättigungskurve (ersetzt lineare Reach-Formel); Effective Reach 3+ als zweite UI-Metrik; Campaign-Mode-Badge (awareness/balanced/mobilization/overkill); too_thin-Trigger auf f_weekly<0.5 gesenkt |

---

**Ende Regelkatalog v2.2**
