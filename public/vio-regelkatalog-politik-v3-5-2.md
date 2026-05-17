# VIO Regelkatalog Politik — v3.5.2 (DEPRECATED)

> **DEPRECATED 14.05.2026** — superseded by `vio-regelkatalog-politik-v3-5-3.md`. Diese Datei nicht mehr als Source-of-Truth verwenden. v3.5.3 erweitert Pfad-A-Laufzeit-Granularität auf {14,21,28,35,42} und ergänzt Dominanz-Capping (§8.1). Behalten für History-Kontext.

```yaml
SPEC_VERSION:     3.5.2
LAST_VALIDATED:   2026-05-14
PFAD_A_STATUS:    72/72 green gegen §11 — Re-Validierung gegen §7.0/§7.3 DOOH-Vorlauf ausstehend
PFAD_B_STATUS:    spec final, implementation pending (§12 36 Soll-Werte zu definieren)
PRECEDENCE:       Spec > Code. Bei Konflikt gilt diese Spec; Code wird angeglichen.
NEXT_VERSION:     keine geplant
```

**Status**: Single Source of Truth für die Politik-Preislogik. v3.5.2 ergänzt v3.5.1 um DOOH-Vorlauf-Constraint in Pfad A (§7.0/§7.3 analog §8.6/§8.7), normative Sweet-Spot-Definition (§7.4) und drei neue Statuscodes. v3.5.1 ist deprecated.

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

Beide Pfade respektieren denselben DOOH-Vorlauf-Constraint (Pfad A: §7.0/§7.3, Pfad B: §8.6/§8.7).

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
| `budgetMarker` | Niedrigstes Budget bei dem Optimizer-Empfehlung stabil wird (§7.4). UI-Label extern „Sweet Spot" (context=optimal) oder „Empfohlenes Budget" (context=constrained). Funktionsname im Code bleibt aus Backward-Compat-Gründen `calculateSweetSpot`. |

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

**Entfernt in v3.5.2**: `DISPLAY_SPRINT_SWITCH_DAYS = 24` — Trigger ist jetzt emergent aus Optimizer-Status (§7.0), keine separate Konstante mehr.

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

**Interpretations-Regeln**:
- OTS gewichtet Kontakte, nicht Reach. 1 DOOH-Play = 1.8 Audience Contacts.
- 1 Display-Impression = 1 Audience Contact.
- DELIVERY-Faktoren modellieren Lieferquote (z.B. nicht alle gebuchten DOOH-Plays werden tatsächlich ausgeliefert).
- IN_POOL_FACTOR modelliert Streuverluste (nur 70% der Kontakte treffen Personen im Ziel-Pool).

### 5.4 Reach-Caps nach Pool-Grösse

| Pool (Stimmberechtigte) | L1 (Sichtbar) | L2 (Präsenz) | L3 (Dominanz) |
|---|---|---|---|
| < 50'000 | 22% | 45% | 65% |
| 50'000 – 200'000 | 12% | 22% | 38% |
| 200'000 – 500'000 | 6% | 12% | 21% |
| > 500'000 | 3% | 6% | 12% |

Cap-Tiers sind unabhängig von Screen-Klasse. Screen-Klasse beeinflusst nur Channel-Split (und damit Audience Contacts pro CHF), nicht Reach-Cap.

**Reach-Caps bleiben in allen Modi aktiv** — auch im Display-Only-Modus (§7.3 / §8.7).

### 5.5 Unique Reach inkl. Wearout

```
pcap_share         = getCap(pool, level)            # aus §5.4
pcap_abs           = pool × pcap_share

ratio              = contacts_total / pcap_abs
saturation_factor  = 1 − exp(−REACH_CURVE_K × ratio)

reach_pre_wearout  = pcap_abs × saturation_factor
reach_capped       = min(reach_pre_wearout, pool × MAX_REACH_CAP)

# Wearout-Formel
weeks              = laufzeit_days / 7
wearout_factor     = if weeks <= 8:
                       1.0
                     else:
                       max(1.0 − (weeks − 8) × 0.03, WEAROUT_FLOOR)
                     # Floor 0.70 erreicht bei ~18 Wochen

reach_unique_abs   = reach_capped × wearout_factor
reach_unique_pct   = reach_unique_abs / pool
```

**Wearout-Interpretation**: Wearout-Decay greift erst **nach** dem politischen Entscheidungsfenster. Innerhalb der Standard-Laufzeiten (14/28/42d Pfad A) und der Pfad-B-Korridore (max 56d = 8 Wochen) bleibt der Faktor 1.0 — kurzfristige Überpräsenz wird stattdessen über `F_MAX_WEEKLY` / `F_OVERKILL_THRESHOLD` (Frequenz-Limits) modelliert. Ab Woche 9 setzt linearer Decay mit Slope −0.03/Woche ein, gefloort bei `WEAROUT_FLOOR = 0.70` (erreicht bei ~18 Wochen).

**Empirische Bestätigung**: Smoke-Test 2026-05-13 über alle 130 buchbaren Regionen zeigt für 42d-Cases (z.B. Adliswil 13'000 × 0.65 = 8'450) exakt `reach = pool × pcap_share` — konsistent mit `wearout_factor = 1.0` bei ≤ 8 Wochen.

### 5.6 Frequenz

```
frequency_campaign = contacts_total / reach_unique_abs
frequency_weekly   = frequency_campaign / weeks
```

`frequency_weekly` ist die durchschnittliche Anzahl Audience Contacts pro erreichter Person pro Woche.

---

## §6 Laufzeit-Logik (N)

### 6.1 Laufzeit-Bedeutung

| Laufzeit | Funktion | Wann |
|---|---|---|
| 14 Tage | Konzentrierter Schlussimpuls | Zu dünnes Budget für 28d ODER sehr grosse Pools (>500k) |
| 28 Tage | Politik-Default | Standard rund um Entscheidungsfenster |
| 42 Tage | Aufbau / Bekanntheit | Hohes Budget, erklärungsbedürftige Themen |

### 6.2 Anker-Datum

Wenn Abstimmungs-/Wahldatum gesetzt: Laufzeit wird **rückwärts** vom Termin gedacht.

