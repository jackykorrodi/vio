# VIO Regelkatalog Politik — v3.5.3

```yaml
SPEC_VERSION:     3.5.3
LAST_VALIDATED:   2026-05-14
PFAD_A_STATUS:    72/72 green gegen §11 (v3.5.2-Set) — Re-Validierung gegen erweiterte Laufzeit-Granularität {14,21,28,35,42} ausstehend
PFAD_B_STATUS:    §8.6/§8.7/§8.8 implementiert (Sprint 1+1b) — §12 36 Soll-Werte ausstehend
PRECEDENCE:       Spec > Code. Bei Konflikt gilt diese Spec; Code wird angeglichen.
NEXT_VERSION:     keine geplant
```

**Status**: Single Source of Truth für die Politik-Preislogik. v3.5.3 erweitert Pfad-A-Laufzeit-Granularität auf {14, 21, 28, 35, 42} (analog Pfad-B-Präsenz §8.3) und ergänzt Dominanz-Capping bei grossen Regionen (§8.1). v3.5.2 ist deprecated.

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

Beide Pfade respektieren denselben DOOH-Vorlauf-Constraint (Pfad A: §7.0/§7.3, Pfad B: §8.6/§8.7) und teilen dieselbe Laufzeit-Granularität {14, 21, 28, 35, 42} (Pfad A §7.0, Pfad B §8.3).

---

## §2 Politik-Kontext & Wirkungstheorie (I)

VIO ist eine politik-spezifische Preis- und Reichweitenlogik. Sie unterscheidet sich von klassischen DOOH-Tools darin, dass sie **sinnvolle Wirkung im politischen Entscheidungsfenster** optimiert — nicht maximale Reichweite pro CHF.

**Schweizer Politik-Spezifika:**
- Stimmunterlagen werden ca. 3–4 Wochen vor Abstimmung/Wahl per Post zugestellt
- Diese Phase ist kampagnenrelevant: viele Stimmberechtigte setzen sich erst dann konkret mit der Vorlage auseinander
- Daraus folgt: **28 Tage ist die natürliche Standard-Laufzeit** für Politik-Kampagnen

**Wirkungstheorie:**
- **Krugman 3+ Rule (1972)**: unter 3 Kontakten pro Person pro Woche ist Werbewirkung empirisch nahe null → F_MIN_WEEKLY = 3
- **Effective Reach > Reach**: nicht "wie viele Personen erreicht", sondern "wie viele mit Mindestwirkungsschwelle erreicht"
- **Wear-out** ab ca. 10–15 Kontakten/Woche → Frequency-Cap und Dominanzmodus

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
| `frequency_weekly` | contacts_total / reach_unique_abs / weeks |
| `frequency_campaign` | contacts_total / reach_unique_abs (= frequency_weekly × weeks) |
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
| `requiresConsultation` | Boolean-Flag pro Paket (§8.1). True wenn berechnetes Budget Cap übersteigt → Karte zeigt „Persönliche Beratung empfohlen" statt Preis. |

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

### Preise & Delivery

```
CPM_DOOH                = 50           # CHF, blended Buchungspreis
CPM_DISPLAY             = 15           # CHF, blended Buchungspreis
DELIVERY_DOOH           = 0.75         # erwartete Deliveryquote DOOH
DELIVERY_DISPLAY        = 0.90         # erwartete Deliveryquote Display
OTS_DOOH                = 1.8          # Audience Contacts pro DOOH-Play
```

### DOOH-Buchbarkeit (Pfad-A & Pfad-B Timing-Constraint)

```
MIN_VORLAUF_DOOH        = 10           # Tage zwischen Kampagnenstart und Vote
MIN_VORLAUF_DISPLAY     = 1            # Tage für Display-only Sprint
MIN_DISPLAY_ONLY_LAUFZEIT = 7          # Untergrenze sinnvolle Display-Sprint-Laufzeit
```

### Paket-Capping (§8.1)

```
DOMINANZ_CAP_MULTIPLIER = 2.5          # Dominanz.budget Cap = DOMINANZ_CAP_MULTIPLIER × Präsenz.budget
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
contacts_dooh    = (budget × split.dooh    / CPM_DOOH    × 1000)
                 × DELIVERY_DOOH × OTS_DOOH

contacts_display = (budget × split.display / CPM_DISPLAY × 1000)
                 × DELIVERY_DISPLAY

contacts_gross   = contacts_dooh + contacts_display
contacts_total   = contacts_gross × IN_POOL_FACTOR
```

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

---

## §7 Pfad A: Budget-First Optimizer (N)

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

Unverändert v3.5.2 (final-Revision Sprint 2):

