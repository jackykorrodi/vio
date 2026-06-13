# VIO Regelkatalog Politik — v3.6

```yaml
SPEC_VERSION:     3.14
LAST_VALIDATED:   2026-06-12
PFAD_A_STATUS:    Re-Validierung nach Konstanten-Bereinigung (OTS/Delivery entfernt) gegen Soll-Werte v3.6 ausstehend
PFAD_B_STATUS:    §8.6/§8.7/§8.8 implementiert (Sprint 1+1b) — §12 36 Soll-Werte ausstehend
PRECEDENCE:       Spec > Code. Bei Konflikt gilt diese Spec; Code wird angeglichen.
NEXT_VERSION:     keine geplant
```

**Status**: Single Source of Truth für die Politik-Preislogik. v3.13 stellt das Frequenz-Modell von Wochenfrequenz auf Kampagnenfrequenz um (fundamentaler Modellwechsel): Pakete steuern über feste Kampagnenkontakte (Sichtbar 5×, Präsenz 7×, Dominanz 9×), Custom-Pfad über Wirkungsfokus-Kampagnenkontakte (Breite ~5×, Ausgewogen ~7×, Verankerung ~10×). Reach-Formel §8.1 und Custom-Pfad: reachLinear = impressionenImPool / fKampagne (laufzeitWochen fällt aus der Formel). Dadurch steigt Reach monoton mit teureren Paketen; teureres Paket erreicht mehr Personen. Wochendruck wird informativ (nicht normativ) kommuniziert. UI-Regel: Kampagnenfrequenz prominent, Wochenfrequenz sekundär. SAT 1.4, fokusabhängiges Cap-Level, 42d-Deckel und alle übrigen Regeln bleiben unverändert. — v3.12 normalisiert Sweet-Spot-Budget-Empfehlung auf Referenz-Laufzeit (REFERENZ_LAUFZEIT_DAYS=28): Budget-Empfehlung ist laufzeit-stabil, Wirkungsberechnung (calculateImpactCustom) nutzt weiterhin die echte Laufzeit. — v3.11 korrigiert Custom-Sweet-Spot mediaplanerisch: SWEET_SPOT_TARGET_SATURATION=1.4 (war 4.0; SAT 4.0 = Übersättigung, Pakete fahren 0.2–1.3), Cap-Level fokusabhängig (Breite Wirkung=L3, Ausgewogen=L2, Verankerung=L1, nicht mehr fix L1), Politik-Laufzeit-Fenster 14/28/42d als Produktregel (§6.3) für Paket und Custom. Neue §4-Konstante SWEET_SPOT_TARGET_SATURATION. §10 erweitert. — v3.10 bringt die finale Wirkungsprodukt-Logik: Paket-Parameter auf Sichtbar 21d/3×, Präsenz 28d/4×, Dominanz 35d/5× finalisiert (war 14/28/42d · 3/5/6×). Neue Tier-Budget-Matrix (§4, Status Annahme). Karten zeigen ZWEI absolute KPIs (Stimmberechtigte + Ø Kontakte/Person) + Laufzeit + Strategie-Label. Reach nie als Paket-Vergleich, nie Pool-%. Aufklärungssatz unter Karten (§9.2). EMPFOHLEN-Badge immer auf Präsenz (Politik-Standard: 28d, ausgewogene Frequenz), nie reach-begründet; qualityStatus=high_frequency-Guardrail entfernt. v3.9 (frequenz-getriebene Engine) bleibt Basis. v3.8 (Pool-Tier-Budgets, requiresConsultation als Komplexitäts-Trigger) bleibt gültig. Custom-Pfad (Wirkungsfokus-Modell, WIRKUNGSFOKUS_FREQUENZ 2.1/3.1/4.6×) unverändert. — v3.6: Audience-Contacts-Formel bereinigt um `OTS_DOOH`, `DELIVERY_DOOH`, `DELIVERY_DISPLAY`. Diese sind im fixen EK-CPM mit dem Operating-Partner (CHF 25 DOOH / CHF 5 Display pro 1000 Bruttokontakte) bereits eingepreist. Naming (§3), Caps/Saturation (§5.4–5.6), Optimizer (§7–§8) und Status-Codes (§7.2) unverändert.

---

## Lesehinweis: Normativ vs. Informativ

Sektionen sind markiert:

- **(N)** **Normativ** — beeinflusst Implementation direkt. Code muss diese Sektionen exakt umsetzen.
- **(I)** **Informativ** — Kontext, Begründung, Kalibrierungs-Hinweise, geplante Erweiterungen. Production-Verhalten darf darauf nicht basieren.

---

## §1 Scope & Geltung (N)

Dieser Katalog definiert die fachliche Wahrheit für die Preis-, Reach- und Paketlogik im Politik-Flow. Implementierung erfolgt in `lib/preislogik.ts`.

Bei Widerspruch zwischen Code und Katalog **gilt der Katalog**. Abweichungen im Code werden in der nächsten Session angeglichen. Keine stillschweigende Anpassung der Spec an Legacy-Code.

Geltungsbereich:
- Pfad A — Budget-First Optimizer (User gibt Budget vor, System optimiert Laufzeit/Level)
- Pfad B — Paket-Optimizer (User wählt aus drei Paketen, System optimiert innerhalb Paket-Identität)

Der Custom-Pfad (Wirkungsfokus-Modell, eigener Abschnitt) ergänzt den Paket-Pfad und löst den bisherigen Pfad A ab. Eine durchgängige Terminologie-Konsolidierung (Pfad A/B → Paket-/Custom-Pfad) ist einem separaten Update vorbehalten.

Beide Pfade respektieren denselben DOOH-Vorlauf-Constraint (Pfad A: §7.0/§7.3, Pfad B: §8.6/§8.7). Pfad A nutzt LAUFZEITEN_BASIS {14, 21, 28, 35, 42} (§7.0). Pfad B (Pakete) hat seit v3.10 fixe Einzel-Laufzeiten je Paket: Sichtbar 21d, Präsenz 28d, Dominanz 35d (§8.3).

---

## §2 Politik-Kontext & Wirkungstheorie (I)

VIO ist eine politik-spezifische Preis- und Reichweitenlogik. Sie unterscheidet sich von klassischen DOOH-Tools darin, dass sie **sinnvolle Wirkung im politischen Entscheidungsfenster** optimiert — nicht maximale Reichweite pro CHF.

**Schweizer Politik-Spezifika:**
- Stimmunterlagen werden ca. 3–4 Wochen vor Abstimmung/Wahl per Post zugestellt
- Diese Phase ist kampagnenrelevant: viele Stimmberechtigte setzen sich erst dann konkret mit der Vorlage auseinander
- Daraus folgt: **28 Tage ist die natürliche Standard-Laufzeit** für Politik-Kampagnen

**Wirkungstheorie:**
- **Krugman 3+ Rule (1972)**: Werbewirkung benötigt Mindest-Wiederholung; empirische Orientierung: 3–5 Kontakte über den Entscheidungszeitraum → Effective-Frequency-Korridor 3–10 Kampagnenkontakte. F_MIN_WEEKLY (=3) bleibt als Pfad-A-Schwelle (Wochenfrequenz-Optimizer).
- **Effective Reach > Reach**: nicht "wie viele Personen erreicht", sondern "wie viele mit Mindestwirkungsschwelle erreicht"
- **Wear-out** ab ca. 10–15 Kampagnenkontakten → Frequency-Cap und Dominanzmodus. Für Paket und Custom: fKampagne-Obergrenze = 10 (Effective-Frequency-Korridor).

**Pool-Begründung:**
Politische Kampagnen wirken auf Stimmberechtigte. Eine Hybrid-Logik (Stadt → Bevölkerung, Kanton → Stimmberechtigte) würde Reach % je nach Regionstyp unterschiedlich bedeuten und Mehr-Region-Buchungen inkonsistent machen. Deshalb: **immer `region.stimm`** (siehe §5.1).

---

## §3 Terminologie (N)

Diese Terms sind verbindlich. Code, UI und alle Doku müssen exakt diese Bezeichnungen verwenden.

| Term | Bedeutung |
|---|---|
| `pool` | Anzahl Stimmberechtigte in gewählter Zielregion (`region.stimm`) |
| `contacts_dooh` | Audience Contacts aus DOOH-Channel |
| `contacts_display` | Audience Contacts aus Display-Channel |
| `contacts_gross` | Summe aus contacts_dooh + contacts_display (vor In-Pool-Filter) |
| `contacts_total` | Audience Contacts nach IN_POOL_FACTOR (effektive In-Pool-Kontakte) |
| `reach_unique_abs` | Eindeutig erreichte Personen, absolut (= "Unique Reach") |
| `reach_unique_pct` | reach_unique_abs / pool, in % |
| `frequency_campaign` | contacts_total / reach_unique_abs — **PRIMÄRE Steuergrösse** für Paket- und Custom-Pfad. Feste Kampagnenkontakte je Paket/Wirkungsfokus (Input). |
| `frequency_weekly` | frequency_campaign / weeks — **abgeleitet, sekundär/informativ**. Nicht Steuer-Input für Paket oder Custom. Bleibt Optimizer-Grösse in Pfad A (§7). |
| `pcap_share` | Cap-Anteil aus Reach-Cap-Tabelle (z.B. 0.22 für L1 in <50k) |
| `pcap_abs` | pcap_share × pool (absolute Pool-Cap in Personen) |
| `saturation_factor` | Hofmans-Sättigungsfaktor, Wert in [0, 1] |
| `wearout_factor` | Linearer Decay-Faktor für Laufzeiten > 4 Wochen, Wert in [0.70, 1.0] |
| `mikroregion` | Region mit pool < 20'000 |
| `vorlauf` | daysUntilVote − laufzeitDays |
| `deliveryMode` | `standard` oder `display_only` |
| `availability` | `available` oder `unavailable` |
| `qualityStatus` | `balanced`, `high_frequency` oder `thin` (Pfad B) |
| `contextFlag` | `mikro_limited` oder undefined (Pfad B) |
| `screenKlasse` | `voll`, `begrenzt`, `display-dom` (aus region-buchbarkeit.ts) |
| `budgetMarker` | Niedrigstes Budget bei dem Optimizer-Empfehlung stabil wird (§7.4). UI-Präfix dreigeteilt nach currentBudget vs. sweetSpot. Funktionsname im Code bleibt aus Backward-Compat-Gründen `calculateSweetSpot`. |
| `requiresConsultation` | Boolean-Flag pro Paket (§8.1). True wenn Komplexitäts-Trigger greift (mehrere Regionen ODER spezielle Laufzeit ODER manueller Setup-Bedarf) → Karte zeigt „Persönliche Beratung empfohlen" statt Preis. Nicht mehr budgetgetrieben (v3.8). |
| `pool_tier` | Tier-Klasse A/B/C/D basierend auf `pool` (§8.1). Bestimmt das Tier-Budget aus der §4-Matrix. |
| `tier_budget` | Festes Paket-Budget in CHF aus der Pool-Tier-Matrix (§4). Reach und Frequenz sind Output, nicht Preistreiber. |
| `wirkungs_titel` | Stabiler, regionsunabhängiger Karten-Titel (§9.1). Immer wahr, keine Reichweiten-Garantien. |
| `wirkungs_subline` | Dynamische, regionsabhängige Subline unter dem stabilen Titel (§9.2). Ändert sich je nach pool_tier und qualityStatus. |