| Laufzeit | Phase |
|---|---|
| 14 Tage | Letzte 2 Wochen vor Vote (Schlussimpuls) |
| 28 Tage | Entscheidungsfenster (ab Stimmunterlagen-Versand) |
| 42 Tage | Aufbau + Entscheidungsfenster |

Daraus folgt für UI: "läuft bis 14. Juni" = Vote-Datum, Start wird rückwärts berechnet.

---

## §7 Pfad A: Budget-First Optimizer (N)

User gibt Budget vor, System optimiert Laufzeit, Cap-Level und Status.

### 7.0 DOOH-Vorlauf-Vorfilter (N)

Pfad A respektiert denselben DOOH-Vorlauf-Constraint wie Pfad B (§8.6).

Wenn `daysUntilVote` gesetzt: Vor Optimizer-Iteration (§7.1) werden Laufzeit-Kandidaten gefiltert:

```
gültige_laufzeiten = [d ∈ {14, 28, 42} : daysUntilVote − d ≥ MIN_VORLAUF_DOOH (10)]
```

**Verzweigung:**

| Bedingung | Verhalten |
|---|---|
| `gültige_laufzeiten` nicht leer | §7.1 läuft normal, aber nur über gültige Laufzeiten |
| `gültige_laufzeiten` leer UND `daysUntilVote ≥ 8` | Display-Only-Modus (§7.3) |
| `gültige_laufzeiten` leer UND `daysUntilVote ∈ [1, 7]` | `statusCode = too_short_for_campaign`, `availability = unavailable` |
| `daysUntilVote < 1` | `statusCode = vote_passed`, `availability = unavailable` |
| `daysUntilVote = null` | Keine Filterung, alle Laufzeiten zulässig |

**Untergrenze sinnvolle Kampagne:** `daysUntilVote ≥ 8` — entspricht 7 Tage Display-Laufzeit + 1 Tag Vorlauf (`MIN_VORLAUF_DISPLAY`). Darunter ist keine wirksame Kampagne mehr planbar.

### 7.1 Optimizer-Schritte

Bei gegebenem Budget, Region(en) und Screen-Klasse iteriert der Optimizer durch folgende Schritte über `gültige_laufzeiten` (§7.0). **Erste passende Regel gewinnt.**

**Schritt 1 — 28d Hauptpfad**
Berechne 28d für L1, L2, L3 (falls 28d in `gültige_laufzeiten`). Wenn mindestens ein Level `frequency_weekly` im Band [F_MIN_WEEKLY, F_MAX_WEEKLY] hat → wähle das mit max `reach_unique_abs`.
Status: `optimal_28d_standard`.

**Schritt 2 — 28d Toleranz**
Wenn ein höheres Cap-Level mit `frequency_weekly` ∈ [F_MIN_TOLERANCE, F_MIN_WEEKLY) mindestens REACH_PREMIUM_THRESHOLD (1.4×) mehr Reach bringt als Schritt-1-Kandidat → nimm das höhere Level.
Status: `28d_broad_reach_low_frequency`.

**Schritt 3 — Sprint-Override (nur grosse Pools)**
Wenn `pool > LARGE_POOL_THRESHOLD` UND 14d ∈ `gültige_laufzeiten` UND 14d-Reach > 1.4 × 28d-Reach (beide in-Band) → wähle 14d.
Status: `sprint_14d_grosser_pool`.

**Schritt 4 — Aufbau-Override 42d**
Wenn 42d ∈ `gültige_laufzeiten` UND 42d-Reach > 1.2 × 28d-Reach (beide in-Band) → wähle 42d.
Status: `aufbau_42d_reach_premium`.

**Schritt 4b — Vorlauf-constrained 28d (Spiegel zu Schritt 4)**
Wenn 42d durch §7.0 (nicht Band-Check) ausgefiltert wurde UND Schattenberechnung 42d-Reach > 1.2 × 28d-Reach (28d in-Band) → 28d wird gewählt.
Status: `optimal_28d_vorlauf_constrained` (statt `optimal_28d_standard`).
Begründung: 28d-Empfehlung wäre dieselbe, aber der User darf wissen, dass der Engpass Vorlauf ist, nicht Budget.

**Schritt 5 — 28d nicht erreichbar**
Wenn keine 28d-Variante in-Band oder Toleranz → probiere 14d und 42d (nur falls in `gültige_laufzeiten`). Wähle Variante mit max Reach.
Status: `sprint_14d_thin_budget` / `aufbau_42d_thin_budget` / `sprint_14d_28d_unavailable` / `aufbau_42d_28d_unavailable`.

**Schritt 5b — Vorlauf-constrained 14d**
Wenn 28d UND 42d durch §7.0 (nicht Band-Check) ausgefiltert wurden, und 14d ist einzige Option in `gültige_laufzeiten` mit Treffer in-Band → Status `sprint_14d_vorlauf_constrained` (statt `sprint_14d_thin_budget` oder `sprint_14d_28d_unavailable`).
Begründung: heutiger Wording-Drift „Budget knapp" ist hier irreführend — Engpass ist Vorlauf.

**Schritt 6 — Dominanzmodus**
Wenn alle Kombinationen `frequency_weekly > F_MAX_WEEKLY` → wähle die mit max Reach. Tie-Break: längste Laufzeit, dann tiefste `frequency_weekly`.
Status: `dominanzmodus` (`frequency_weekly ≤ F_OVERKILL_THRESHOLD`) oder `dominanzmodus_stark` (`frequency_weekly > F_OVERKILL_THRESHOLD`).

**Schritt 7 — Too Thin**
Wenn alle Kombinationen `frequency_weekly < F_MIN_TOLERANCE` → wähle die mit höchster `frequency_weekly`.
Status: `too_thin`.

### 7.2 Status-Codes & UI-Botschaften

