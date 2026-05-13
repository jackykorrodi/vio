> **DEPRECATED — Stand 13.05.2026**
>
> Aktuelle Single Source of Truth: `vio-regelkatalog-politik-v3-5-1.md`
>
> v3.5.1 absorbiert v3.4 vollständig (Pfad A unverändert übernommen) und ergänzt Pfad B als Spec.
> Diese Datei bleibt als historische Detail-Referenz für Pfad-A-Optimizer-Schritte erhalten.

---

# VIO Regelkatalog Politik — v3.4

**Status:** Finale Phase-1-Spec (freigegeben).
**Source of Truth:** Dieses Dokument ist die fachliche Spec für die Politik-Preislogik. Code in `lib/preislogik.ts` muss sich an dieses Dokument halten — nicht umgekehrt.
**Letzte Änderung:** v3.4 — Pool-Definition vereinheitlicht auf `region.stimm` (Stimmberechtigte) für alle Regionstypen. Soll-Tabelle komplett neu gerechnet mit echten Stimmberechtigten-Zahlen aus dem Datensatz. Optimizer-Logik unverändert ggü v3.3.

**Vorgängerversion:** v3.3 (deprecated — hatte für Städte fälschlich `region.pop` als Pool verwendet, was zu inkonsistenter Reach-Definition zwischen Stadt und Kanton geführt hätte).

---

## 1. Ziel der Logik

VIO ist eine Politik-spezifische Preis- und Reichweitenlogik. Sie unterscheidet sich von klassischen DOOH-Tools darin, dass sie nicht nur „maximale Reichweite pro CHF" optimiert, sondern **sinnvolle Wirkung im politischen Entscheidungsfenster**.

**Fachlicher Kontext:**

- Stimmunterlagen werden in der Schweiz ca. 3–4 Wochen vor Abstimmung oder Wahl per Post zugestellt. Diese Phase ist für die Kampagnenwirkung zentral, weil sich viele Stimmberechtigte erst dann konkret mit der Vorlage auseinandersetzen.
- Daraus folgt: 28 Tage Laufzeit ist die natürliche Standard-Laufzeit für Politik-Kampagnen. Sie deckt das Entscheidungsfenster ab.
- 14 Tage werden als „konzentrierter Schlussimpuls" eingesetzt — entweder bei zu dünnem Budget für 28 Tage oder bei sehr grossen Pools, wo Konzentration mehr Reach bringt.
- 42 Tage werden für Aufbau, erklärungsbedürftige Themen oder hohe Budgets eingesetzt.

**Wirkungstheorie:**

- Krugman 3+ Rule (1972): unter 3 Kontakten pro Person pro Woche ist Werbewirkung empirisch nahe null.
- Effective Reach > Reach: nicht „wie viele Personen erreicht", sondern „wie viele Personen mit mindestens Wirkungsschwelle erreicht".
- Wear-out ab ca. 10–15 Kontakten pro Woche pro Person → Frequenz-Cap und Dominanzmodus.

**Pool-Definition (NEU in v3.4 — zentral):**

Der Reach-Pool ist **immer** die Anzahl Stimmberechtigte (`region.stimm`), unabhängig vom Regionstyp (Kanton, Bezirk, Stadt, Gemeinde).

- Reach abs = erreichte Stimmberechtigte
- Reach % = Anteil der Stimmberechtigten
- f_weekly = Audience Contacts / erreichte Stimmberechtigte / Wochen
- Bevölkerung (`region.pop`) ist Kontextwert für die UI, aber **nicht** Kern-Pool für Reach, Caps und Frequenz.

Begründung: Politische Kampagnen wirken auf Stimmberechtigte. Eine Hybrid-Logik (Stadt → pop, Kanton → stimm) würde Reach % je nach Regionstyp unterschiedlich bedeuten und Mehr-Region-Buchungen (z.B. Stadt Zürich + Kanton ZH) inkonsistent machen.

---