**Statuscode-Naming-Konvention** (Hinweis): Statuscodes wie `optimal_28d_standard`, `sprint_14d_*`, `aufbau_42d_*` sind **semantische Kategorien**, nicht fixe Tage. Mit der Laufzeit-Granularität-Erweiterung in v3.5.3 ({14, 21, 28, 35, 42}) bedeutet z.B. `optimal_28d_standard` „Standard-Pfad-Empfehlung" — die tatsächliche Laufzeit kann 21d oder 28d sein, je nach Vorlauf-Constraint und Reach-Optimum. Analog: `aufbau_42d_*` kann 35d oder 42d bedeuten, `sprint_14d_*` bleibt 14d.

**Anti-Drift-Regel**: Backend, UI und Optimizer verwenden **dieselbe** Bezeichnung. Keine internen Aliase wie `reach`, `uniqueReach`, `reach_mitte`. Wenn ein neuer Term nötig wird, kommt er zuerst in §3.

---

## §4 Konstanten (N)

### Reichweite & Frequenz

```
F_MIN_WEEKLY            = 3            # Krugman-Schwelle (Wirkungs-Floor)
F_MIN_TOLERANCE         = 2.7          # Near-F-Min für 28d-broad_reach
F_MAX_WEEKLY            = 10           # ab hier Dominanzmodus
F_OVERKILL_THRESHOLD    = 15           # ab hier Beratung empfehlen
IN_POOL_FACTOR          = 0.7          # Wastage: nur 70% Impressions In-Pool
REACH_CURVE_K           = 0.25         # Saturation-Steilheit (Hofmans)
MAX_REACH_CAP           = 0.80         # absolute Obergrenze Reach / pool
WEAROUT_FLOOR           = 0.70         # untere Schranke Wearout-Faktor
LARGE_POOL_THRESHOLD    = 500_000      # Schwelle für Sprint-Override (Pfad A)
REACH_PREMIUM_THRESHOLD = 1.4          # +40% Reach für Sprint/Toleranz-Trigger
AUFBAU_PREMIUM_THRESHOLD = 1.2         # +20% Reach für Aufbau-Override (35d/42d vs 28d)
```

### Preise

```
CPM_DOOH                = 50           # CHF, blended Buchungspreis
CPM_DISPLAY             = 15           # CHF, blended Buchungspreis
```

### DOOH-Buchbarkeit (Pfad-A & Pfad-B Timing-Constraint)

```
MIN_VORLAUF_DOOH        = 10           # Tage zwischen Kampagnenstart und Vote
MIN_VORLAUF_DISPLAY     = 1            # Tage für Display-only Sprint
MIN_DISPLAY_ONLY_LAUFZEIT = 7          # Untergrenze sinnvolle Display-Sprint-Laufzeit
```

### Paket-Capping (§8.1)

```
DOMINANZ_CAP_MULTIPLIER = 2.5          # DEPRECATED v3.8 — war: Dominanz.budget Cap = DOMINANZ_CAP_MULTIPLIER × Präsenz.budget
                                        # Kein Trigger mehr für requiresConsultation. Konstante bleibt zur Rückwärts-Kompatibilität.
```

### Pool-Tier-Budget-Matrix (§8.1) — Status: Annahme

Pool-Tiers (pool = stimmTotal, §5.1; bei Mehr-Region: Summe):

```
Tier A: pool < 100'000
Tier B: pool 100'000 – 300'000
Tier C: pool 300'000 – 700'000
Tier D: pool > 700'000
```

Tier-Grenze ist exklusiv-oben: pool = 700'000 → Tier C; pool = 700'001 → Tier D.

Tier-Budget-Matrix (CHF, fixes Paket-Budget):

| Tier | Sichtbar | Präsenz | Dominanz |
|------|----------|---------|----------|
| A    | 3'500    | 6'000   | 10'000   |
| B    | 5'000    | 9'000   | 15'000   |
| C    | 7'500    | 14'000  | 24'000   |
| D    | 10'000   | 18'000  | 30'000   |

Reach-Caps (§5.4) bleiben aktiv — ausschliesslich als Sättigungs-Obergrenze. Sie bestimmen nicht mehr das Budget.

### Kampagnenfrequenz — fKampagne (v3.13) — Status: Annahme

Primäre Steuergrösse für Paket-Pfad und Custom-Pfad. Werte mock-kalibriert, Splicky-Kalibrierung + Live-Test vor Go-Live (§10).

**Paket-Pfad (fix je Paket):**
```
F_KAMPAGNE_SICHTBAR    = 5     # Kontakte/Person über gesamte Laufzeit
F_KAMPAGNE_PRAESENZ    = 7     # Kontakte/Person über gesamte Laufzeit
F_KAMPAGNE_DOMINANZ    = 9     # Kontakte/Person über gesamte Laufzeit
```

**Custom-Pfad (je Wirkungsfokus):**
```
F_KAMPAGNE_BREIT       = 5     # Breite Wirkung (~5 Kontakte)
F_KAMPAGNE_AUSGEWOGEN  = 7     # Ausgewogen (~7 Kontakte)
F_KAMPAGNE_VERANKERUNG = 10    # Verankerung (~10 Kontakte, fokussierter als Dominanz)
```

**Effective-Frequency-Korridor (Orientierung):**
```
EFFECTIVE_FREQUENCY_MIN  = 3   # Unteres Ende des Wirkungskorridors
EFFECTIVE_FREQUENCY_MAX  = 10  # Oberes Ende (ab hier Wear-out)
```

**Wochendruck-Info-Schwelle (informativ, kein normatives Limit):**
```
WOCHENDRUCK_WARN_THRESHOLD = 2.0  # frequency_weekly < 2.0 → Info-Hinweis in UI
```

### Custom-Pfad (Wirkungsfokus-Modell)

```
SETUP_VORLAUF_WERKTAGE       = 10      # Werktage ab Kampagnenstart; DOOH-Buchbarkeits-Grenze; Zürcher Feiertage berücksichtigt; löst DOOH_CUTOFF_DAYS im Custom-Pfad ab
SCREEN_ANZEIGE_SCHWELLE      = 30      # preliminär, vor Go-Live mit Splicky-Inventar kalibrieren
SWEET_SPOT_TARGET_SATURATION = 1.4     # oberes Ende des Paket-Sättigungs-Korridors (Pakete 0.2–1.3); effizienter Grenzertrag-Punkt (Status: Annahme, §10)
```

---

## §5 Gemeinsame Engine: Reach-Modell (N)

Pfad A und Pfad B verwenden **dieselbe** Engine. Unterschied: Pfad A optimiert freie Kombinationen, Pfad B optimiert innerhalb Paket-Grenzen. Mathematik ist identisch.

### 5.1 Pool-Definition

```
pool = region.stimm
```

**Immer**, unabhängig vom Regionstyp (Kanton, Bezirk, Stadt, Gemeinde). Bevölkerung (`region.pop`) ist UI-Kontextwert, nicht Kern-Pool.

### 5.2 Channel-Splits nach Screen-Klasse

Die Screen-Klasse einer Region wird in `lib/region-buchbarkeit.ts` aus Screen-Verfügbarkeit (politScreens, openooh-Daten) ermittelt.

| Klasse | DOOH | Display | Blended CPM |
|---|---|---|---|
| `voll` | 70% | 30% | CHF 39.50 |
| `begrenzt` | 50% | 50% | CHF 32.50 |
| `display-dom` | 20% | 80% | CHF 22.00 |

Mehrere Regionen → gewichteter Mix nach Pool-Anteil.

**Override**: Pfad A im Display-Only-Modus (§7.3) und Pfad B im `display_only`-Modus (§8.7) setzen den Split fix auf `{ dooh: 0, display: 1.0 }`.

### 5.3 Audience Contacts

```
contacts_dooh    = budget × split.dooh    / CPM_DOOH    × 1000
contacts_display = budget × split.display / CPM_DISPLAY × 1000

contacts_gross   = contacts_dooh + contacts_display
contacts_total   = contacts_gross × IN_POOL_FACTOR
```

**Hinweis (I)**: Bruttokontakte pro CHF werden durch fixen EK-CPM mit dem Operating-Partner vertraglich kontrahiert (CHF 25 DOOH / CHF 5 Display pro 1000 Bruttokontakte). OTS und Delivery sind im EK-CPM eingepreist und entfallen daher als separate Modell-Annahmen. Splicky-Rohpreise können tiefer liegen — die Differenz ist Partner-Marge und für die VIO-Logik irrelevant.

### 5.4 Reach-Caps nach Pool-Grösse

| Pool (Stimmberechtigte) | L1 (Sichtbar) | L2 (Präsenz) | L3 (Dominanz) |
|---|---|---|---|
| < 50'000 | 22% | 45% | 65% |
| 50'000 – 200'000 | 12% | 22% | 38% |
| 200'000 – 500'000 | 6% | 12% | 21% |
| > 500'000 | 3% | 6% | 12% |

**Reach-Caps bleiben in allen Modi aktiv** — auch im Display-Only-Modus (§7.3 / §8.7).

### 5.5 Unique Reach inkl. Wearout

Identisch v3.5.2. Hofmans-Saturation + linearer Wearout-Decay ab Woche 9. Innerhalb {14, 21, 28, 35, 42}d bleibt `wearout_factor = 1.0`.

### 5.6 Frequenz

```
frequency_campaign = contacts_total / reach_unique_abs
frequency_weekly   = frequency_campaign / weeks
```

---

## §6 Laufzeit-Logik (N)

### 6.1 Laufzeit-Bedeutung

| Laufzeit | Funktion | Wann |
|---|---|---|
| 14 Tage | Konzentrierter Schlussimpuls | Zu dünnes Budget für Standard ODER sehr grosse Pools (>500k) |
| 21 Tage | Erweiterter Schlussimpuls | Vorlauf knapp für 28d, aber >14d DOOH-buchbar |
| 28 Tage | Politik-Default | Standard rund um Entscheidungsfenster |
| 35 Tage | Erweiterter Aufbau | Hohes Budget, etwas mehr als 4 Wochen sinnvoll |
| 42 Tage | Aufbau / Bekanntheit | Hohes Budget, erklärungsbedürftige Themen |

### 6.2 Anker-Datum

Wenn Abstimmungs-/Wahldatum gesetzt: Laufzeit wird **rückwärts** vom Termin gedacht.