| Status-Code | Tone | UI-Label | UI-Botschaft |
|---|---|---|---|
| `display_only_late_window` | good | Empfehlung | „DOOH benötigt 10 Tage Vorlauf zur Freigabe. Bei dieser Abstimmung läuft die Kampagne als reines Online-Display." |
| `too_short_for_campaign` | warn | Zu wenig Zeit | „Für eine wirksame Kampagne braucht es mindestens 8 Tage Vorlauf bis zur Abstimmung." |
| `vote_passed` | warn | Abstimmung vorbei | „Diese Abstimmung liegt in der Vergangenheit. Bitte neues Datum wählen." |
| `sprint_14d_vorlauf_constrained` | good | Empfehlung | „Bei diesem Vorlauf ist 14 Tage die längste DOOH-buchbare Laufzeit. Für volle 28-Tage-Präsenz wäre mehr Zeit nötig." |
| `optimal_28d_vorlauf_constrained` | good | Empfehlung | „28 Tage decken das Entscheidungsfenster ab. Für 6 Wochen Aufbau wäre mehr Vorlauf nötig." |
| `optimal_28d_standard` | good | Empfehlung | „Empfehlung für deine Kampagne. Die 28-tägige Laufzeit deckt das Entscheidungsfenster rund um den Versand der Stimmunterlagen ab." |
| `28d_broad_reach_low_frequency` | good | Empfehlung | „Diese Empfehlung setzt stärker auf breite Sichtbarkeit über das politische Entscheidungsfenster. Die durchschnittliche Kontaktfrequenz liegt leicht unter dem Idealwert. Für mehr Wiederholung pro Person empfehlen wir ein etwas höheres Budget." |
| `sprint_14d_thin_budget` | info | Schlussimpuls 14 Tage | „Konzentrierter Schlussimpuls über 14 Tage. Für volle 28-Tage-Präsenz wäre das Budget eher knapp." |
| `sprint_14d_grosser_pool` | good | Empfehlung | „Bei grossen Regionen wirkt eine konzentrierte 2-Wochen-Phase rund um den Vote stärker als verteilte Auslieferung. Empfohlen: Schlussimpuls in den letzten 2 Wochen vor der Abstimmung." |
| `sprint_14d_28d_unavailable` | good | Empfehlung | „14-Tage-Schlussimpuls — bei diesem Budget die wirkungsvollste Laufzeit." |
| `aufbau_42d_thin_budget` | info | Aufbau 6 Wochen | „6 Wochen Aufbau — sinnvoll für komplexere Themen oder wenn Bekanntheit aufgebaut werden soll." |
| `aufbau_42d_reach_premium` | good | Empfehlung | „6 Wochen Laufzeit lohnt sich hier: deutlich mehr Personen werden erreicht als bei 4 Wochen." |
| `aufbau_42d_28d_unavailable` | good | Empfehlung | „Längere Laufzeit verteilt das Budget besser über das Entscheidungsfenster." |
| `dominanzmodus` | good | Empfehlung | „Hohe Präsenz: jede erreichte Person sieht die Botschaft sehr oft. Zusätzliches Budget bringt in dieser Region kaum mehr Reichweite, aber stärkere Wiederholung." |
| `dominanzmodus_stark` | warn | Sehr hohe Frequenz | „Sehr hohe Frequenz pro Person. Ab diesem Budget empfehlen wir ein persönliches Gespräch zur Optimierung — z.B. Region erweitern oder Budget gezielter einsetzen." |
| `too_thin` | warn | Budget knapp | „Budget reicht in dieser Konstellation nicht für eine wirkungsvolle Kampagne. Empfehlung: Region verkleinern oder Budget erhöhen." |

**UI-Trennung intern/extern (Anti-Drift-Regel):**
- `statusCode` ist Backend-Identifier. Wird nie an User gerendert.
- UI-Label ist die einzige extern sichtbare Bezeichnung.
- Insbesondere darf `display_only_late_window` extern nicht erscheinen — UI-Label ist „Online-Display Sprint".

**Persistenter Politik-Hinweis** (immer sichtbar im Politik-Flow):
„Für politische Kampagnen ist die Phase rund um den Versand der Stimmunterlagen besonders relevant. Viele Personen setzen sich dann konkret mit der Abstimmung oder Wahl auseinander."

### 7.3 Display-Only-Modus Pfad A (N)

Analog Pfad-B-Display-Only (§8.7). Wird durch §7.0 ausgelöst, wenn keine reguläre Laufzeit das DOOH-Vorlauf-Constraint erfüllt.

```
Voraussetzung:         daysUntilVote ≥ 8
laufzeit_days        = min(14, daysUntilVote − 1)
channel_split_override = { dooh: 0, display: 1.0 }
statusCode           = 'display_only_late_window'
deliveryMode         = 'display_only'
availability         = 'available'
```

**Engine-Konsistenz (wichtig):**

- Gleiche Engine (§5), nur mit Split-Override.
- Reach-Caps (§5.4) bleiben aktiv — Cap-Tier wird wie sonst aus Pool-Grösse bestimmt.
- Hofmans-Saturation (§5.5), Wearout, Frequenz-Bänder identisch zu Standard-Pfad.
- OTS_DOOH und CPM_DOOH fallen weg, da `split.dooh = 0`.
- **Keine zweite Mini-Engine. Einziger Unterschied: Channel-Split-Override.**

**Cap-Level-Bestimmung im Display-Only-Modus:**

Cap-Level wird wie in §7.1 Schritt 1–7 bestimmt, aber nur über die berechnete Laufzeit (`min(14, daysUntilVote − 1)`). In der Regel ist das L1 oder L2 — wird emergent ermittelt.

**UI-Trennung intern/extern:**

| Ebene | Wert |
|---|---|
| `statusCode` (intern) | `display_only_late_window` |
| UI-Label (extern) | „Online-Display Sprint" |
| UI-Hint (extern) | „DOOH benötigt 10 Tage Vorlauf zur Freigabe. Bei dieser Abstimmung läuft die Kampagne als reines Online-Display." |
| Wirkungsindikator | Standard-Anzeige mit 0% DOOH / 100% Display im Kanal-Mix |

### 7.4 Budget-Marker (N)

**Definition (normativ):** Der Budget-Marker zeigt das niedrigste Budget, bei dem die Optimizer-Empfehlung **stabil** wird — also nicht mehr durch zu knappes Budget oder fehlende Optionen strukturell eingeschränkt ist. Constraints durch Vorlauf oder Region-Klasse sind erlaubt; nur Budget-Engpässe machen den Marker ungültig.

**Stabilitäts-Kriterium:** statusCode NICHT in der unstable-Menge:

```
unstable = {
  sprint_14d_thin_budget,
  aufbau_42d_thin_budget,
  too_thin,
  dominanzmodus_stark,
  too_short_for_campaign,
  vote_passed,
}
```