## 2. Konstanten

```
F_MIN_WEEKLY            = 3            # Krugman-Schwelle, Wirkungs-Floor
F_MIN_TOLERANCE         = 2.7          # Near-F-Min für 28d-broad_reach
F_MAX_WEEKLY            = 10           # ab hier Dominanzmodus
F_OVERKILL_THRESHOLD    = 15           # ab hier Beratung empfehlen
IN_POOL_FACTOR          = 0.7          # Wastage: nur 70% der Impressions In-Pool
REACH_CURVE_K           = 0.25         # Saturation-Steilheit (Hofmans-Kurve)
LARGE_POOL_THRESHOLD    = 500_000      # Schwelle für Sprint-Override
REACH_PREMIUM_THRESHOLD = 1.4          # +40% Reach für Sprint/Toleranz-Trigger

CPM_DOOH                = 50           # CHF, blended Buchungspreis
CPM_DISPLAY             = 15           # CHF, blended Buchungspreis
DELIVERY_DOOH           = 0.75         # erwartete Deliveryquote DOOH
DELIVERY_DISPLAY        = 0.90         # erwartete Deliveryquote Display
OTS_DOOH                = 1.8          # Audience Contacts pro DOOH-Play
```

---

## 3. Formeln

### 3.1 Audience Contacts

```
contacts_dooh    = (budget × split.dooh    / CPM_DOOH    × 1000) × DELIVERY_DOOH    × OTS_DOOH
contacts_display = (budget × split.display / CPM_DISPLAY × 1000) × DELIVERY_DISPLAY
contacts_gross   = contacts_dooh + contacts_display
contacts_total   = contacts_gross × IN_POOL_FACTOR
```

**Wichtig:** OTS gewichtet die **Kontakte**, nicht den Reach. 1 DOOH-Play = 1.8 Audience Contacts. 1 Display-Impression = 1 Audience Contact. Reach (unique Personen) ist davon unberührt.

### 3.2 Channel-Splits nach Screen-Klasse

```
voll          : DOOH 70% / Display 30%   → blended CPM = CHF 39.50
begrenzt      : DOOH 50% / Display 50%   → blended CPM = CHF 32.50
display-dom   : DOOH 20% / Display 80%   → blended CPM = CHF 22.00
```

Die Klassifikation einer Region erfolgt in `lib/region-buchbarkeit.ts` aus Screen-Verfügbarkeit (politScreens, openooh-Daten).

### 3.3 Reach-Cap nach Pool-Grösse (Cap-Tiers)

| Pool (Stimmberechtigte) | L1 (Sichtbar) | L2 (Präsenz) | L3 (Dominanz) |
|---|---|---|---|
| < 50'000 | 22% | 45% | 65% |
| 50'000 – 200'000 | 12% | 22% | 38% |
| 200'000 – 500'000 | 6% | 12% | 21% |
| > 500'000 | 3% | 6% | 12% |

Die Cap-Tiers sind unabhängig von der Screen-Klasse. Screen-Klasse beeinflusst nur den Channel-Split (und damit Audience Contacts pro CHF), nicht den Reach-Cap.

### 3.4 Pool-Basis (Klärung in v3.4)

```
pool = region.stimm   # IMMER, unabhängig vom Regionstyp
```

Anwendung:
- Kanton Bern → 775'000 Stimmberechtigte (nicht ~1'000'000 Bevölkerung)
- Stadt Wädenswil → 16'000 Stimmberechtigte (nicht 22'900 Bevölkerung)
- Kleine Gemeinde Adliswil → 13'000 Stimmberechtigte (nicht 18'000 Bevölkerung)

Die Stimmberechtigten-Werte stammen aus dem VIO-Datensatz (BFS-Quelle, periodisch aktualisiert).

### 3.5 Unique Reach (Saturation)