| Laufzeit | Phase |
|---|---|
| 14 Tage | Letzte 2 Wochen vor Vote (Schlussimpuls) |
| 21 Tage | Schlussimpuls + Stimmunterlagen-Start |
| 28 Tage | Entscheidungsfenster (ab Stimmunterlagen-Versand) |
| 35 Tage | Frühe Themen-Phase + Entscheidungsfenster |
| 42 Tage | Aufbau + Entscheidungsfenster |

### 6.3 Politik-Laufzeit-Fenster — Produktregel (N)

Begründung (§2): Abstimmungs-Wirkungsfenster; >42d kaum Zusatznutzen.

| Grenze | Wert |
|---|---|
| Minimum | 14 Tage |
| Standard | 28 Tage |
| Maximum | 42 Tage |

Gilt für **Paket und Custom**:
- Paket-Pfad: Laufzeiten 21/28/35d (§8.3) liegen bereits innerhalb des Fensters; keine Änderung.
- Custom-Pfad: Laufzeit-Auswahl wird nach oben auf 42d gedeckelt. Der budget-gestaffelte Korridor (14–42d) bleibt vollständig erhalten.

---

## §7 Pfad A: Budget-First Optimizer (N)

> **Abgelöst durch das Wirkungsfokus-Modell (neuer Abschnitt unten).
> Historisch als Pfad A bezeichnet, bleibt als Archiv-Referenz.**

User gibt Budget vor, System optimiert Laufzeit, Cap-Level und Status.

### 7.0 DOOH-Vorlauf-Vorfilter (N)

Pfad A respektiert denselben DOOH-Vorlauf-Constraint wie Pfad B (§8.6).

Wenn `daysUntilVote` gesetzt: Vor Optimizer-Iteration (§7.1) werden Laufzeit-Kandidaten gefiltert:

```
LAUFZEITEN_BASIS    = {14, 21, 28, 35, 42}
gültige_laufzeiten  = [d ∈ LAUFZEITEN_BASIS : daysUntilVote − d ≥ MIN_VORLAUF_DOOH (10)]
```

**Verzweigung:**

| Bedingung | Verhalten |
|---|---|
| `gültige_laufzeiten` nicht leer | §7.1 läuft normal, aber nur über gültige Laufzeiten |
| `gültige_laufzeiten` leer UND `daysUntilVote ≥ 8` | Display-Only-Modus (§7.3) |
| `gültige_laufzeiten` leer UND `daysUntilVote ∈ [1, 7]` | `statusCode = too_short_for_campaign`, `availability = unavailable` |
| `daysUntilVote < 1` | `statusCode = vote_passed`, `availability = unavailable` |
| `daysUntilVote = null` | Keine Filterung, alle Laufzeiten aus LAUFZEITEN_BASIS zulässig |

**Untergrenze sinnvolle Kampagne:** `daysUntilVote ≥ 8` — entspricht 7 Tage Display-Laufzeit + 1 Tag Vorlauf. Darunter ist keine wirksame Kampagne mehr planbar.

**Hinweis Granularität**: v3.5.3 erweitert LAUFZEITEN_BASIS von {14, 28, 42} (v3.5.2) auf {14, 21, 28, 35, 42}. Optimizer kann jetzt fein zwischen Schlussimpuls/Standard/Aufbau-Buckets variieren. Kein dynamischer `max_vorlauf_laufzeit`-Kandidat (z.B. 19d) — granulares Standard-Set ist die pragmatische Untergrenze.

### 7.1 Optimizer-Schritte

Bei gegebenem Budget, Region(en) und Screen-Klasse iteriert der Optimizer durch folgende Schritte über `gültige_laufzeiten` (§7.0). **Erste passende Regel gewinnt.**

**Schritt 1 — Standard-Pfad (≤ 28d)**
Berechne 28d und 21d (sofern in `gültige_laufzeiten`) für L1, L2, L3. Wenn mindestens ein Kandidat `frequency_weekly` im Band [F_MIN_WEEKLY, F_MAX_WEEKLY] hat → wähle Kombination mit max `reach_unique_abs`. Tie-Break: längere Laufzeit gewinnt (28d vor 21d).
Status: `optimal_28d_standard` (semantische Kategorie — gilt für 21d UND 28d).

**Schritt 2 — Standard-Toleranz**
Wenn ein höheres Cap-Level mit `frequency_weekly` ∈ [F_MIN_TOLERANCE, F_MIN_WEEKLY) mindestens REACH_PREMIUM_THRESHOLD (1.4×) mehr Reach bringt als Schritt-1-Kandidat → nimm das höhere Level.
Status: `28d_broad_reach_low_frequency`.

**Schritt 3 — Sprint-Override (nur grosse Pools)**
Wenn `pool > LARGE_POOL_THRESHOLD` UND 14d ∈ `gültige_laufzeiten` UND 14d-Reach > REACH_PREMIUM_THRESHOLD × Schritt-1-Reach (beide in-Band) → wähle 14d.
Status: `sprint_14d_grosser_pool`.

**Schritt 4 — Aufbau-Override Long (35d / 42d)**
Berechne 35d und 42d (sofern in `gültige_laufzeiten`) für L1, L2, L3. Wenn beste long-Variante in-Band Reach > AUFBAU_PREMIUM_THRESHOLD (1.2×) × Schritt-1-Reach → wähle die long-Variante. Tie-Break: längere Laufzeit gewinnt (42d vor 35d).
Status: `aufbau_42d_reach_premium` (semantische Kategorie — gilt für 35d UND 42d).
Saturation-Tie-Break: Wenn `bestLong.reach ≥ chosen.reach × 0.99` (Pool gesättigt) UND `bestLong.fWeekly < chosen.fWeekly × 0.85` (Frequenz deutlich tiefer) → wähle long. Status: `aufbau_42d_reach_premium` (gleiche Karte, tiefere Frequenz als Begründung).

**Schritt 4b — Vorlauf-constrained Standard (Spiegel zu Schritt 4)**
Wenn long-Varianten (35d/42d) durch §7.0 (nicht Band-Check) ausgefiltert wurden UND Schattenberechnung long-Reach > AUFBAU_PREMIUM_THRESHOLD × Schritt-1-Reach (Schritt-1 in-Band) → Schritt-1-Kandidat wird gewählt.
Status: `optimal_28d_vorlauf_constrained` (statt `optimal_28d_standard`).
Begründung: Standard-Empfehlung wäre dieselbe, aber der User darf wissen, dass der Engpass Vorlauf ist.

**Schritt 5 — Standard nicht erreichbar**
Wenn keine 21d/28d-Variante in-Band oder Toleranz → probiere 14d und long-Kandidaten (35d/42d, nur falls in `gültige_laufzeiten`). Wähle Variante mit max Reach.
Status: `sprint_14d_thin_budget` / `aufbau_42d_thin_budget` / `sprint_14d_28d_unavailable` / `aufbau_42d_28d_unavailable`.

**Schritt 5b — Vorlauf-constrained Sprint**
Wenn 21d, 28d UND alle long-Laufzeiten durch §7.0 (nicht Band-Check) ausgefiltert wurden, und 14d ist einzige Option in `gültige_laufzeiten` mit Treffer in-Band → Status `sprint_14d_vorlauf_constrained` (statt `sprint_14d_thin_budget` oder `sprint_14d_28d_unavailable`).

**Schritt 6 — Dominanzmodus**
Wenn alle Kombinationen `frequency_weekly > F_MAX_WEEKLY` → wähle die mit max Reach. Tie-Break: längste Laufzeit, dann tiefste `frequency_weekly`.
Status: `dominanzmodus` (`frequency_weekly ≤ F_OVERKILL_THRESHOLD`) oder `dominanzmodus_stark` (`frequency_weekly > F_OVERKILL_THRESHOLD`).

**Schritt 7 — Too Thin**
Wenn alle Kombinationen `frequency_weekly < F_MIN_TOLERANCE` → wähle die mit höchster `frequency_weekly`.
Status: `too_thin`.

### 7.2 Status-Codes & UI-Botschaften

Unverändert v3.5.2 (Tabelle gleich). Wording bleibt — Statuscodes sind semantische Kategorien (siehe §3 Naming-Konvention).

Statuscodes wie `optimal_28d_standard` mappen auf 21d oder 28d je nach Optimizer-Wahl. `aufbau_42d_*` mappen auf 35d oder 42d. `sprint_14d_*` bleibt strikt 14d.

| Status-Code | Tone | UI-Label | UI-Botschaft |
|---|---|---|---|
| `display_only_late_window` | good | Empfehlung | „DOOH benötigt 10 Tage Vorlauf zur Freigabe. Bei dieser Abstimmung läuft die Kampagne als reines Online-Display." |
| `too_short_for_campaign` | warn | Zu wenig Zeit | „Für eine wirksame Kampagne braucht es mindestens 8 Tage Vorlauf bis zur Abstimmung." |
| `vote_passed` | warn | Abstimmung vorbei | „Diese Abstimmung liegt in der Vergangenheit. Bitte neues Datum wählen." |
| `sprint_14d_vorlauf_constrained` | good | Empfehlung | „Bei diesem Vorlauf ist 14 Tage die längste DOOH-buchbare Laufzeit. Für volle 28-Tage-Präsenz wäre mehr Zeit nötig." |
| `optimal_28d_vorlauf_constrained` | good | Empfehlung | „Die gewählte Laufzeit deckt das Entscheidungsfenster ab. Für längeren Aufbau wäre mehr Vorlauf nötig." |
| `optimal_28d_standard` | good | Empfehlung | „Empfehlung für deine Kampagne. Die gewählte Laufzeit deckt das Entscheidungsfenster rund um den Versand der Stimmunterlagen ab." |
| `28d_broad_reach_low_frequency` | good | Empfehlung | „Diese Empfehlung setzt stärker auf breite Sichtbarkeit über das politische Entscheidungsfenster. Für mehr Wiederholung pro Person empfehlen wir ein etwas höheres Budget." |
| `sprint_14d_thin_budget` | info | Schlussimpuls 14 Tage | „Konzentrierter Schlussimpuls über 14 Tage. Für volle 28-Tage-Präsenz wäre das Budget eher knapp." |
| `sprint_14d_grosser_pool` | good | Empfehlung | „Bei grossen Regionen wirkt eine konzentrierte 2-Wochen-Phase rund um den Vote stärker als verteilte Auslieferung." |
| `sprint_14d_28d_unavailable` | good | Empfehlung | „14-Tage-Schlussimpuls — bei diesem Budget die wirkungsvollste Laufzeit." |
| `aufbau_42d_thin_budget` | info | Aufbau-Laufzeit | „Längere Laufzeit — sinnvoll für komplexere Themen oder wenn Bekanntheit aufgebaut werden soll." |
| `aufbau_42d_reach_premium` | good | Empfehlung | „Längere Laufzeit lohnt sich hier: deutlich mehr Personen werden erreicht als bei kürzerer Variante." |
| `aufbau_42d_28d_unavailable` | good | Empfehlung | „Längere Laufzeit verteilt das Budget besser über das Entscheidungsfenster." |
| `dominanzmodus` | good | Empfehlung | „Hohe Präsenz: jede erreichte Person sieht die Botschaft sehr oft. Zusätzliches Budget bringt in dieser Region kaum mehr Reichweite, aber stärkere Wiederholung." |
| `dominanzmodus_stark` | warn | Sehr hohe Frequenz | „Sehr hohe Frequenz pro Person. Ab diesem Budget empfehlen wir ein persönliches Gespräch zur Optimierung." |
| `too_thin` | warn | Budget knapp | „Budget reicht in dieser Konstellation nicht für eine wirkungsvolle Kampagne." |