Alle anderen Statuscodes gelten als stabil — auch `*_vorlauf_constrained` und `display_only_late_window`, da sie valide Empfehlungen unter Constraint markieren, nicht Verlegenheitsempfehlungen wegen Budget-Knappheit.

**Berechnung:** Linear-Scan über `[B_MIN, B_HARD_MAX]` in 500er-Schritten. Erstes Budget bei dem optimizeForBudget() einen stabilen statusCode liefert ist der Marker.

**Output-Struktur:**

```typescript
{
  budget: number,
  context: 'optimal' | 'constrained'
}
```

- `context = 'optimal'` wenn statusCode am Marker-Punkt === `optimal_28d_standard`.
- `context = 'constrained'` sonst (alle anderen stabilen Statuscodes).

**UI-Rendering (normativ):**

- Marker auf dem Slider: **entfällt vollständig**. Keine vertikale Linie, kein Inline-Label. Sweet-Spot-Information wandert komplett in die HintCard.
- HintCard-Präfix wird **dreigeteilt** je nach Verhältnis `currentBudget` zu `sweetSpot.budget`:

| Bedingung | Präfix | Bedeutung |
|---|---|---|
| `currentBudget < sweetSpot.budget` | „Empfohlenes Budget ab CHF X. " | User unter dem Sweet Spot — Orientierung nach oben |
| `sweetSpot.budget ≤ currentBudget ≤ sweetSpot.budget × 1.3` | „Im Sweet Spot. " | User im Optimum-Korridor — Bestätigung |
| `currentBudget > sweetSpot.budget × 1.3` | „Über dem Sweet Spot (Empfehlung ab CHF X). " | User über dem Korridor — diminishing returns, Hinweis |

- **Korridor-Faktor 1.3** (= +30%): Mediaplaner-pragmatisch noch im Optimum-Bereich. Darüber explizit „über".
- Präfix wird **nur** prepended wenn `sweetSpot != null` UND `hint.tone === 'good'` (stable Status). Bei unstable Status (`tone='info'` / `'warn'`): kein Präfix, Status-Text steht allein.
- Alle stabilen Statuscodes erhalten in der HintCard einheitlich tone `good` (grün) und title „Empfehlung" (siehe §7.2-Tabelle).
- `context`-Feld in `BudgetMarker` bleibt erhalten (Backward-Compat), wird aktuell nicht zur Präfix-Differenzierung genutzt.

**Begründung:** Heutige (Fix F) Präfix-Logik zeigt durchgängig „Empfohlenes Budget ab CHF X" auch wenn User weit über dem Sweet Spot liegt — semantisch falsch („ab" suggeriert Untergrenze). Dreiteilung gibt User klare Standort-Orientierung: bin ich darunter, im Optimum, oder darüber. Slider-Marker als visuelles Element entfällt, weil HintCard mit Wertangabe ausreichend Orientierung gibt und der Marker bei kleinem Sweet-Spot-Budget (Pfad A) optisch mit Slider-Min-Tick kollidierte.

**Edge Cases (Marker entfällt — return `null`):**

- Kein Budget im Range erreicht einen stabilen Status (z.B. `daysUntilVote < 8`: nur `too_short_for_campaign` oder `vote_passed` erreichbar).
- Sehr seltene Konstellationen wo die Empfehlung nirgends stabilisiert (z.B. Dominanzmodus-stark im ganzen Range bei sehr kleinem Pool und sehr hohem Budget).

**UI-Konsistenz-Regel (normativ):**

Marker und HintCard sind genau eine UI-Einheit: vertikale Linie auf Slider + grüner Empfehlung-Hint mit Präfix. Bei jedem stabilen Status (auch `*_vorlauf_constrained`, `display_only_late_window`, `dominanzmodus` etc.) wird der grüne Hint mit Marker-Präfix gezeigt.

Wenn kein Marker existiert (`null`): kein Präfix. Hint-Card zeigt nur den Status-Text (typischerweise `too_short_for_campaign` / `vote_passed` → tone warn).

**Performance:** Linear-Scan ist O(192) Optimizer-Calls. Memoization pro `(regions, daysUntilVote)` nötig — nicht pro Slider-Tick.

**Backward-Compat:** Funktionsname im Code bleibt `calculateSweetSpot()` (Refactoring out of scope). Funktion gibt jetzt `BudgetMarker | null` zurück statt `number | null`.

---

## §8 Pfad B: Paket-Optimizer (N)

User wählt aus drei Paketen, System optimiert Laufzeit, Level, Channel-Mix innerhalb Paket-Identität.

**Wichtig**: Pfad B nutzt die gemeinsame Engine (§5), aber **eigene Status-Welt** (§8.8). Pfad-A-Status-Codes erscheinen nicht im Pfad-B-Output.

### 8.1 Paket-Identität

| Paket | Rolle | Min-Budget | Frequenz-Band (`frequency_weekly`) |
|---|---|---|---|
| Sichtbar | Einstieg / Awareness | CHF 4'000 | 2.5 – 5.0× |
| Präsenz | Breite Präsenz | CHF 6'000 | 3.5 – 6.0× |
| Dominanz | Maximale Mobilisierung | CHF 9'000 | 6.0 – 10.0× |

Identitätsstiftend (fix): Name, Rolle, Min-Budget, Frequenz-Band.
Optimizer-Output (dynamisch): Laufzeit, Level (innerhalb §8.4-Regeln), Budget über Min, Channel-Mix.

### 8.2 Frequenz-Bänder

```
SICHTBAR:  band = [2.5, 5.0],  ideal = 3.50
PRAESENZ:  band = [3.5, 6.0],  ideal = 4.75
DOMINANZ:  band = [6.0, 10.0], ideal = 8.00
```

### 8.3 Laufzeit-Kandidaten

```
SICHTBAR:  [14, 21, 28]
PRAESENZ:  [21, 28, 35, 42]
DOMINANZ:  [28, 35, 42, 49, 56]
```

Keine harten Korridore. Alle Kandidaten werden berechnet, Scoring entscheidet (§8.5).

### 8.4 Mikroregionen-Logik (pool < 20'000)