```
pcap_share = getCap(stimm, level)              # nach Pool-Grösse und Cap-Level
pcap       = stimm × pcap_share                # absolute Pool-Cap
saturation = 1 − exp(−REACH_CURVE_K × contacts_total / pcap)
reach_raw  = pcap × saturation
reach      = min(reach_raw, stimm × MAX_REACH_CAP)   # MAX_REACH_CAP = 0.80
```

### 3.6 Frequenz

```
weeks       = laufzeit_days / 7
f_weekly    = contacts_total / (reach × weeks)
f_camp      = f_weekly × weeks                  # = contacts_total / reach
```

`f_weekly` ist die durchschnittliche Anzahl Audience Contacts pro erreichter Person pro Woche.

---

## 4. Laufzeitlogik

| Laufzeit | Funktion | Wann |
|---|---|---|
| **28 Tage** | Politik-Default | Standard rund um Entscheidungsfenster |
| **14 Tage** | konzentrierter Schlussimpuls | bei zu dünnem Budget für 28d ODER bei grossen Pools (>500k Stimmberechtigte) wo Konzentration deutlich mehr Reach bringt |
| **42 Tage** | Aufbau / Bekanntheit | bei hohem Budget, erklärungsbedürftigen Themen ODER wenn 42d deutlich mehr Reach liefert als 28d |

**Anker-Datum:** Wenn ein Abstimmungs- oder Wahldatum gesetzt ist, wird die Laufzeit rückwärts vom Termin gedacht:

- 14 Tage = letzte 2 Wochen vor Vote (Schlussimpuls)
- 28 Tage = Entscheidungsfenster (= ungefähr ab Stimmunterlagen-Versand)
- 42 Tage = Aufbau + Entscheidungsfenster

---

## 5. Optimizer-Reihenfolge v3.4

(unverändert ggü. v3.3 — nur Pool-Basis hat sich geändert)

Bei gegebenem Budget, Region(en) und Screen-Klasse iteriert der Optimizer durch folgende Schritte. **Erste passende Regel gewinnt.**

### Schritt 1 — 28d Hauptpfad

Berechne 28d für L1, L2, L3. Wenn mindestens ein Level f_weekly im Band [F_MIN_WEEKLY, F_MAX_WEEKLY] hat → wähle das mit max Reach. **Status:** `optimal_28d_standard`.

### Schritt 2 — 28d Toleranz

Wenn ein höheres Cap-Level mit f_weekly ∈ [F_MIN_TOLERANCE, F_MIN_WEEKLY) mindestens REACH_PREMIUM_THRESHOLD (= 40%) mehr Reach bringt als der Schritt-1-Kandidat → nimm das höhere Level. **Status:** `28d_broad_reach_low_frequency`.

### Schritt 3 — Sprint-Override (nur bei grossen Pools)

Wenn `pool > LARGE_POOL_THRESHOLD` UND 14d-Reach > 1.4 × 28d-Reach (beide in-Band) → wähle 14d. **Status:** `sprint_14d_grosser_pool`.

### Schritt 4 — Aufbau-Override 42d

Wenn 42d-Reach > 1.2 × 28d-Reach (beide in-Band) → wähle 42d. **Status:** `aufbau_42d_reach_premium`.

### Schritt 5 — 28d nicht erreichbar

Wenn keine 28d-Variante in-Band oder Toleranz → probiere 14d und 42d. Wähle Variante mit max Reach. **Status:** `sprint_14d_thin_budget` / `aufbau_42d_thin_budget` / `sprint_14d_28d_unavailable` / `aufbau_42d_28d_unavailable`.

### Schritt 6 — Dominanzmodus (Over-Frequency)

Wenn alle Kombinationen f_weekly > F_MAX → wähle die mit max Reach (Tie-Break: längste Laufzeit, dann tiefste f_weekly). **Status:** `dominanzmodus` (f_weekly ≤ F_OVERKILL_THRESHOLD) oder `dominanzmodus_stark` (f_weekly > F_OVERKILL_THRESHOLD).

### Schritt 7 — Too Thin