**UI-Trennung intern/extern (Anti-Drift-Regel):** unverändert v3.5.2. Statuscode nie an User rendern.

### 7.3 Display-Only-Modus Pfad A (N)

Unverändert v3.5.2.

```
Voraussetzung:         daysUntilVote ≥ 8
laufzeit_days        = min(14, daysUntilVote − 1)
channel_split_override = { dooh: 0, display: 1.0 }
statusCode           = 'display_only_late_window'
deliveryMode         = 'display_only'
availability         = 'available'
```

Engine-Konsistenz, UI-Trennung — siehe v3.5.2 §7.3.

### 7.4 Budget-Marker (N)

Aktualisiert 19.05.2026 (war: Sprint-2-Final-Revision):

- Marker auf Slider entfällt vollständig.
- HintCard-Präfix dreigeteilt als Zone ±20% um `sweetSpot.budget`:
  - `currentBudget < sweetSpot.budget × 0.9` → „Empfohlenes Budget ab CHF X. " (CHF-Betrag sichtbar)
  - `sweetSpot.budget × 0.9 ≤ currentBudget ≤ sweetSpot.budget × 1.2` → „Im Sweet Spot. " (kein CHF)
  - `currentBudget > sweetSpot.budget × 1.2` → „Starke Kampagne — du nutzt das volle Potenzial dieser Region. " (kein CHF)
- Präfix nur bei `tone='good'` (stable Status).
- Ziel: Zone gibt User Sicherheit; positives Wording oberhalb nudgt tendenziell zu höherem Budget.

---

## Custom-Pfad: Wirkungsfokus-Modell

### Stellhebel
Der Custom-Pfad kennt drei vom Nutzer steuerbare Hebel:
- Budget (CHF)
- Kampagnenfenster (Start bis Wahltag, wochen-gesnapped, business-day-aware)
- Wirkungsfokus (Breite Wirkung / Ausgewogen / Verankerung)

Frequenz und Kanal-Mix sind keine Nutzer-Hebel, sondern Outputs des Modells.

### Wirkungsfokus → Kampagnenkontakte (Ziel-Frequenz über gesamte Laufzeit)

| Wirkungsfokus   | Kampagnenkontakte | Bedeutung                                   |
|-----------------|-------------------|---------------------------------------------|
| Breite Wirkung  | ~5×               | Mehr Personen, geringere Wiederholung       |
| Ausgewogen      | ~7×               | Standard                                    |
| Verankerung     | ~10×              | Weniger Personen, höhere Wiederholung       |

Werte sind `zielFrequenzKampagne` (Input). Wochenfrequenz = zielFrequenzKampagne / laufzeitWochen (Output, informativ). Status: Annahme (§10).

### Reach-Berechnung (Custom-Pfad)
    mischCPM              = doohAnteil × CPM_DOOH + (1 − doohAnteil) × CPM_DISPLAY
    impressionen          = budget × 1000 / mischCPM
    impressionenImPool    = impressionen × IN_POOL_FACTOR
    reachLinear           = impressionenImPool / zielFrequenzKampagne
    poolCap               = stimmTotal × tieredReachCap(stimmTotal)
    reach                 = poolCap × (1 − e^(−REACH_CURVE_K × reachLinear / poolCap))

    # Informativ (kein Steuer-Input):
    laufzeitWochen        = laufzeitTage / 7
    frequency_weekly      = zielFrequenzKampagne / laufzeitWochen

`zielFrequenzKampagne` ist die feste Kampagnen-Zielfrequenz aus dem Wirkungsfokus
(§4: 5/7/10). laufzeitTage geht NICHT mehr in die Reach-Formel ein; längere Laufzeit
ändert Reach nicht mehr, senkt aber frequency_weekly (Wochendruck dünner).

Die Hofmans-Sättigung gegen poolCap bleibt erhalten und sichert den Budget-
Sweet-Spot.

Abgrenzung zu v3.7–v3.12: Bisherige Formel teilte durch (zielFrequenz × laufzeitWochen),
was implizit Wochenfrequenz steuerte. Ab v3.13 ist Kampagnenfrequenz der direkte Input.

### Zeitachsen-Trennung (wichtig)
Die Wirkungsdauer (laufzeitWochen in der Reach-Berechnung) basiert bewusst auf
Kalendertagen, nicht auf Werktagen. Die Business-Day-Logik betrifft ausschliesslich
die operative DOOH-Buchbarkeit (Setup-Vorlauf), nicht die mediale Wirkungsdauer.
Eine Kampagne wirkt an sieben Tagen pro Woche; gebucht und produziert wird an
Werktagen.

### DOOH-Verfügbarkeit (Zwei-Zustand)
    fruehesterStart = addBusinessDays(heute, SETUP_VORLAUF_WERKTAGE)

Im Custom-Pfad bestimmt SETUP_VORLAUF_WERKTAGE (Werktage, ab Kampagnenstart) die DOOH-Buchbarkeit und löst dafür DOOH_CUTOFF_DAYS ab. Der Paket-Pfad behält DOOH_CUTOFF_DAYS (Kalendertage, bis Wahltag), da dort die Laufzeit fix ist. Beide Konstanten bleiben damit bewusst getrennt.

- Zustand A (im öffentlichen Raum + online): Start ≥ fruehesterStart UND die
  Region verfügt über DOOH-Inventar.
- Zustand B (online-only): Start < fruehesterStart. DOOH ist für diesen Zeitraum
  nicht mehr buchbar; die Reichweite wird vollständig über Display aufgebaut.

SETUP_VORLAUF_WERKTAGE (Werktage, Zürcher Feiertage berücksichtigt) — siehe §4 Konstanten.

Es gibt bewusst keine Zwischenstufe "reduzierte Präsenz": DOOH-Setup ist operativ
binär (Vorlauf reicht oder nicht). Eine Zwischenstufe erzeugt für politische
Nutzer mehr Erklärbedarf als Mehrwert.

### Kampagnenfenster & DOOH-Feasibility (Custom-Pfad)

Eine Quelle: getCampaignWindow(regions, voteDate, requestedLaufzeitDays).

DOOH-Feasibility (binär, keine zweite Schwelle):

    doohEarliestStart = addBusinessDays(today, SETUP_VORLAUF_WERKTAGE)

    voteDate − requestedLaufzeitDays < doohEarliestStart
      → modus = display_only, doohShare = 0, displayShare = 1
      → effectiveLaufzeitDays = min(requestedLaufzeitDays, max(LAUFZEIT_MIN_DAYS, daysUntilVote − 1))
      → earliestStart = voteDate − effectiveLaufzeitDays

    sonst
      → modus = dooh_mix; checkDoohAvailability entscheidet Inventar
      → bei no_inventory ebenfalls display_only (doohShare = 0)

Begründung: Die Kampagne ist nicht mehr rechtzeitig produzierbar, wenn der Wahltag
vor dem frühesten DOOH-Start liegt. Bewusst keine "minimal sinnvolle Laufzeit"-Schwelle
(80/20-Entscheid); der Edge-Case Runway knapp > Setup (1–2 sinnlose DOOH-Tage) wird
akzeptiert.

Alle Konsumenten — sliderMax (via sweetSpotCustom), Sweet-Spot-Marker, CampaignTimeline,
Pin, calculateImpactCustom — lesen Laufzeit und doohShare ausschliesslich aus diesem Objekt.
Keine zweite, unabhängige Laufzeit- oder doohShare-Quelle im Custom-Pfad.

### Präsenz-Kommunikation (Inventar-Copy-Regel)
Innerhalb von Zustand A entscheidet die Screen-Anzahl der Region über die
Formulierung der Präsenz-Aussage – nicht über eine zusätzliche Stufe:
- Screens ≥ SCREEN_ANZEIGE_SCHWELLE (siehe §4 Konstanten) → konkrete Bildschirm-Zahl nennen
  ("Sichtbar auf rund X Bildschirmen im öffentlichen Raum").
- Screens < SCREEN_ANZEIGE_SCHWELLE (siehe §4 Konstanten) → qualitativ formulieren
  ("Sichtbar im öffentlichen Raum deiner Region"), ohne schwache Zahl.

### Sweet-Spot und Coach-Hinweise (Custom)
Der Sweet-Spot ist der Budget-Punkt, ab dem der Grenzertrag der Reach unter eine
Schwelle fällt (Eintritt in die Sättigung). Ziel-Sättigungswert: `SWEET_SPOT_TARGET_SATURATION = 1.4` (§4).
Begründung: Pakete fahren Sättigungswerte 0.2–1.3; 1.4 ist das obere Ende dieses Korridors und markiert den effizienten Grenzertrag-Punkt. SAT 4.0 bedeutet Übersättigung.

**Sweet-Spot rechnet auf Referenz-Laufzeit (v3.12):** Die Budget-Empfehlung (`calculateSweetSpotCustom`) verwendet intern immer `REFERENZ_LAUFZEIT_DAYS = 28`, unabhängig von der vom Nutzer gewählten Laufzeit. Damit ist der Sweet-Spot laufzeit-stabil und vergleichbar. Die tatsächliche Wirkungsberechnung (`calculateImpactCustom`) nutzt weiterhin die echte Laufzeit.

**Cap-Level im Sweet-Spot (fokusabhängig):** Das Cap-Level richtet sich nach dem gewählten Wirkungsfokus:

| Wirkungsfokus  | Sweet-Spot Cap-Level | Mentales Modell                          |
|----------------|----------------------|------------------------------------------|
| Breite Wirkung | Level 3              | mehr Personen, höheres Pool-Cap          |
| Ausgewogen     | Level 2              | ausgewogen                               |
| Verankerung    | Level 1              | fokussierter, engeres Pool-Cap           |

Die Coach-Hinweise leiten sich relativ zum regionalen Sweet-Spot ab und führen den Nutzer neutral:
- Budget deutlich unter Sweet-Spot → Hinweis, ab welchem Budget die Wirkung
  spürbar steigt.
- Budget über Sweet-Spot → Hinweis auf Sättigung (mehr Budget bringt kaum mehr
  Reichweite).

**Wochendruck-Info-Hinweis (v3.13 — informativ, kein Block):**
Wenn `frequency_weekly = zielFrequenzKampagne / laufzeitWochen < WOCHENDRUCK_WARN_THRESHOLD (2.0)`:

> „Bei dieser Laufzeit verteilt sich die Wirkung auf Ø [X]× Kontakte pro Woche.
> Kürzere Kampagnen erzeugen stärkeren Wochendruck."

Regeln:
- Nur Info, kein Hard-Block, keine heimliche Laufzeit-Kürzung.
- Politische Wirkung ist kumulativ; langer Vorlauf ist legitim (Bekanntheit aufbauen).
- 42d-Deckel (§6.3) verhindert, dass Wochendruck beliebig dünn wird.

Tonalität verbindlich: datenbasiert, kompetent, nie wertend. Beispiel-Register:
"Für [Region] entfalten Kampagnen meist ab CHF X spürbar mehr Wirkung" statt
"Dein Budget ist zu tief".

---

## §8 Pfad B: Paket-Optimizer (N)

User wählt aus drei Paketen, System optimiert Laufzeit, Level, Channel-Mix innerhalb Paket-Identität.

### 8.1 Paket-Identität & Tier-Budget

**Paket-Engine ist kampagnenfrequenz-getrieben (v3.13):**

- **INPUT**: Tier-Budget (aus §4-Matrix) + Kampagnenfrequenz (`fKampagne`, fix je Paket: 5/7/9×, Kontakte über gesamte Laufzeit) + Laufzeit (fix, aus §8.3)
- **OUTPUT**: erreichbare Stimmberechtigte (`reach`) — identische Formel wie Custom-Pfad:

```
reachLinear = impressionenImPool / fKampagne
reach       = poolCap × (1 − e^(−REACH_CURVE_K × reachLinear / poolCap))

# Informativ:
frequency_weekly = fKampagne / laufzeitWochen
```

`fKampagne` ist garantiert (Input). laufzeitWochen geht NICHT mehr in die Reach-Formel ein. Reach ist ehrliche Output-Grösse — steigt monoton von Sichtbar zu Dominanz (teureres Paket = mehr Personen + mehr Kontakte). Frequenz-Bänder bleiben als informative Orientierung bestehen.

Identitätsstiftend (fix): Name, Rolle, Strategie, fKampagne, Laufzeit, Tier-Budget (aus §4-Matrix).
Engine-Output (dynamisch): Reach, Level, Channel-Mix, frequency_weekly.
Laufzeit ist fix pro Paket (§8.3).

Differenzierung primär über fKampagne + Laufzeit. Reach steigt mit höherem Paket; Gesamtkontakte stark (~+200%) von Sichtbar zu Dominanz — Reach nie als isolierter Paket-Vergleich verwenden.

| Paket | Wirkungs-Titel (§9.1) | Rolle | fKampagne / Kampagnenkontakte (INPUT) | Laufzeit (fix) | Strategie | Frequenz-Band (informativ) | Tier-Budget (§4-Matrix) |
|---|---|---|---|---|---|---|---|
| Sichtbar | Lokale Sichtbarkeit | Einstieg / Awareness | 5× | 21d | mehr Reichweite | ~3 – 5× | Tier A–D je §4 |
| Präsenz | Regionale Präsenz | Ausgewogen / Breite Präsenz | 7× | 28d | ausgewogen | ~4 – 7× | Tier A–D je §4 |
| Dominanz | Hohe Präsenz | Maximale Mobilisierung | 9× | 35d | mehr Wiederholung | ~6 – 10× | Tier A–D je §4 |

**Beratungs-Trigger `requiresConsultation` (v3.8 — Komplexität, nicht Budget):**

```
paket.requiresConsultation = (regionen.length > 1)
                           OR (spezielle_laufzeit)
                           OR (manueller_setup_bedarf)
```

DOMINANZ_CAP_MULTIPLIER ist als Trigger deprecated (§4). Der Trigger ist Komplexität, nicht Budgethöhe.

**UI-Verhalten bei `requiresConsultation = true`:**
- Karte zeigt statt Tier-Budget den Text „Persönliche Beratung empfohlen".
- Karte bleibt **klickbar** und führt zu Calendly-Link (oder konfiguriertem Beratungs-CTA).
- Karte ist **nicht ausgegraut** — Paket bleibt als wählbare Option sichtbar.
- Reach/Frequenz/Laufzeit-Details werden nicht angezeigt (sind verhandelbar im Beratungsgespräch).

**Folge für §9.3**: Wenn Paket `requiresConsultation = true` → kein EMPFOHLEN-Badge auf dieses Paket, Fallback auf nächstes verfügbares Paket.

### 8.2 Frequenz-Bänder (informativ)

Kampagnenkontakte je Paket (fKampagne, fix, Status: Annahme §10):

| Paket | fKampagne (Kampagnenkontakte) | Orientierungsband Wochenfrequenz (28d Ref.) |
|---|---|---|
| Sichtbar | 5× | ~1.8×/Woche |
| Präsenz | 7× | ~2.5×/Woche |
| Dominanz | 9× | ~1.8×/Woche (bei 35d Laufzeit) |

Wochendruck ist Output (informativ). Bei kurzen Laufzeiten steigt die Wochenfrequenz;
bei langen Laufzeiten sinkt sie. Kein Wochen-Floor für Paket-Pfad — politische
Wirkung ist kumulativ. Wochendruck-Hinweis ab frequency_weekly < 2.0 (§9 Wochendruck-Warnung).

### 8.3 Laufzeit-Kandidaten

Laufzeit ist fix pro Paket (v3.10):

```
SICHTBAR:  21
PRAESENZ:  28
DOMINANZ:  35
```

### 8.4 Mikroregionen-Logik

Unverändert v3.5.2.

### 8.5 Scoring

Unverändert v3.5.2.

### 8.6 DOOH-Timing-Constraint

Unverändert v3.5.2.

### 8.7 Display-Only-Strategie

Unverändert v3.5.2.

### 8.8 Status-Dimensionen

Unverändert v3.5.2.

---

## §9 UI-Kommunikation (N)

### 9.1 Hierarchie auf Paket-Karten (Pfad B)