- Marker auf Slider entfällt vollständig.
- HintCard-Präfix dreigeteilt:
  - `currentBudget < sweetSpot.budget` → „Empfohlenes Budget ab CHF X. "
  - `sweetSpot.budget ≤ currentBudget ≤ sweetSpot.budget × 1.3` → „Im Sweet Spot. "
  - `currentBudget > sweetSpot.budget × 1.3` → „Über dem Sweet Spot (Empfehlung ab CHF X). "
- Präfix nur bei `tone='good'` (stable Status).

---

## §8 Pfad B: Paket-Optimizer (N)

User wählt aus drei Paketen, System optimiert Laufzeit, Level, Channel-Mix innerhalb Paket-Identität.

### 8.1 Paket-Identität & Capping

| Paket | Rolle | Min-Budget | Frequenz-Band (`frequency_weekly`) |
|---|---|---|---|
| Sichtbar | Einstieg / Awareness | CHF 4'000 | 2.5 – 5.0× |
| Präsenz | Breite Präsenz | CHF 6'000 | 3.5 – 6.0× |
| Dominanz | Maximale Mobilisierung | CHF 9'000 | 6.0 – 10.0× |

Identitätsstiftend (fix): Name, Rolle, Min-Budget, Frequenz-Band.
Optimizer-Output (dynamisch): Laufzeit, Level, Budget über Min, Channel-Mix.

**Dominanz-Capping (N — neu in v3.5.3):**