Wenn alle Kombinationen f_weekly < F_MIN_TOLERANCE → wähle die mit höchster f_weekly. **Status:** `too_thin`.

---

## 6. Status-Codes mit UI-Botschaften

(unverändert ggü. v3.3)

| Status-Code | UI-Tone | Botschaft |
|---|---|---|
| `optimal_28d_standard` | good | „Empfehlung für deine Kampagne. Die 28-tägige Laufzeit deckt das Entscheidungsfenster rund um den Versand der Stimmunterlagen ab." |
| `28d_broad_reach_low_frequency` | info | „Diese Empfehlung setzt stärker auf breite Sichtbarkeit über das politische Entscheidungsfenster. Die durchschnittliche Kontaktfrequenz liegt leicht unter dem Idealwert. Für mehr Wiederholung pro Person empfehlen wir ein etwas höheres Budget." |
| `sprint_14d_thin_budget` | info | „Konzentrierter Schlussimpuls über 14 Tage. Für volle 28-Tage-Präsenz wäre das Budget eher knapp." |
| `sprint_14d_grosser_pool` | info | „Bei grossen Regionen wirkt eine konzentrierte 2-Wochen-Phase rund um den Vote stärker als verteilte Auslieferung. Empfohlen: Schlussimpuls in den letzten 2 Wochen vor der Abstimmung." |
| `sprint_14d_28d_unavailable` | info | „14-Tage-Schlussimpuls — bei diesem Budget die wirkungsvollste Laufzeit." |
| `aufbau_42d_thin_budget` | info | „6 Wochen Aufbau — sinnvoll für komplexere Themen oder wenn Bekanntheit aufgebaut werden soll." |
| `aufbau_42d_reach_premium` | info | „6 Wochen Laufzeit lohnt sich hier: deutlich mehr Personen werden erreicht als bei 4 Wochen." |
| `aufbau_42d_28d_unavailable` | info | „Längere Laufzeit verteilt das Budget besser über das Entscheidungsfenster." |
| `dominanzmodus` | info | „Hohe Präsenz: jede erreichte Person sieht die Botschaft sehr oft. Zusätzliches Budget bringt in dieser Region kaum mehr Reichweite, aber stärkere Wiederholung." |
| `dominanzmodus_stark` | warn | „Sehr hohe Frequenz pro Person. Ab diesem Budget empfehlen wir ein persönliches Gespräch zur Optimierung — z.B. Region erweitern oder Budget gezielter einsetzen." |
| `too_thin` | warn | „Budget reicht in dieser Konstellation nicht für eine wirkungsvolle Kampagne. Empfehlung: Region verkleinern oder Budget erhöhen." |

**UI-Hinweis Politik (immer sichtbar im Politik-Flow):**
„Für politische Kampagnen ist die Phase rund um den Versand der Stimmunterlagen besonders relevant. Viele Personen setzen sich dann konkret mit der Abstimmung oder Wahl auseinander."

---

## 7. Soll-Tabelle v3.4 (Validierungs-Spec)

Diese Tabelle ist die **fachliche Validierungs-Spec**: jede Zeile ist ein Soll-Wert, gegen den die Implementation zu testen ist. Toleranz: ±2% auf Reach/Frequenz wegen Rundung.

**Pool-Basis: alle Werte mit `pool = region.stimm`.**

### Archetyp A — Kanton Zug (Pool 85'000 Stimmberechtigte, Klasse Voll)

| Budget | Tage | Lvl | Reach | Reach % | f_camp | f_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 14 | L2 | 14'002 | 16.5% | 7.4× | 3.7× | `sprint_14d_thin_budget` |
| 6'000 | 28 | L1 | 9'971 | 11.7% | 15.5× | 3.9× | `optimal_28d_standard` |
| 8'000 | 28 | L2 | 17'519 | 20.6% | 11.8× | 2.9× | `28d_broad_reach_low_frequency` |
| 12'000 | 28 | L2 | 18'403 | 21.7% | 16.8× | 4.2× | `optimal_28d_standard` |
| 20'000 | 28 | L3 | 31'707 | 37.3% | 16.3× | 4.1× | `optimal_28d_standard` |
| 30'000 | 28 | L3 | 32'220 | 37.9% | 24.1× | 6.0× | `optimal_28d_standard` |