Jede Karte zeigt:
1. **Wirkungs-Titel** (`wirkungs_titel`) — stabil, regionsunabhängig, immer wahr, keine Garantien
2. **Strategie-Label** — Kurzcharakter des Pakets: Sichtbar = „mehr Reichweite" / Präsenz = „ausgewogen" / Dominanz = „mehr Wiederholung"
3. **Wirkungs-Subline** (`wirkungs_subline`) — dynamisch, regionsspezifisch (§9.2)
4. **Zwei absolute KPIs** (nicht bei `requiresConsultation = true`):
   - Erreichte Stimmberechtigte (absolut, gerundet; z.B. „ca. 6'400 Personen")
   - Kampagnenfrequenz **PROMINENT**: `frequency_campaign` als „N× gesehen während der Kampagne" (z.B. „7× gesehen während der Kampagne")
   - Wochenfrequenz **SEKUNDÄR** / klein: als Kontextinfo „(Ø ~2.5×/Woche)" — optional, nicht primäre Aussage
   - Laufzeit (fix je Paket, z.B. „28 Tage")
5. Tier-Budget (CHF, aus §4-Matrix) — oder „Persönliche Beratung empfohlen" bei `requiresConsultation = true`
6. EMPFOHLEN-Badge, wenn applicable (§9.3)

Stabile Wirkungs-Titel (regionsunabhängig):

| Paket | `wirkungs_titel` | Strategie-Label |
|---|---|---|
| Sichtbar | Lokale Sichtbarkeit | mehr Reichweite |
| Präsenz | Regionale Präsenz | ausgewogen |
| Dominanz | Hohe Präsenz | mehr Wiederholung |

Reach wird als **absolute gerundete Zahl** angezeigt. **Pool-% erscheinen nicht** in der UI. **Reach nie als Paket-Vergleich oder Ranking** — Reach ist Ergebnisgrösse, nicht Differenzierungsmerkmal. Titel und Strategie-Label sind Richtungsangaben, keine Reach-Garantien.

**Vierte Karte — „Individuell konfigurieren":**
- Trigger: Custom-Pfad (Wirkungsfokus-Modell, v3.7)
- Custom ist eine **eigene Achse** (mehr Kontrolle, freies Budget), nicht „höher als Dominanz"
- Keine Hierarchie zu den drei Standardpaketen, kein Produktvergleich im Preisraum
- Erhält **nie** ein EMPFOHLEN-Badge (§9.3)

**Bei `requiresConsultation = true`**: Tier-Budget-Anzeige ersetzt durch „Persönliche Beratung empfohlen". Reach-Range und Wirkungszeitraum werden ausgeblendet. Klick auf Karte → Calendly-Link.

### 9.2 Subline-Mapping (Pfad B)

`wirkungs_subline` = Wahrheitsebene. Gleicher Titel, aber regional andere Subline. Erstes Match gewinnt:

| Bedingung | Subline |
|---|---|
| `requiresConsultation = true` | „Persönliche Beratung empfohlen" (statt Subline — ersetzt Budget-Anzeige) |
| `availability = unavailable` | „Für diese Abstimmung nicht mehr buchbar" (Karte ausgegraut) |
| `deliveryMode = display_only` | Paket-spezifisches Sprint-Framing (§8.7) |
| `qualityStatus = high_frequency` | „Hohe Kontaktdichte" |
| `qualityStatus = thin` | „Budget knapp für gewählte Region" |
| `contextFlag = mikro_limited` | „Begrenzte Reichweite in kleineren Gemeinden" |
| `paket.frequency_weekly < F_MIN_WEEKLY` (Floor) | „Erste Sichtbarkeit in einer grossen Zielregion" |
| `pool_tier ∈ {C, D}` | „💡 [Region] zählt zu den grösseren Regionen. Wenn du zusätzliche Reichweite oder einen anderen Wirkungsfokus möchtest, kannst du deine Kampagne im Custom-Modus individuell konfigurieren." |
| sonst | (keine Subline) |

**Floor-Regel (N):** Wenn `frequency_weekly < F_MIN_WEEKLY (3)`, framt die Subline ehrlich statt ein Präsenz-Versprechen zu machen. KEIN heimliches Laufzeit-Kürzen, KEIN Budget-Erhöhen, KEIN Ausgrauen — Paket bleibt sichtbar und kaufbar.

**Aufklärungssatz (N):** EIN dezenter Satz wird einmalig unter den drei Paket-Karten angezeigt:

> „Mehr erreichte Personen heisst nicht automatisch mehr Wirkung — entscheidend ist, dass deine Botschaft oft genug gesehen wird."

Tonalität: du-Form, ruhig, §2-Begründung (Effective Reach > Reach). Nicht als Warning, nicht fett, nicht als Subline — als kontextueller Hinweis unter den Karten.

### 9.3 Default-Empfehlung-Badge ("EMPFOHLEN")

Es gibt genau EINEN EMPFOHLEN-Badge. Custom erhält nie einen Badge.

**Badge-Begründung**: Präsenz ist der Politik-Standard (28d, ausgewogene Frequenz 4×). Badge basiert auf Laufzeit und Wirkungscharakter — **nicht** auf Reach-Vergleich (Reach ist Ergebnisgrösse, keine Badge-Basis).

`default_recommended_package` = das Paket mit Backend-recommended-Markierung (Empfehlungslogik unten), bestimmt VOR jedem UI-Sorting. Nicht „oberstes sichtbares Paket nach Sortierung".

| Kontext | Default-Empfehlung |
|---|---|
| Standard | Präsenz |
| Display-only + verfügbares Budget < CHF 9'000 | Präsenz |
| Display-only + verfügbares Budget ≥ CHF 9'000 | Dominanz |
| `pool < 20'000` UND verfügbares Budget < CHF 6'000 | Sichtbar |

**Guardrails (überschreiben Default-Empfehlung):**

| Bedingung | Verhalten |
|---|---|
| Default-Paket hat `availability = unavailable` | Fallback auf nächstes verfügbares Paket |
| Default-Paket hat `qualityStatus = thin` | Badge bleibt, Subline „Budget knapp für gewählte Region" hat Vorrang |
| Default-Paket hat `requiresConsultation = true` | Kein EMPFOHLEN-Badge auf dieses Paket, Fallback auf Präsenz |

**Ausführungssequenz mit Schichtgrenze (gegen Race Conditions):**

```
ENGINE (determinstisch, vor UI):
  1) Tier-Budget → Impact berechnen (§4-Matrix + §5-Engine)
  2) default_recommended_package bestimmen (Empfehlungslogik oben)
  3) PaketResult fest — inkl. recommended-Flag
─── Schichtgrenze ───────────────────────────────────────────────────
UI (kosmetisch, nach Schritt 3):
  4) Subline-Mapping (§9.2 erstes Match)
  5) Badge rendern (nur wenn paket.recommended = true aus Schritt 3)
```

Badge-Logik lebt vollständig in der Engine (Schritte 1–3). Karten-Sorting ist kosmetisch und beeinflusst den Badge nie.

### 9.4 Kommunikationsregeln

Unverändert v3.5.2.

---

## §10 Kalibrierung & offene Validierung (I)

Folgende Annahmen sind mock-kalibriert. **Anpassungen erfordern eine neue Spec-Version.**

| Parameter | Wert | Status |
|---|---|---|
| `REACH_CURVE_K` | 0.25 | Annahme |
| `IN_POOL_FACTOR` | 0.7 | Annahme |
| Cap-Tiers (12 Werte) | siehe §5.4 | mock-kalibriert |
| `F_MIN_WEEKLY = 3` | 3 | etabliert |
| `F_MAX_WEEKLY = 10` | 10 | Annahme |
| `WEAROUT_FLOOR = 0.70` | 0.70 | Annahme |
| `MIN_VORLAUF_DOOH = 10` | 10 | Annahme |
| `MIN_DISPLAY_ONLY_LAUFZEIT = 7` | 7 | Annahme |
| `AUFBAU_PREMIUM_THRESHOLD = 1.2` | 1.2 | Annahme (analog REACH_PREMIUM_THRESHOLD) |
| `DOMINANZ_CAP_MULTIPLIER = 2.5` | 2.5 | DEPRECATED v3.8 — Konstante bleibt zur Rückwärts-Kompatibilität |
| Tier-Budget-Matrix (12 Werte) | siehe §4 | Annahme — TODO: Owner für Kalibrierung nach ersten Live-Kampagnen |
| `SWEET_SPOT_TARGET_SATURATION` | 1.4 | Annahme — TODO: Kalibrierung mit Splicky vor Go-Live |
| Politik-Laufzeit-Max (§6.3) | 42d | Annahme — TODO: Kalibrierung mit Splicky vor Go-Live |
| `REFERENZ_LAUFZEIT_DAYS` (Sweet-Spot) | 28 | Annahme — Budget-Empfehlung normalisiert auf 28d (Politik-Standard) |
| `F_KAMPAGNE_SICHTBAR / PRAESENZ / DOMINANZ` | 5 / 7 / 9 | **Annahme** — TODO: Owner-Kalibrierung nach ersten Live-Kampagnen. Effective-Frequency-Korridor 3–10 als Begründung. |
| `F_KAMPAGNE_BREIT / AUSGEWOGEN / VERANKERUNG` | 5 / 7 / 10 | **Annahme** — Custom leicht höher bei Verankerung (fokussierter). TODO: Splicky-Kalibrierung + Live-Test. |
| `WOCHENDRUCK_WARN_THRESHOLD` | 2.0 | Annahme — TODO: Kalibrierung mit User-Feedback nach Live-Kampagnen. |

**Verantwortung Kalibrierung**: Dani (Delivery/Ausspielung) nach den ersten 10 Live-Kampagnen.

---

## §11 Pfad-A-Soll-Tabelle (N — Validierungs-Spec)

v3.5.2-Tabelle gilt weiterhin für `daysUntilVote = null` mit LAUFZEITEN_BASIS={14,28,42}. Nach v3.5.3-Erweiterung auf {14,21,28,35,42} sind Soll-Werte neu zu validieren — Optimizer-Entscheidungen können sich in Edge-Cases ändern (21d statt 28d gewinnen, 35d statt 42d).

**Status**: Re-Validierung gegen v3.5.3-Granularität ausstehend. Bisherige 72/72 grün gegen v3.5.2-Set bleibt Baseline.

**v3.5.3 zusätzliche Cases (zu validieren)**: `daysUntilVote ∈ {5, 25, 31, 40, 60}` × Archetypen A/B/C/D mit erweiterter Laufzeit-Granularität.

---

## §12 Pfad-B-Soll-Tabelle (N — zu definieren)

Unverändert v3.5.2 — Status: leer, 36 Soll-Werte ausstehend.

---

## §13 Eckwerte-Modus — Flow v2 (N)

Flow v2 kennt zwei Modi: **Geführt** (VIO schlägt vor) und **Impact** (Kunde setzt selbst). Beide rechnen **ohne Frequenz** als Nutzer-Input. Hinweise blockieren nie (kein UI-Gate).

### Gebietslast L

L = Summe der Gebietslastwerte aller gewählten Gebiete.
Pool-Quelle: `region.stimm` (Stimmberechtigte — **nie** Bevölkerungszahl).

**Gebietslast-Stufen — Status: Illustrativ** (Splicky-Kalibrierung ausstehend):

| Gebietstyp    | Lastwert |
|---------------|----------|
| Gemeinde      | 1        |
| Stadt         | 3        |
| Bezirk        | 4        |
| Kanton        | 8        |
| CH (national) | 20       |

Mehrere Gebiete: L = Σ Lastwerte.

### Zeitraum T (Tage)

**Geführt:** Ende = Urnengang; Start = Ende − {14 | 28 | 42}; Default 28 («ab Versand Stimmunterlagen»).
**Impact:** Start und Ende frei wählbar.

### Bedarfsformel

```
WOCHENSATZ   = 250          # CHF/Woche pro Lasteinheit — Status: Illustrativ
need         = L × (T / 7) × WOCHENSATZ
```

### Budget-Ratio & Risikoklasse

```
ratio        = budget / need
```

| ratio  | Klasse  | Hebel (immer zeigen)                                              |
|--------|---------|-------------------------------------------------------------------|
| ≥ 1.05 | niedrig | —                                                                 |
| ≥ 0.80 | mittel  | Gebiet fokussieren / Zeitraum straffen / Budget erhöhen           |
| < 0.80 | hoch    | Gebiet fokussieren / Zeitraum straffen / Budget erhöhen           |

Klasse **mittel** und **hoch** zeigen immer einen konkreten Hebel. Hinweis blockiert nie.

### Budget-Empfehlung

```
MIN_BUDGET   = 4000         # CHF, harter Unterboden
empfehlung   = max(MIN_BUDGET, ceil(need × 1.05 / 500) × 500)
```

### Reach

Bestehendes Modell (§5): `reachUniqueLow`, Drei-Ebenen-Ehrlichkeit. UI kommuniziert «ca. X+».

### UI-Sichtbarkeit

Im Eckwerte-Modus erscheinen **nie** in der UI: Frequenz, CPM, Kanal-Split.
CPM bleibt intern aktiv fürs Reach-Modell.

### Soll-Werte

| L | T (d) | Budget (CHF) | need      | ratio  | Klasse  | Empfehlung (CHF) |
|---|-------|-------------|-----------|--------|---------|-----------------|
| 6 | 28    | 6'000        | 6'000     | 1.00   | mittel  | 6'500           |
| 6 | 50    | 8'000        | ≈ 10'714  | ≈ 0.75 | hoch    | 11'500          |

---

## §14 Versionshistorie (I)

| Version | Datum | Änderung |
|---|---|---|
| v3.5.1 | 13.05.2026 | v3.4 absorbiert + Pfad-B-Architektur |
| v3.5.2 | 14.05.2026 | DOOH-Vorlauf in Pfad A, Sweet-Spot-Definition, Display-Only-Mode, Statuscodes umfassend (siehe v3.5.2-Datei) |
| **v3.5.3** | **14.05.2026** | **Pfad-A-Laufzeit-Granularität von {14,28,42} auf {14,21,28,35,42} erweitert (§7.0/§7.1). Statuscode-Naming als semantische Kategorien dokumentiert (§3). Schritte 1 + 4 in §7.1 testen jetzt 21d+28d (Standard) bzw. 35d+42d (Aufbau). Neue Konstante `AUFBAU_PREMIUM_THRESHOLD = 1.2`. Kein dynamischer max_vorlauf-Kandidat (Mediaplaner-Entscheidung: pragmatisch via granularem Standard-Set). Dominanz-Capping bei grossen Regionen: `requiresConsultation = (Dominanz.budget > 2.5 × Präsenz.budget)` → UI zeigt „Persönliche Beratung empfohlen" statt Preis, klickbar zu Calendly, nicht ausgegraut (§8.1, §9.2, §9.3 Guardrail). Neue Konstante `DOMINANZ_CAP_MULTIPLIER = 2.5`.** |
| **v3.6** | **21.05.2026** | **Audience-Contacts-Formel bereinigt (§5.3): `OTS_DOOH`, `DELIVERY_DOOH`, `DELIVERY_DISPLAY` als Konstanten entfernt (§4) und aus Kalibrierungstabelle gestrichen (§10). Begründung: fixer EK-CPM mit Operating-Partner preist OTS und Delivery vertraglich ein. Naming (§3), Caps/Saturation (§5.4–5.6), Optimizer (§7–§8), Status-Codes unverändert. Reach-Output verschiebt sich um max −4.5% bei `voll`-Klasse, +7.4% bei `display-dom`, ±0% bei `begrenzt`.** |
| **v3.7** | **28.05.2026** | **Custom-Pfad: Wirkungsfokus-Modell eingefügt (neuer Abschnitt nach §7). Drei Nutzer-Hebel: Budget, Kampagnenfenster, Wirkungsfokus. Frequenz ist Output. Neue Reach-Formel mit zielFrequenz (reachLinear = impressionenImPool / (zielFrequenz × laufzeitWochen)), Hofmans-Sättigung bleibt. Neue Konstanten SETUP_VORLAUF_WERKTAGE = 10 und SCREEN_ANZEIGE_SCHWELLE = 30 in §4. §7 (Pfad A Budget-First) als abgelöst markiert (Archiv-Referenz). §1 Scope um Custom-Pfad-Satz ergänzt.** |
| **v3.8** | **05.06.2026** | **Pool-Tier-Paketmodell: §8.1 ersetzt Min-Budget durch feste Tier-Budgets (4×3-Matrix, §4). Pool-Tiers A/B/C/D nach stimmTotal. Reach/Frequenz sind Output, nicht Preistreiber. Reach-Caps (§5.4) bleiben als Sättigungs-Obergrenze. requiresConsultation neu: Komplexitäts-Trigger (nicht budgetgetrieben), DOMINANZ_CAP_MULTIPLIER als Trigger deprecated. §3 neue Terms pool_tier, tier_budget, wirkungs_titel, wirkungs_subline. §9.1: stabile Wirkungs-Titel (Lokale Sichtbarkeit / Regionale Präsenz / Hohe Präsenz), vierte Karte „Individuell konfigurieren" als eigene Achse, keine Hierarchie zu Standardpaketen. §9.2: Floor-Wording-Regel bei frequency_weekly < F_MIN_WEEKLY (ehrliche Subline statt Ausgrauen/Kürzen). §9.3: Frequenz-Guardrail neu (Badge-Entzug bei frequency_weekly < F_MIN_WEEKLY, Custom-CTA, nie Badge-Verschiebung), Ausführungssequenz mit Schichtgrenze. §10: Tier-Budget-Matrix als Annahme + TODO Owner.** |
| **v3.9** | **08.06.2026** | **Paket-Engine frequenz-getrieben: §8.1 dokumentiert INPUT = Tier-Budget + Ziel-Frequenz (fix: Sichtbar 3×, Präsenz 5×, Dominanz 6×) + Laufzeit; OUTPUT = Reach. Reach-Formel identisch Custom-Pfad (reachLinear + Hofmans-Sättigung). §9.3: Frequenz-Guardrail (v3.8) entfernt — EMPFOHLEN-Badge sitzt immer auf default_recommended_package (Präsenz). Ausführungssequenz auf 3 Engine-Schritte reduziert. §9.1: Reach als absolute gerundete Zahl in Karten-Hierarchie (Item 3), Pool-% explizit verboten. §9.2: Tier-C/D-Custom-Hint als neue Subline-Zeile.** |
| **v3.10** | **08.06.2026** | **Finale Wirkungsprodukt-Logik: §8.3 Laufzeiten auf 21/28/35d fixiert (war 14/28/42d). §8.1 Ziel-Frequenz 3/4/5× (war 3/5/6×), Strategie-Spalte (mehr Reichweite / ausgewogen / mehr Wiederholung), Differenzierungshinweis (Reach +13–22%, Gesamtkontakte ~+200%). §4 Neue Tier-Budget-Matrix (CHF, Status Annahme): A 3'500/6'000/10'000, B 5'000/9'000/15'000, C 7'500/14'000/24'000, D 10'000/18'000/30'000. §9.1: Zwei absolute KPIs (Stimmberechtigte + Ø Kontakte/Person) + Laufzeit + Strategie-Label; Reach nie als Vergleich/Ranking. §9.2: Aufklärungssatz unter Karten. §9.3: Badge-Begründung Politik-Standard (28d, ausgewogene Frequenz 4×), nicht reach-begründet; qualityStatus=high_frequency-Guardrail entfernt. Custom-Pfad (WIRKUNGSFOKUS_FREQUENZ 2.1/3.1/4.6×) unverändert.** |
| **v3.14** | **12.06.2026** | **Eckwerte-Modus (Flow v2): §13 neu. Gebietslast L (Stimmberechtigte, illustrative Stufen 1/3/4/8/20), Zeitraum T, need-Formel, Budget-Ratio-Klassen (niedrig/mittel/hoch), Empfehlung-Formel, MIN_BUDGET CHF 4'000. Zwei Modi: Geführt (VIO schlägt vor) / Impact (frei). Hinweis blockiert nie. Frequenz/CPM/Kanal-Split nie in UI. Reach: bestehendes Modell §5.** |
| **v3.13** | **09.06.2026** | **Kampagnenfrequenz-Modell (fundamentaler Modellwechsel). §3: `frequency_campaign` PRIMARY, `frequency_weekly` abgeleitet/sekundär. §4: Neuer Block Kampagnenfrequenz (F_KAMPAGNE_SICHTBAR/PRAESENZ/DOMINANZ = 5/7/9, F_KAMPAGNE_BREIT/AUSGEWOGEN/VERANKERUNG = 5/7/10, EFFECTIVE_FREQUENCY_MIN/MAX = 3/10, WOCHENDRUCK_WARN_THRESHOLD = 2.0). §8.1: Formel reachLinear = impressionenImPool / fKampagne (war / (zielFrequenz × laufzeitWochen)); fKampagne 5/7/9× (war 3/4/5×). Custom-Pfad: Wirkungsfokus-Tabelle auf Kampagnenkontakte umgestellt (5/7/10×, war 2.1/3.1/4.6×/Woche); Reach-Formel analog. §8.2: Frequenz-Bänder auf Kampagnenkontakte aktualisiert (informativ). §9.1: KPI-Regel — Kampagnenfrequenz PROMINENT („N× gesehen während der Kampagne"), Wochenfrequenz sekundär. Neuer Wochendruck-Info-Hinweis bei frequency_weekly < 2.0 in Custom-Coach. §10: Drei neue fKampagne/WOCHENDRUCK-Zeilen (Status: Annahme, TODO Owner). SAT 1.4, fokusabhängiges Cap-Level, 42d-Deckel bleiben unverändert.** |
| **v3.12** | **09.06.2026** | **Sweet-Spot-Budget-Empfehlung auf Referenz-Laufzeit normalisiert (§ Sweet-Spot, §10). `calculateSweetSpotCustom` rechnet intern mit `REFERENZ_LAUFZEIT_DAYS = 28` statt der vom Nutzer gewählten Laufzeit. Budget-Empfehlung ist damit laufzeit-stabil. `calculateImpactCustom` unverändert (echte Laufzeit). Neue §10-Zeile: `REFERENZ_LAUFZEIT_DAYS`.** |
| **v3.11** | **08.06.2026** | **Custom-Sweet-Spot mediaplanerisch korrigiert. §4: Neue Konstante SWEET_SPOT_TARGET_SATURATION=1.4 (war 4.0; Pakete 0.2–1.3, effizienter Grenzertrag-Punkt). §6.3 neu: Politik-Laufzeit-Fenster 14/28/42d als Produktregel (N) für Paket und Custom (Custom deckelt nach oben auf 42d, Korridor 14–42d bleibt). Custom-Pfad Sweet-Spot: Cap-Level fokusabhängig (Breite Wirkung=L3, Ausgewogen=L2, Verankerung=L1; war fix L1). §10: SWEET_SPOT_TARGET_SATURATION und Laufzeit-Max als Annahme + TODO Splicky-Kalibrierung ergänzt.** |

### Geänderte normative Punkte v3.5.2 → v3.5.3

- §3 Statuscode-Naming-Konvention als semantische Kategorie dokumentiert. Neuer Term `requiresConsultation`.
- §4 Neue Konstanten `AUFBAU_PREMIUM_THRESHOLD = 1.2`, `DOMINANZ_CAP_MULTIPLIER = 2.5`.
- §6.1, §6.2 Laufzeit-Bedeutungs-Tabelle erweitert um 21d und 35d.
- §7.0 LAUFZEITEN_BASIS = {14, 21, 28, 35, 42} (war {14, 28, 42}).
- §7.1 Schritte 1, 4 erweitert auf granulare Kandidaten. Statuscode-Wording neutralisiert (z.B. „die gewählte Laufzeit" statt „die 28-tägige Laufzeit").
- §8.1 Dominanz-Capping-Regel neu.
- §9.1, §9.2, §9.3 Dominanz-Cap-Verhalten ergänzt.
- §10 Kalibrierungs-Tabelle um neue Konstanten erweitert.

### Geänderte normative Punkte v3.7 → v3.8

- §3 Neue Terms `pool_tier`, `tier_budget`, `wirkungs_titel`, `wirkungs_subline`. `requiresConsultation` Bedeutung erweitert auf Komplexitäts-Trigger.
- §4 Neue Subsection Pool-Tier-Budget-Matrix (normativ, Status Annahme). `DOMINANZ_CAP_MULTIPLIER` als DEPRECATED markiert.
- §8.1 Tabelle: Min-Budget → Tier-Budget (§4-Matrix). Identitätsstiftende Elemente angepasst. `requiresConsultation` Trigger auf Komplexität umgestellt.
- §9.1 Stabile Wirkungs-Titel dokumentiert. Vierte Karte „Individuell konfigurieren" als eigene Achse normiert.
- §9.2 Floor-Wording-Zeile neu in Subline-Mapping-Tabelle.
- §9.3 Frequenz-Guardrail neu (Badge-Entzug, Custom-CTA, kein Badge-Verschieben). `default_recommended_package` Definition. Ausführungssequenz mit Schichtgrenze.
- §10 Tier-Budget-Matrix-Zeile (Annahme, TODO Owner).

### Unveränderte normative Punkte aus v3.5.2

- Engine §5 vollständig (Caps, Saturation, Wearout, Frequenz).
- §7.3 Display-Only-Modus Pfad A.
- §7.4 Budget-Marker (Sprint-2-Final-Revision).
- §8.2–§8.8 Pfad-B-Logik (inkl. Vorlauf-Constraint §8.6/§8.7).

### Geänderte normative Punkte v3.5.3 → v3.6

- §4 Block „Preise & Delivery" → „Preise". Konstanten `DELIVERY_DOOH`, `DELIVERY_DISPLAY`, `OTS_DOOH` entfernt.
- §5.3 Audience-Contacts-Formel vereinfacht. Naming der Variablen bleibt (`contacts_dooh`, `contacts_display`, `contacts_gross`, `contacts_total`).
- §10 Drei Konstanten aus Kalibrierungs-Tabelle entfernt.

### Unveränderte normative Punkte aus v3.5.3

- §3 Terminologie vollständig.
- §5.1, §5.2, §5.4, §5.5, §5.6 (Pool, Channel-Splits, Caps, Saturation+Wearout, Frequenz).
- §6 Laufzeit-Logik.
- §7 Pfad A Optimizer inkl. §7.0/7.3/7.4.
- §8 Pfad B Optimizer vollständig.
- §9 UI-Kommunikation.

### Geänderte normative Punkte v3.6 → v3.7

- §1 Scope: Custom-Pfad-Satz ergänzt.
- §4 Neue Konstanten `SETUP_VORLAUF_WERKTAGE = 10` und `SCREEN_ANZEIGE_SCHWELLE = 30` im neuen Unterabschnitt „Custom-Pfad (Wirkungsfokus-Modell)".
- §7 Pfad A: Deprecation-Notice ergänzt (Archiv-Referenz, Inhalt unverändert).
- Neuer Abschnitt „Custom-Pfad: Wirkungsfokus-Modell" nach §7 eingefügt.

### Unveränderte normative Punkte aus v3.6

- §2 Politik-Kontext & Wirkungstheorie.
- §3 Terminologie vollständig.
- §4 Bestehende Konstanten (Reichweite & Frequenz, Preise, DOOH-Buchbarkeit, Paket-Capping).
- §5 Gemeinsame Engine (Reach-Modell, Caps, Saturation, Frequenz).
- §6 Laufzeit-Logik.
- §7 Pfad A Optimizer (Inhalt unverändert, nur Deprecation-Notice ergänzt).
- §8 Pfad B Optimizer vollständig.
- §9 UI-Kommunikation.
- §10 Kalibrierung.
- §11/§12 Soll-Tabellen.

### Geänderte normative Punkte v3.8 → v3.9

- §8.1: Engine-Dokumentation frequenz-getrieben. Ziel-Frequenz-Spalte (INPUT) in Paket-Tabelle (3×/5×/6×). Reach-Formel explizit referenziert (identisch Custom-Pfad). Frequenz-Bänder als informativ markiert.
- §9.1: Reach (absolut gerundet) als Item 3 in Karten-Hierarchie. Pool-% explizit verboten. Subline-Nummern angepasst.
- §9.2: Tier-C/D-Custom-Hint als neue Subline-Zeile vor „sonst".
- §9.3: Frequenz-Guardrail vollständig entfernt (Badge-Entzug-Regel, Custom-CTA-Regel, freqGuardrail-Konzept). Guardrails-Tabelle: Frequenz-Guardrail-Zeile gestrichen. Ausführungssequenz auf 3 Engine-Schritte + 2 UI-Schritte reduziert.

### Unveränderte normative Punkte aus v3.8

- §3 Terminologie vollständig (inkl. pool_tier, tier_budget, wirkungs_titel, wirkungs_subline, requiresConsultation).
- §4 Konstanten vollständig (inkl. Pool-Tier-Budget-Matrix).
- §5 Gemeinsame Engine (Reach-Modell, Caps, Saturation, Frequenz).
- §6 Laufzeit-Logik.
- §7 Pfad A Optimizer.
- §8.2–§8.8 Pfad-B-Logik.
- §9.3 Default-Empfehlung-Tabelle und verbleibende Guardrails (qualityStatus, availability, requiresConsultation).
- §10 Kalibrierung.
- §11/§12 Soll-Tabellen.

### Geänderte normative Punkte v3.9 → v3.10

- §4 Tier-Budget-Matrix: neue Werte (A 3'500/6'000/10'000, B 5'000/9'000/15'000, C 7'500/14'000/24'000, D 10'000/18'000/30'000). Status Annahme bleibt.
- §8.1: Ziel-Frequenz aktualisiert (Präsenz 5× → 4×, Dominanz 6× → 5×). Neue Spalten Laufzeit (fix) und Strategie. Differenzierungshinweis ergänzt. Identitätsstiftende Elemente um Strategie und Laufzeit erweitert.
- §8.3: Laufzeiten von Kandidaten-Listen auf fixe Einzelwerte umgestellt (21/28/35d).
- §9.1: Strategie-Label als Item 2. Zwei-KPI-Block als Item 4 (Stimmberechtigte + Ø Kontakte/Person + Laufzeit). Reach-Anti-Ranking-Regel explizit.
- §9.2: Aufklärungssatz-Regel ergänzt.
- §9.3: Badge-Begründungstext (Politik-Standard, nicht reach-begründet). qualityStatus=high_frequency-Guardrail entfernt.

### Unveränderte normative Punkte aus v3.9

- §3 Terminologie vollständig.
- §4 Konstanten (Reichweite & Frequenz, Preise, DOOH-Buchbarkeit, Paket-Capping).
- §5 Gemeinsame Engine (Reach-Modell, Caps, Saturation, Frequenz).
- §6 Laufzeit-Logik.
- §7 Pfad A Optimizer.
- §8.2/§8.4–§8.8 Pfad-B-Logik.
- §9.2 Subline-Mapping (inkl. Tier-C/D-Custom-Hint).
- §9.3 Default-Empfehlung-Tabelle und verbleibende Guardrails (availability, thin, requiresConsultation). Ausführungssequenz.
- §10 Kalibrierung.
- §11/§12 Soll-Tabellen.
- Custom-Pfad: Wirkungsfokus-Modell vollständig (WIRKUNGSFOKUS_FREQUENZ 2.1/3.1/4.6× unverändert).

### Geänderte normative Punkte v3.10 → v3.11

- §4 Neue Konstante `SWEET_SPOT_TARGET_SATURATION = 1.4` im Custom-Pfad-Block.
- §6.3 neu: Politik-Laufzeit-Fenster 14/28/42d als Produktregel (Minimum/Standard/Maximum), gilt für Paket und Custom.
- Custom-Pfad Sweet-Spot: SWEET_SPOT_TARGET_SATURATION=1.4 referenziert; Cap-Level fokusabhängig dokumentiert (Tabelle Breite Wirkung/Ausgewogen/Verankerung).
- §10 Zwei neue Zeilen: SWEET_SPOT_TARGET_SATURATION und Laufzeit-Max (Status: Annahme, TODO Splicky-Kalibrierung).

### Unveränderte normative Punkte aus v3.10

- §3 Terminologie vollständig.
- §4 Bestehende Konstanten (Reichweite & Frequenz, Preise, DOOH-Buchbarkeit, Paket-Capping, Pool-Tier-Budget-Matrix).
- §5 Gemeinsame Engine (Reach-Modell, Caps, Saturation, Frequenz).
- §6.1, §6.2 Laufzeit-Logik und Anker-Datum.
- §7 Pfad A Optimizer.
- §8 Pfad B Optimizer vollständig.
- §9 UI-Kommunikation.
- §11/§12 Soll-Tabellen.
- Custom-Pfad: Wirkungsfokus-Modell, Reach-Berechnung, DOOH-Verfügbarkeit, Kampagnenfenster.

### Geänderte normative Punkte v3.12 → v3.13

- §2 Wirkungstheorie: Krugman-Referenz auf Kampagnenskala aktualisiert (war: 3 Kontakte/Woche → neu: 3–5 Kontakte/Kampagne, Korridor 3–10). Wear-out auf Kampagnenkontakte bezogen.
- §3 Terminologie: `frequency_campaign` als PRIMARY markiert, `frequency_weekly` als abgeleitet/sekundär (Pfad A bleibt Ausnahme).
- §4 Neuer Block „Kampagnenfrequenz — fKampagne": F_KAMPAGNE_SICHTBAR/PRAESENZ/DOMINANZ (5/7/9), F_KAMPAGNE_BREIT/AUSGEWOGEN/VERANKERUNG (5/7/10), EFFECTIVE_FREQUENCY_MIN/MAX (3/10), WOCHENDRUCK_WARN_THRESHOLD (2.0). Status: Annahme.
- §8.1: Formel reachLinear = impressionenImPool / fKampagne (laufzeitWochen fällt aus Formel). fKampagne 5/7/9× (war zielFrequenz 3/4/5×). Tabellenspalte umbenannt und Werte aktualisiert. frequency_weekly als informativ-Output explizit.
- §8.2: Frequenz-Bänder auf Kampagnenkontakte umgestellt; Wochenfrequenz-Orientierung als Kontextwerte.
- Custom-Pfad: Wirkungsfokus-Tabelle auf Kampagnenkontakte (5/7/10×, war 2.1/3.1/4.6×/Woche). Reach-Formel analog §8.1 (/ zielFrequenzKampagne statt / (zielFrequenz × laufzeitWochen)). Wochendruck-Info-Hinweis bei frequency_weekly < 2.0.
- §9.1: KPI-Regel — Kampagnenfrequenz PROMINENT, Wochenfrequenz sekundär. Beispiel-Wording aktualisiert (war „4× gesehen" → „7× gesehen während der Kampagne").
- §10: Drei neue Kalibrierungszeilen (fKampagne-Paket, fKampagne-Custom, WOCHENDRUCK_WARN_THRESHOLD).

### Unveränderte normative Punkte aus v3.12

- §1 Scope (inkl. Custom-Pfad-Satz).
- §4 Alle bestehenden Konstanten (Reichweite & Frequenz, Preise, DOOH-Buchbarkeit, Paket-Capping, Pool-Tier-Budget-Matrix, Custom-Pfad-Block mit SETUP_VORLAUF_WERKTAGE / SCREEN_ANZEIGE_SCHWELLE / SWEET_SPOT_TARGET_SATURATION / REFERENZ_LAUFZEIT_DAYS).
- §5 Gemeinsame Engine (Reach-Modell, Caps, Saturation, Frequenz §5.6 bleibt als Definitions-Paragraph).
- §6 Laufzeit-Logik vollständig (inkl. §6.3 42d-Deckel, Politik-Laufzeit-Fenster).
- §7 Pfad A Optimizer vollständig (F_MIN_WEEKLY bleibt Optimizer-Grösse in §7.1).
- §8.3–§8.8 Pfad-B-Logik.
- §9.2 Subline-Mapping, §9.3 Default-Empfehlung-Badge, §9.4 Kommunikationsregeln.
- §11/§12 Soll-Tabellen.
- Custom-Pfad: DOOH-Verfügbarkeit, Kampagnenfenster, Sweet-Spot-Logik, Cap-Level fokusabhängig (SAT 1.4).

### Geänderte normative Punkte v3.13 → v3.14

- §13 neu: Eckwerte-Modus (Flow v2) — frequenzfreier Planungsmodus für Geführt und Impact.
- §4 Neue illustrative Konstanten: `WOCHENSATZ = 250`, `MIN_BUDGET = 4000`, Gebietslast-Stufen (Gemeinde 1 / Stadt 3 / Bezirk 4 / Kanton 8 / CH 20).
- Versionshistorie: §13 → §14 umbenannt.

### Unveränderte normative Punkte aus v3.13

- §1–§12 vollständig.
- §4 Alle bestehenden Konstanten (Reichweite & Frequenz, Preise, DOOH-Buchbarkeit, Paket-Capping, Pool-Tier-Budget-Matrix, Kampagnenfrequenz, Custom-Pfad).
- Custom-Pfad: Wirkungsfokus-Modell vollständig.

---

**Ende der Spec v3.13.**