| Paket | Standard-Level | Mikro-Level (< 20'000) |
|---|---|---|
| Sichtbar | L1 | **L2** |
| Präsenz | L2 | **L3** |
| Dominanz | L3 | L3 |

**Folge**: In Mikroregionen teilen sich Präsenz und Dominanz Level L3. Sie unterscheiden sich dort über Laufzeit und Frequenz, nicht über Reach. Das ist gewollt — entspricht echter Mediaplanung in kleinen Märkten.

Wenn Sichtbar in Mikroregion gewählt: `contextFlag = 'mikro_limited'`.

### 8.5 Scoring (deterministisch)

Für jeden Laufzeit-Kandidaten pro Paket:

```
# Schritt 1: Reach & Frequenz aus gemeinsamer Engine (§5)
reach_unique_abs   = computeImpact(budget, laufzeit, level, regions).reach_unique_abs
frequency_weekly   = computeImpact(budget, laufzeit, level, regions).frequency_weekly

# Schritt 2: Reach-Range (Mittelwert für Scoring)
reach_low          = reach_unique_abs × 0.95
reach_high         = reach_unique_abs × 1.05
reach_mid          = reach_unique_abs    # midpoint = exakter Wert, nicht gerundet

# Schritt 3: Frequenz-Güte
spannweite         = band.max - band.min
frequenz_güte      = 1 - |frequency_weekly - band.ideal| / spannweite
                     # Werte: 1.0 = perfekt, 0 = Bandgrenze, <0 = ausserhalb

# Schritt 4: Score
score              = reach_mid × max(0, frequenz_güte)
                     # alle Berechnungen in float64, keine Rundung vor Vergleich
```

**Normativ fix** (Änderung erfordert neue Spec-Version):
- Formel-Struktur `score = reach × max(0, güte)` (multiplikativ)
- Formel `frequenz_güte = 1 - |f - ideal| / spannweite`
- Reihenfolge der Berechnungs-Schritte
- Tie-Break-Regeln (siehe unten)
- Floating-Point-Präzision: alle Berechnungen in float64

**Kalibrierbar** (Anpassung durch Realdaten zulässig, dokumentiert in §10):
- `band.min`, `band.max`, `band.ideal` pro Paket (§8.2)
- Frequenz-Bänder können in zukünftigen Versionen verschoben werden
- Reach-Range-Faktoren (aktuell ±5%) für UI-Anzeige

**Nicht zulässig ohne Spec-Bump**:
- Wechsel auf exponentielle Gewichtung (z.B. `score = reach × güte²`)
- Einführung von Mindest-Güte-Schwellen (z.B. "frequenz_güte muss > 0.3 sein")
- Wechsel auf additive Komposition (z.B. `score = α × reach + β × güte`)

**Auswahl-Regeln** (deterministisch, in dieser Reihenfolge):

1. Höchster `score` gewinnt
2. Bei `|score_A - score_B| < 0.01 × score_A`: höchster `reach_unique_abs` gewinnt
3. Bei Gleichstand auch im Reach: längste Laufzeit gewinnt
4. Bei Gleichstand auch in Laufzeit: alphabetische Reihenfolge des Status-Tags (stabilisierender Tie-Break)

**Wenn alle Kandidaten `frequenz_güte ≤ 0`**: bester Kandidat nach `reach_unique_abs`. `qualityStatus` entsprechend gesetzt (siehe §8.8).

**Rounding**: Reach in UI als Range mit 1% Schritten gerundet (z.B. 8'200 → "ca. 8'000–8'400"). Berechnung selbst läuft unrundet.

### 8.6 DOOH-Timing-Constraint

```
vorlauf = daysUntilVote - laufzeit_days

vorlauf >= MIN_VORLAUF_DOOH (10)      → deliveryMode 'standard',     availability 'available'
vorlauf >= MIN_VORLAUF_DISPLAY (1)    → deliveryMode 'display_only', availability 'available'
vorlauf < 1                            → deliveryMode '-',            availability 'unavailable'
```

Wenn `daysUntilVote` nicht gesetzt: `deliveryMode = standard`, `availability = available`.

**Wichtig**: Constraint wirkt **pro Laufzeit-Kandidat**. Wenn für Dominanz nur 28d-Kandidat verfügbar ist (kürzere sind im Korridor nicht enthalten), wird dieser gewählt — auch wenn ein längerer besseren Score hätte.

Wenn **alle** Laufzeit-Kandidaten eines Pakets `unavailable`: Paket gesamthaft `availability = 'unavailable'`, in UI ausgegraut.

### 8.7 Display-Only-Strategie

Bei `deliveryMode = 'display_only'` (Vorlauf 1–9 Tage):

**Channel-Split-Override an Engine**: `{ dooh: 0, display: 1.0 }`. Engine berechnet mit reinem Display-CPM und ohne OTS-Multiplikator. Reach-Caps (§5.4) bleiben aktiv.

**Paket-spezifisches UI-Framing**:

| Paket | UI-Subline bei display_only |
|---|---|
| Sichtbar | „Schnelle digitale Awareness" |
| Präsenz | „Schnelle digitale Mobilisierung" |
| Dominanz | „Intensive Endphasen-Mobilisierung" |

### 8.8 Status-Dimensionen

Vier orthogonale Dimensionen. `contextFlag` optional, alle anderen immer gesetzt.

```typescript
deliveryMode:   'standard' | 'display_only'
availability:   'available' | 'unavailable'
qualityStatus:  'balanced' | 'high_frequency' | 'thin'
contextFlag?:   'mikro_limited'
```

`qualityStatus` und `contextFlag` sind unabhängig und können kombiniert werden:
- `balanced` + `mikro_limited` → solide Kampagne, aber begrenzte Reach in kleiner Region
- `high_frequency` + `mikro_limited` → zu hohe Frequenz, kleine Region
- `balanced` (ohne contextFlag) → Standard-Fall

**`qualityStatus` Bestimmung** (erstes Match gewinnt):
1. `high_frequency` — wenn `frequency_weekly > band.max`
2. `thin` — wenn `frequency_weekly < band.min`
3. `balanced` — sonst

**`contextFlag` Bestimmung**:
- `mikro_limited` — wenn `pool < 20'000` UND Paket = Sichtbar
- sonst undefined

---

## §9 UI-Kommunikation (N)

### 9.1 Hierarchie auf Paket-Karten (Pfad B)

**Primär** (gross, prominent):
- Paket-Name
- Budget
- `reach_unique_abs` als Range
- Wirkungszeitraum als Datum-Range („27. Mai – 14. Juni")

**Sekundär** (klein, kontext):
- Laufzeit-Tage
- Channel-Mix
- `frequency_weekly` (nur als Detail, nie prominent)

**Wichtig bei knappem Vorlauf** (vorlauf < 15 Tage): Datum-Range muss beide Daten zeigen, nie nur „läuft bis 14. Juni". Ohne Start-Datum versteht User nicht, dass Kampagne sofort startet. Bei `vorlauf < 10` (display_only): zusätzliche Subline aus §8.7.

**Unavailable-Erklärung**: Wenn Paket wegen Vorlauf-Constraint nicht buchbar ist, muss UI klar kommunizieren warum:
- Beispiel Präsenz (21d Min) bei daysUntilVote = 18: „Präsenz braucht mindestens 3 Wochen Laufzeit. Für deine Abstimmung in 18 Tagen empfehlen wir Sichtbar oder Dominanz."
- Kein technisches „vorlauf negativ" oder „unavailable" sichtbar für User.

### 9.2 Subline-Mapping (Pfad B)

Reihenfolge der Bestimmung, erstes Match gewinnt:

| Bedingung | Subline |
|---|---|
| `availability = unavailable` | „Für diese Abstimmung nicht mehr buchbar" (Karte ausgegraut) |
| `deliveryMode = display_only` | Paket-spezifisches Sprint-Framing (§8.7) |
| `qualityStatus = high_frequency` | „Hohe Kontaktdichte" |
| `qualityStatus = thin` | „Budget knapp für gewählte Region" |
| `contextFlag = mikro_limited` | „Begrenzte Reichweite in kleineren Gemeinden" |
| sonst | (keine Subline) |

### 9.3 Default-Empfehlung-Badge ("EMPFOHLEN")

Budgetkohärent — niemals teureres Paket aufdrängen als der User-Kontext nahelegt:

| Kontext | Default-Empfehlung |
|---|---|
| Standard | Präsenz |
| Display-only + verfügbares Budget < CHF 9'000 | Präsenz |
| Display-only + verfügbares Budget ≥ CHF 9'000 | Dominanz |
| `pool < 20'000` UND verfügbares Budget < CHF 6'000 | Sichtbar |

„Verfügbares Budget" = User-Budget aus vorherigen Schritten, oder Paket-Budget falls keiner gesetzt.

**Guardrails** (überschreiben Default-Empfehlung):

| Bedingung | Verhalten |
|---|---|
| Default-Paket hat `qualityStatus = high_frequency` | Kein EMPFOHLEN-Badge — kein Default-Highlight, wenn Wirkungsqualität nicht im Band |
| Default-Paket hat `availability = unavailable` | Fallback auf nächstes verfügbares Paket nach §9.3-Tabelle |
| Default-Paket hat `qualityStatus = thin` | Badge bleibt, aber Subline „Budget knapp für gewählte Region" hat Vorrang |

Begründung: EMPFOHLEN signalisiert „kauf das". Diese Empfehlung darf nicht ausgesprochen werden wenn die Wirkungsqualität strukturell schlecht ist — auch nicht aus Budget-Sortierung.

### 9.4 Kommunikationsregeln

- **Keine technischen Begriffe**: keine „Caps", „Level", „Reach-Sättigung", „Hofmans", „late_window"
- **Keine Vergleiche zwischen Paketen** in Sublines („besser als Sichtbar")
- **Begrenzungen positiv framen**: nicht „schlechtere Reach", sondern „günstiger Einstieg"
- **Reach als Range mit Präfix**: „ca. 8'000–9'000 Personen", nie exakte Zahl
- **Keine Frequenz-Zahlen** primär kommunizieren — `frequency_weekly` ist Backend-Steuerung, nicht User-Sprache
- **statusCode-Identifier (intern) nie extern rendern** — siehe §7.2 UI-Trennung

---

## §10 Kalibrierung & offene Validierung (I)

Folgende Annahmen sind mock-kalibriert und werden mit den ersten 10–20 Live-Kampagnen validiert. **Anpassungen erfordern eine neue Spec-Version.**

| Parameter | Wert | Status | Validierung über |
|---|---|---|---|
| `REACH_CURVE_K` | 0.25 | Annahme | Splicky-Reach-Reports vs. tatsächliche Reichweite |
| `IN_POOL_FACTOR` | 0.7 | Annahme | Geo-Audience-Daten (Splicky / GfK / Standortdaten) |
| `OTS_DOOH` | 1.8 | Annahme | OpenOOH-Standard, Publisher-spezifische OTS |
| `DELIVERY_DOOH` | 0.75 | Annahme | Splicky-Liefer-Reports |
| `DELIVERY_DISPLAY` | 0.90 | Annahme | Splicky / Display-Programmatic Reports |
| Cap-Tiers (12 Werte) | siehe §5.4 | mock-kalibriert | Reach-Plateaus echter Multi-Region-Kampagnen |
| Pool-Werte | aus Datensatz | aktuell | Periodische BFS-Aktualisierung |
| `F_MIN_WEEKLY = 3` | 3 | etabliert | Krugman 1972, ARF Effective-Frequency — Konsens |
| `F_MAX_WEEKLY = 10` | 10 | Annahme | Wear-out-Studien DOOH — Brand-Lift-Validierung |
| `WEAROUT_FLOOR = 0.70` | 0.70 | Annahme | Wear-out-Studien — Validierung über Brand-Recall |
| `MIN_VORLAUF_DOOH = 10` | 10 | Annahme | Splicky/Publisher-Freigabezeiten |
| `MIN_DISPLAY_ONLY_LAUFZEIT = 7` | 7 | Annahme | Untergrenze sinnvolle Display-Sprint-Laufzeit (Mediaplanner-Erfahrung) |

**Scoring-Parameter (§8.5)** — kalibrierbar (Änderung erfordert neue Spec-Version, kein Hotfix):

| Parameter | Aktueller Wert | Validierung über |
|---|---|---|
| Frequenz-Band Sichtbar | [2.5, 5.0], ideal 3.50 | Reach/Frequenz-Verhalten Live-Kampagnen |
| Frequenz-Band Präsenz | [3.5, 6.0], ideal 4.75 | Reach/Frequenz-Verhalten Live-Kampagnen |
| Frequenz-Band Dominanz | [6.0, 10.0], ideal 8.00 | Brand-Lift-Studien, Engagement-Daten |
| Reach-Range-Faktoren UI | ±5% | UX-Tests Range-Wahrnehmung |

**Nicht kalibrierbar** ohne Spec-Bump: Formel-Struktur Scoring (multiplikativ), Tie-Break-Reihenfolge, Floating-Point-Präzision.

**Verantwortung Kalibrierung**: Dani (Delivery/Ausspielung) nach den ersten 10 Live-Kampagnen.

---

## §11 Pfad-A-Soll-Tabelle (N — Validierungs-Spec)

Diese Tabelle ist die fachliche Validierungs-Spec. Jede Zeile ist ein Soll-Wert. Toleranz: ±2% auf Reach/Frequenz (Rundung).

Pool-Basis: alle Werte mit `pool = region.stimm`. Alle Werte gelten für `daysUntilVote = null` (kein Vorlauf-Constraint).

### Archetyp A — Kanton Zug (Pool 85'000, Klasse Voll)

| Budget | Tage | Lvl | reach_unique_abs | reach_unique_pct | frequency_campaign | frequency_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 14 | L2 | 14'002 | 16.5% | 7.4× | 3.7× | `sprint_14d_thin_budget` |
| 6'000 | 28 | L1 | 9'971 | 11.7% | 15.5× | 3.9× | `optimal_28d_standard` |
| 8'000 | 28 | L2 | 17'519 | 20.6% | 11.8× | 2.9× | `28d_broad_reach_low_frequency` |
| 12'000 | 28 | L2 | 18'403 | 21.7% | 16.8× | 4.2× | `optimal_28d_standard` |
| 20'000 | 28 | L3 | 31'707 | 37.3% | 16.3× | 4.1× | `optimal_28d_standard` |
| 30'000 | 28 | L3 | 32'220 | 37.9% | 24.1× | 6.0× | `optimal_28d_standard` |

### Archetyp B — Kanton Bern (Pool 775'000, Klasse Voll)

| Budget | Tage | Lvl | reach_unique_abs | reach_unique_pct | frequency_campaign | frequency_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 14 | L1 | 15'595 | 2.0% | 6.6× | 3.3× | `sprint_14d_thin_budget` |
| 6'000 | 14 | L1 | 18'858 | 2.4% | 8.2× | 4.1× | `sprint_14d_thin_budget` |
| 8'000 | 14 | L2 | 31'190 | 4.0% | 6.6× | 3.3× | `sprint_14d_thin_budget` |
| 12'000 | 14 | L2 | 37'715 | 4.9% | 8.2× | 4.1× | `sprint_14d_grosser_pool` |
| 20'000 | 14 | L3 | 69'806 | 9.0% | 7.4× | 3.7× | `sprint_14d_grosser_pool` |
| 30'000 | 14 | L3 | 81'417 | 10.5% | 9.5× | 4.8× | `sprint_14d_grosser_pool` |

### Archetyp C — Stadt Wädenswil (Pool 16'000, Klasse Display-dominant)

| Budget | Tage | Lvl | reach_unique_abs | reach_unique_pct | frequency_campaign | frequency_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 28 | L3 | 10'114 | 63.2% | 14.8× | 3.7× | `optimal_28d_standard` |
| 6'000 | 28 | L3 | 10'353 | 64.7% | 21.7× | 5.4× | `optimal_28d_standard` |
| 8'000 | 28 | L3 | 10'392 | 65.0% | 28.8× | 7.2× | `optimal_28d_standard` |
| 12'000 | 42 | L3 | 10'400 | 65.0% | 43.1× | 7.2× | `aufbau_42d_thin_budget` |
| 20'000 | 42 | L3 | 10'400 | 65.0% | 71.9× | 12.0× | `dominanzmodus` |
| 30'000 | 42 | L3 | 10'400 | 65.0% | 107.8× | 18.0× | `dominanzmodus_stark` |

### Archetyp D — Stadt Adliswil (Pool 13'000, Klasse Begrenzt)

| Budget | Tage | Lvl | reach_unique_abs | reach_unique_pct | frequency_campaign | frequency_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 28 | L3 | 8'220 | 63.2% | 14.8× | 3.7× | `optimal_28d_standard` |
| 6'000 | 28 | L3 | 8'412 | 64.7% | 21.7× | 5.4× | `optimal_28d_standard` |
| 8'000 | 28 | L3 | 8'444 | 65.0% | 28.8× | 7.2× | `optimal_28d_standard` |
| 12'000 | 42 | L3 | 8'450 | 65.0% | 43.2× | 7.2× | `aufbau_42d_thin_budget` |
| 20'000 | 42 | L3 | 8'450 | 65.0% | 72.1× | 12.0× | `dominanzmodus` |
| 30'000 | 42 | L3 | 8'450 | 65.0% | 108.1× | 18.0× | `dominanzmodus_stark` |

**Status**: Pfad A 72/72 grün gegen diese Tabelle (validiert via Sandbox `app/test-internal/preislogik-curves`, inkl. 48 Snapshot-Soll-Werte über 8 weitere Cluster-Repräsentanten — 2026-05-13).

**v3.5.2-Erweiterung (zu validieren)**: §7.0 DOOH-Vorlauf-Vorfilter und §7.3 Display-Only-Modus müssen mit ergänzenden Soll-Werten für `daysUntilVote ∈ {5, 15, 25, 40}` validiert werden.

---

## §12 Pfad-B-Soll-Tabelle (N — zu definieren vor Implementation)

**Status**: leer. 36 Soll-Werte (4 Regionen × 3 Pakete × 3 Timing-Szenarien) müssen vor Pfad-B-Code-Implementation definiert werden.

Format pro Zelle: `(laufzeit, level, reach_unique_abs, reach_unique_pct, frequency_weekly, deliveryMode, qualityStatus, contextFlag, recommended)`

Timing-Szenarien:
- **T1**: `daysUntilVote = null` (kein Datum gesetzt)
- **T2**: `daysUntilVote = 60` (komfortabel)
- **T3**: `daysUntilVote = 18` (Zeitdruck — Dominanz/Präsenz teilweise display_only)

Diese Tabelle wird in nächster Session gemeinsam definiert.

---

## §13 Versionshistorie (I)

| Version | Datum | Änderung |
|---|---|---|
| v2.2 | 28.04.2026 | Linear-Modell, F_REC_WEEKLY Divisor (deprecated) |
| v3.3 | — | Hofmans + IN_POOL_FACTOR + 7-Schritt-Optimizer (Pool-Inkonsistenz Stadt/Kanton) |
| v3.4 | unbestimmt | Pool-Definition vereinheitlicht auf `region.stimm`, Soll-Tabelle neu berechnet, 24/24 grün |
| v3.5 (Entwurf) | 12.05.2026 | Erster Versuch Pfad-B-Architektur — verworfen wegen Konstanten-Drift |
| v3.5.1-rc1 | 12.05.2026 | v3.4 absorbiert + Pfad-B-Architektur + Normativ/Informativ-Trennung |
| v3.5.1 | 13.05.2026 | Promotion aus rc1 nach Gating: 72/72 grün, Terminologie-Drifts migriert |
| **v3.5.2** | **14.05.2026** | **DOOH-Vorlauf-Constraint in Pfad A übernommen (§7.0/§7.3, analog §8.6/§8.7). Sweet Spot formal definiert (§7.4): niedrigstes Budget mit `optimal_28d_standard`. Drei neue Status-Codes: `display_only_late_window` (UI-Label „Online-Display Sprint"), `too_short_for_campaign`, `vote_passed`. Intern/Extern-Trennung in §7.2 und §9.4 normativ. Konstante `DISPLAY_SPRINT_SWITCH_DAYS=24` entfernt — Trigger emergent aus Optimizer-Status. Hardcode-Drift `TARGET_FREQ=4.5` in Sweet-Spot-Berechnung beseitigt. Neue Konstante `MIN_DISPLAY_ONLY_LAUFZEIT=7`. **Ergänzung 14.05.2026 nach Smoke-Test** (gleiche v3.5.2): zwei zusätzliche Status-Codes `sprint_14d_vorlauf_constrained` und `optimal_28d_vorlauf_constrained` (§7.1 Schritt 4b/5b) — beheben misleading Wording „Budget knapp" wenn tatsächlich Vorlauf der Engpass ist. **Zweite Ergänzung 14.05.2026:** §7.4 generalisiert vom „Sweet Spot" zum „Budget-Marker" mit context-abhängigem UI-Label („Sweet Spot" / „Empfohlenes Budget"). Heutige strikte 28d-Standard-Kopplung wurde im Vorlauf-Constrained-Fall zur Lücke (kein Marker → keine Budget-Orientierung). Neue Definition: Marker zeigt niedrigstes Budget bei dem Status stabil — auch unter Vorlauf-Constraint oder im Display-Only-Modus. Engine-Logik identisch, nur Output-Struktur und UI-Label kontextabhängig. **Dritte Ergänzung 14.05.2026 (UX-Iteration):** Marker-Inline-Label auf dem Slider entfernt (kollidierte mit Min-Tick bei kleinem Marker-Budget). Marker-Info wandert in die HintCard als Präfix „Empfohlenes Budget ab CHF X.". Alle stabilen Statuscodes (`optimal_28d_standard`, `*_vorlauf_constrained`, `display_only_late_window`, `28d_broad_reach_low_frequency`, `sprint_14d_grosser_pool`, `sprint_14d_28d_unavailable`, `aufbau_42d_reach_premium`, `aufbau_42d_28d_unavailable`, `dominanzmodus`) erhalten in §7.2 einheitlich tone `good` und title „Empfehlung". `context`-Feld in BudgetMarker bleibt erhalten (Backward-Compat + Zukunfts-Differenzierung), wird aktuell nicht zur Label-Unterscheidung genutzt. **Vierte Ergänzung 14.05.2026 (Sprint 2):** Slider-Marker entfällt vollständig (kein vertikaler Strich mehr). HintCard-Präfix dreigeteilt nach currentBudget vs. sweetSpot: „Empfohlenes Budget ab CHF X." (unter), „Im Sweet Spot." (Korridor sweetSpot bis ×1.3), „Über dem Sweet Spot (Empfehlung ab CHF X)." (über Korridor). Heutige durchgängige „Empfohlenes Budget ab"-Logik war semantisch ungenau wenn User weit über Sweet Spot.** |

### Geänderte normative Punkte v3.5.1 → v3.5.2

- §1 Scope erwähnt expliziten gemeinsamen DOOH-Vorlauf-Constraint Pfad A/B.
- §3 Term `sweetSpot` ergänzt.
- §4 Konstante `MIN_DISPLAY_ONLY_LAUFZEIT = 7` neu. `DISPLAY_SPRINT_SWITCH_DAYS` entfernt.
- §5.2 Override-Note erweitert um §7.3.
- §5.4 Reach-Caps gelten explizit „in allen Modi, auch Display-Only".
- §7.0 DOOH-Vorlauf-Vorfilter neu (war nur in §8.6 für Pfad B).
- §7.1 iteriert über `gültige_laufzeiten` statt fix `{14, 28, 42}`.
- §7.2 fünf neue Status-Codes (`display_only_late_window`, `too_short_for_campaign`, `vote_passed`, `sprint_14d_vorlauf_constrained`, `optimal_28d_vorlauf_constrained`). UI-Label-Spalte neu (intern/extern-Trennung).
- §7.1 Schritt 4b/5b: Vorlauf-Constrained-Logik für korrekte Status-Vergabe wenn §7.0 Laufzeiten ausfiltert.
- §7.3 Display-Only-Modus Pfad A neu (analog §8.7).
- §7.4 Sweet Spot normativ definiert (war Code-Drift).
- §9.4 Kommunikationsregel „statusCode nie extern rendern" ergänzt.

### Unveränderte normative Punkte aus v3.5.1

- Alle Reach-Caps (§5.4), Frequenz-Bänder (§8.2), Cap-Tiers, Engine-Formeln (§5.5/§5.6) identisch.
- Pfad-B-Logik (§8) komplett unverändert.
- Pfad-A-Optimizer-Schritte 1–7 inhaltlich unverändert (nur iteration set angepasst).

---

**Ende der Spec v3.5.2.**