*Werte identisch zu v3.3 — Pool für Zug unverändert.*

### Archetyp B — Kanton Bern (Pool 775'000 Stimmberechtigte, Klasse Voll)

| Budget | Tage | Lvl | Reach | Reach % | f_camp | f_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 14 | L1 | 15'595 | 2.0% | 6.6× | 3.3× | `sprint_14d_thin_budget` |
| 6'000 | 14 | L1 | 18'858 | 2.4% | 8.2× | 4.1× | `sprint_14d_thin_budget` |
| 8'000 | 14 | L2 | 31'190 | 4.0% | 6.6× | 3.3× | `sprint_14d_thin_budget` |
| 12'000 | 14 | L2 | 37'715 | 4.9% | 8.2× | 4.1× | `sprint_14d_grosser_pool` |
| 20'000 | 14 | L3 | 69'806 | 9.0% | 7.4× | 3.7× | `sprint_14d_grosser_pool` |
| 30'000 | 14 | L3 | 81'417 | 10.5% | 9.5× | 4.8× | `sprint_14d_grosser_pool` |

*Pool von 800'000 (v3.3) auf 775'000 (echte Stimmberechtigte) korrigiert. Reach-Werte ca. 2% tiefer.*

### Archetyp C — Stadt Wädenswil (Pool 16'000 Stimmberechtigte, Klasse Display-dominant)

| Budget | Tage | Lvl | Reach | Reach % | f_camp | f_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 28 | L3 | 10'114 | 63.2% | 14.8× | 3.7× | `optimal_28d_standard` |
| 6'000 | 28 | L3 | 10'353 | 64.7% | 21.7× | 5.4× | `optimal_28d_standard` |
| 8'000 | 28 | L3 | 10'392 | 65.0% | 28.8× | 7.2× | `optimal_28d_standard` |
| 12'000 | 42 | L3 | 10'400 | 65.0% | 43.1× | 7.2× | `aufbau_42d_thin_budget` |
| 20'000 | 42 | L3 | 10'400 | 65.0% | 71.9× | 12.0× | `dominanzmodus` |
| 30'000 | 42 | L3 | 10'400 | 65.0% | 107.8× | 18.0× | `dominanzmodus_stark` |

*Pool von 22'000 (v3.3, fälschlich Bevölkerungs-Pool) auf 16'000 (echte Stimmberechtigte) korrigiert. Plateau bei 10'400 (= 65% × 16'000). Dominanzmodus tritt jetzt schon bei 20'000 auf statt erst bei 30'000.*

### Archetyp D — Stadt Adliswil (Pool 13'000 Stimmberechtigte, Klasse Begrenzt)

| Budget | Tage | Lvl | Reach | Reach % | f_camp | f_weekly | Status |
|---|---|---|---|---|---|---|---|
| 4'000 | 28 | L3 | 8'220 | 63.2% | 14.8× | 3.7× | `optimal_28d_standard` |
| 6'000 | 28 | L3 | 8'412 | 64.7% | 21.7× | 5.4× | `optimal_28d_standard` |
| 8'000 | 28 | L3 | 8'444 | 65.0% | 28.8× | 7.2× | `optimal_28d_standard` |
| 12'000 | 42 | L3 | 8'450 | 65.0% | 43.2× | 7.2× | `aufbau_42d_thin_budget` |
| 20'000 | 42 | L3 | 8'450 | 65.0% | 72.1× | 12.0× | `dominanzmodus` |
| 30'000 | 42 | L3 | 8'450 | 65.0% | 108.1× | 18.0× | `dominanzmodus_stark` |