Bei grossen Regionen kann das berechnete Dominanz-Budget unverkäuflich hoch werden (z.B. Zürich Pool 1M → ~CHF 194'000 für L3-Voll-Saturation). Mediaplanner-Realität: ab einem bestimmten Investment-Level ist individuelles Setup angemessen, kein Standard-Paket.

```
Dominanz.requiresConsultation = (Dominanz.calculatedBudget > DOMINANZ_CAP_MULTIPLIER × Präsenz.budget)
                              = (Dominanz.calculatedBudget > 2.5 × Präsenz.budget)
```

**UI-Verhalten bei `requiresConsultation = true`:**
- Karte zeigt statt nominellem Budget den Text „Persönliche Beratung empfohlen".
- Karte bleibt **klickbar** und führt zu Calendly-Link (oder konfiguriertem Beratungs-CTA).
- Karte ist **nicht ausgegraut** — Dominanz bleibt als wählbare Option sichtbar, nur die Standard-Buchung entfällt.
- Reach/Frequenz/Laufzeit-Details werden nicht angezeigt (sind verhandelbar im Beratungsgespräch).

**Folge für §9.3**: Wenn Dominanz `requiresConsultation = true` → kein EMPFOHLEN-Badge auf Dominanz möglich, Fallback auf Präsenz.

**Begründung:** „Persönliche Beratung empfohlen" ist Mediaplanner-Sprache. Unverkäufliche Standard-Bookings ab ~CHF 50k+ (regions-abhängig) werden so transparent als individuelle Setups gekennzeichnet, ohne den User abzuschrecken.

### 8.2 Frequenz-Bänder

Unverändert.

### 8.3 Laufzeit-Kandidaten

Unverändert.

```
SICHTBAR:  [14, 21, 28]
PRAESENZ:  [21, 28, 35, 42]
DOMINANZ:  [28, 35, 42, 49, 56]
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

Unverändert v3.5.2.

**Ergänzung Dominanz-Cap (§8.1)**: Bei `requiresConsultation = true` ersetzt der Text „Persönliche Beratung empfohlen" das Budget. Reach-Range und Wirkungszeitraum werden ausgeblendet. Klick auf Karte → Calendly-Link.

### 9.2 Subline-Mapping (Pfad B)

Erweitert um Dominanz-Cap. Erstes Match gewinnt:

| Bedingung | Subline |
|---|---|
| `requiresConsultation = true` | „Persönliche Beratung empfohlen" (statt Subline — ersetzt Budget-Anzeige) |
| `availability = unavailable` | „Für diese Abstimmung nicht mehr buchbar" (Karte ausgegraut) |
| `deliveryMode = display_only` | Paket-spezifisches Sprint-Framing (§8.7) |
| `qualityStatus = high_frequency` | „Hohe Kontaktdichte" |
| `qualityStatus = thin` | „Budget knapp für gewählte Region" |
| `contextFlag = mikro_limited` | „Begrenzte Reichweite in kleineren Gemeinden" |
| sonst | (keine Subline) |

### 9.3 Default-Empfehlung-Badge ("EMPFOHLEN")

Budgetkohärent — niemals teureres Paket aufdrängen.

| Kontext | Default-Empfehlung |
|---|---|
| Standard | Präsenz |
| Display-only + verfügbares Budget < CHF 9'000 | Präsenz |
| Display-only + verfügbares Budget ≥ CHF 9'000 | Dominanz |
| `pool < 20'000` UND verfügbares Budget < CHF 6'000 | Sichtbar |

**Guardrails (überschreiben Default-Empfehlung):**

| Bedingung | Verhalten |
|---|---|
| Default-Paket hat `qualityStatus = high_frequency` | Kein EMPFOHLEN-Badge |
| Default-Paket hat `availability = unavailable` | Fallback auf nächstes verfügbares Paket |
| Default-Paket hat `qualityStatus = thin` | Badge bleibt, Subline „Budget knapp für gewählte Region" hat Vorrang |
| **Default-Paket hat `requiresConsultation = true` (neu v3.5.3)** | **Kein EMPFOHLEN-Badge auf Dominanz, Fallback auf Präsenz** |

### 9.4 Kommunikationsregeln

Unverändert v3.5.2.

---

## §10 Kalibrierung & offene Validierung (I)

Folgende Annahmen sind mock-kalibriert. **Anpassungen erfordern eine neue Spec-Version.**

| Parameter | Wert | Status |
|---|---|---|
| `REACH_CURVE_K` | 0.25 | Annahme |
| `IN_POOL_FACTOR` | 0.7 | Annahme |
| `OTS_DOOH` | 1.8 | Annahme |
| `DELIVERY_DOOH` | 0.75 | Annahme |
| `DELIVERY_DISPLAY` | 0.90 | Annahme |
| Cap-Tiers (12 Werte) | siehe §5.4 | mock-kalibriert |
| `F_MIN_WEEKLY = 3` | 3 | etabliert |
| `F_MAX_WEEKLY = 10` | 10 | Annahme |
| `WEAROUT_FLOOR = 0.70` | 0.70 | Annahme |
| `MIN_VORLAUF_DOOH = 10` | 10 | Annahme |
| `MIN_DISPLAY_ONLY_LAUFZEIT = 7` | 7 | Annahme |
| `AUFBAU_PREMIUM_THRESHOLD = 1.2` | 1.2 | Annahme (analog REACH_PREMIUM_THRESHOLD) |
| `DOMINANZ_CAP_MULTIPLIER = 2.5` | 2.5 | Mediaplanner-Entscheidung (v3.5.3) |

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

## §13 Versionshistorie (I)

| Version | Datum | Änderung |
|---|---|---|
| v3.5.1 | 13.05.2026 | v3.4 absorbiert + Pfad-B-Architektur |
| v3.5.2 | 14.05.2026 | DOOH-Vorlauf in Pfad A, Sweet-Spot-Definition, Display-Only-Mode, Statuscodes umfassend (siehe v3.5.2-Datei) |
| **v3.5.3** | **14.05.2026** | **Pfad-A-Laufzeit-Granularität von {14,28,42} auf {14,21,28,35,42} erweitert (§7.0/§7.1). Statuscode-Naming als semantische Kategorien dokumentiert (§3). Schritte 1 + 4 in §7.1 testen jetzt 21d+28d (Standard) bzw. 35d+42d (Aufbau). Neue Konstante `AUFBAU_PREMIUM_THRESHOLD = 1.2`. Kein dynamischer max_vorlauf-Kandidat (Mediaplaner-Entscheidung: pragmatisch via granularem Standard-Set). Dominanz-Capping bei grossen Regionen: `requiresConsultation = (Dominanz.budget > 2.5 × Präsenz.budget)` → UI zeigt „Persönliche Beratung empfohlen" statt Preis, klickbar zu Calendly, nicht ausgegraut (§8.1, §9.2, §9.3 Guardrail). Neue Konstante `DOMINANZ_CAP_MULTIPLIER = 2.5`.** |

### Geänderte normative Punkte v3.5.2 → v3.5.3

- §3 Statuscode-Naming-Konvention als semantische Kategorie dokumentiert. Neuer Term `requiresConsultation`.
- §4 Neue Konstanten `AUFBAU_PREMIUM_THRESHOLD = 1.2`, `DOMINANZ_CAP_MULTIPLIER = 2.5`.
- §6.1, §6.2 Laufzeit-Bedeutungs-Tabelle erweitert um 21d und 35d.
- §7.0 LAUFZEITEN_BASIS = {14, 21, 28, 35, 42} (war {14, 28, 42}).
- §7.1 Schritte 1, 4 erweitert auf granulare Kandidaten. Statuscode-Wording neutralisiert (z.B. „die gewählte Laufzeit" statt „die 28-tägige Laufzeit").
- §8.1 Dominanz-Capping-Regel neu.
- §9.1, §9.2, §9.3 Dominanz-Cap-Verhalten ergänzt.
- §10 Kalibrierungs-Tabelle um neue Konstanten erweitert.

### Unveränderte normative Punkte aus v3.5.2

- Engine §5 vollständig (Caps, Saturation, Wearout, Frequenz).
- §7.3 Display-Only-Modus Pfad A.
- §7.4 Budget-Marker (Sprint-2-Final-Revision).
- §8.2–§8.8 Pfad-B-Logik (inkl. Vorlauf-Constraint §8.6/§8.7).

---

**Ende der Spec v3.5.3.**