*Pool von 14'000 (v3.3) auf 13'000 (echte Stimmberechtigte) korrigiert. Plateau bei 8'450 (= 65% × 13'000).*

---

## 8. Offene Validierung

Die folgenden Annahmen sind **mock-kalibriert** und müssen mit echten Splicky-Liefer- und Kampagnendaten validiert und ggf. angepasst werden, sobald die ersten 10–20 Live-Kampagnen ausgeliefert sind.

| Parameter | Wert v3.4 | Status | Validierung über |
|---|---|---|---|
| `REACH_CURVE_K` | 0.25 | Annahme | Splicky-Reach-Reports vs. tatsächliche Reichweite je Kampagne |
| `IN_POOL_FACTOR` | 0.7 | Annahme | Geo-Audience-Daten (Splicky / GfK Schweiz / Standortdaten) |
| `OTS_DOOH` | 1.8 | Annahme | OpenOOH-Standard, Publisher-spezifische OTS-Daten |
| `DELIVERY_DOOH` | 0.75 | Annahme | Splicky-Liefer-Reports |
| `DELIVERY_DISPLAY` | 0.90 | Annahme | Splicky / Display-Programmatic Reports |
| **Cap-Tiers** (alle 12 Werte) | siehe 3.3 | mock-kalibriert | Reach-Plateaus aus echten Multi-Region-Kampagnen |
| **Pool-Werte** | aus Datensatz | aktuell | Periodische BFS-Aktualisierung der Stimmberechtigten-Zahlen |
| `F_MIN_WEEKLY = 3` | 3 | etabliert | Krugman 1972, ARF Effective-Frequency-Studien — fachlicher Konsens |
| `F_MAX_WEEKLY = 10` | 10 | Annahme | Wear-out-Studien DOOH (Posterscope, Outsmart) — Validierung über User-Feedback und Brand-Lift-Studien |

**Verantwortung Kalibrierung:** Dani (Delivery/Ausspielung) — nach den ersten 10 Live-Kampagnen.

**Versionierung:** Jede Anpassung von Konstanten oder Optimizer-Regeln führt zu einer neuen Spec-Version (v3.5, v3.6, …). Code in `lib/preislogik.ts` muss die Version im Header mitführen.

---

## 9. Changelog v3.3 → v3.4

**Was sich geändert hat:**
- Pool-Definition vereinheitlicht: `pool = region.stimm` für alle Regionstypen. Vorher hatte v3.3 implizit für Städte einen Bevölkerungs-Pool angesetzt (Wädenswil 22k = pop, Adliswil 14k inflated), was zu Inkonsistenz zwischen Stadt und Kanton geführt hätte.
- Soll-Tabelle Sektion 7 komplett neu gerechnet mit echten Stimmberechtigten-Werten aus dem VIO-Datensatz:
  - Zug: 85'000 (unverändert)
  - Bern: 800'000 → 775'000
  - Wädenswil: 22'000 → 16'000
  - Adliswil: 14'000 → 13'000
- Neue Sektion 3.4: explizite Klärung der Pool-Basis.

**Was unverändert bleibt:**
- Alle Konstanten (F_MIN, F_MAX, K, IN_POOL_FACTOR, etc.)
- Alle Formeln (3.1, 3.2, 3.3, 3.5, 3.6)
- Alle Optimizer-Schritte (Sektion 5)
- Alle Status-Codes und UI-Botschaften (Sektion 6)

**Konsequenz für Phase 3 (Code-Implementation):**
- `lib/preislogik.ts` muss `pool = region.stimm` für alle Regionstypen verwenden (nicht `region.pop` für Städte)
- Heutige Code-Plateaus 10'400 (Wädenswil) und 8'450 (Adliswil) sind mit v3.4 korrekt — die Code-Pool-Basis ist bereits richtig (`stimm`), nur K und IN_POOL_FACTOR fehlen noch.

---

**Ende der Spec v3.4.**
