# VIO Glossary — LLM / Technical Reference
# Version: 1.0 | Stand: 2026-05-14
# Konsumenten: Claude Code, Prompt-Kontext, Spec-Alignment
# Scope: Feldnamen, UI-Labels, Status-Codes, Pakete, Region-Klassen, Deprecated Terms
# Menschliche Version: /docs/glossary.md (Phase 2, abgeleitet aus dieser Datei)
# Business-Schwellen (Budgets, Frequenz-Ranges): ausschliesslich in public/vio-regelkatalog-politik-v3-6.md (SPEC_VERSION 3.7)

---

## 0. Canonical Naming Rules

- Code-Felder: camelCase (`reachUniqueAbs`, `frequencyWeekly`)
- Status-Codes: snake_case (`optimal_28d_standard`, `too_thin`)
- UI-Labels: Deutsch, Grossschreibung bei Eigennamen (Sichtbar, Präsenz, Dominanz)
- Keine englischen Reach-Begriffe im UI (`Unique Reach`, `Net Reach` → verboten)
- Keine Legacy-Kurzformen in Code oder Spec (`freq`, `reach_abs`, `sweetspot`, etc.)

---

## 1. Metriken & Feldnamen

| Code (camelCase)  | UI-Label DE         | Einheit            | Nicht verwenden                      |
|-------------------|---------------------|--------------------|--------------------------------------|
| reachUniqueAbs    | Reichweite          | Personen (absolut) | Unique Reach, Netto-Reach, reach_abs |
| reachUniqueLow    | Reichweite (tief)   | Personen           | reach_low, minReach                  |
| reachUniqueHigh   | Reichweite (hoch)   | Personen           | reach_high, maxReach                 |
| frequencyWeekly   | Frequenz / Woche    | Kontakte/Woche     | freq_w, weekly_freq, OTS/Woche       |
| frequencyCampaign | Frequenz total      | Kontakte/Kampagne  | freq_total, campaign_freq            |
| pool              | Stimmberechtigte    | Personen           | Bevölkerung, pop (nur UI-Kontext)    |
| daysUntilVote     | Tage bis Abstimmung | Tage               | days_left, remaining_days            |

**Regeln:**

CRITICAL:
- Alle Preislogik basiert auf `region.stimm` (= `pool`) — immer, unabhängig vom Regionstyp
- `region.pop` ist niemals Optimierungsgrundlage, nur UI-Kontextwert

- User-facing Reach wird als Bereich kommuniziert (`reachUniqueLow–reachUniqueHigh`), Präfix «ca.» oder «~» ist Pflicht
- Interne QA-, Sandbox- und CSV-Outputs dürfen Punktwerte (`reachUniqueAbs`) verwenden

---

## 2. Pakete

| Code     | UI-Label | Min-Budget         | Laufzeit |
|----------|----------|--------------------|----------|
| sichtbar | Sichtbar | siehe Regelkatalog | 14 Tage  |
| praesenz | Präsenz  | siehe Regelkatalog | 28 Tage  |
| dominanz | Dominanz | siehe Regelkatalog | 42 Tage  |

**Regeln:**
- Budget-Schwellen und Frequenz-Ranges werden ausschliesslich im Regelkatalog definiert (`public/vio-regelkatalog-politik-v3-6.md (SPEC_VERSION 3.7)`)
- Default-Empfehlung: Präsenz
- UI zeigt nie CHF/CPM-Werte direkt

---

## 3. Pfad-A Status-Codes (`optimizeForBudget`)

| Status-Code                   | Bedeutung (intern)                          | UI-Hinweis-Typ |
|-------------------------------|---------------------------------------------|----------------|
| optimal_28d_standard          | 28d-Empfehlung, Budget passt gut            | positiv        |
| dominanzmodus                 | Hohe Frequenz, Dominanz-Schwelle erreicht   | informativ     |
| dominanzmodus_stark           | Sehr hohe Frequenz, deutlich über Threshold | Warnung        |
| too_thin                      | Budget reicht für keine sinnvolle Kampagne  | Fehler/Block   |
| sprint_14d_thin_budget        | 14d wegen Budget-Limit                      | informativ     |
| sprint_14d_grosser_pool       | 14d wegen grossem Pool (zu teuer für 28d)   | informativ     |
| sprint_14d_28d_unavailable    | 28d/42d nicht buchbar, Fallback 14d         | informativ     |
| aufbau_42d_thin_budget        | 42d wegen dünnem Budget gewählt             | informativ     |
| aufbau_42d_reach_premium      | 42d für Reach-Aufbau bei grossem Pool       | informativ     |
| aufbau_42d_28d_unavailable    | 28d nicht buchbar, Fallback 42d             | informativ     |
| 28d_broad_reach_low_frequency | 28d mit breiter Reach, tiefer Frequenz      | informativ     |

---

## 4. Pfad-B Status-Dimensionen (Spec-only, noch nicht implementiert)

**Keine produktive UI verwendet diese Dimensionen aktuell.**
Implementierung erfolgt nach §12 Soll-Tabelle. Bestehende Flows nicht auf Basis dieser Dimensionen umbauen.

| Dimension     | Mögliche Werte                                        |
|---------------|-------------------------------------------------------|
| deliveryMode  | `dooh_display`, `display_only`, `dooh_only`           |
| availability  | `full`, `limited`, `unavailable`                      |
| qualityStatus | `standard`, `high_frequency`, `low_frequency`, `thin` |
| contextFlag   | `timing_tight`, `timing_ok`, `timing_ideal`, `none`   |

**Timing-Constraint Display-Only (geplant, nicht implementiert):**
- Wenn `daysUntilVote < DOOH_MIN_TIMING_DAYS` → `deliveryMode = 'display_only'`, unabhängig von Region-Klasse
- Schwellenwert `DOOH_MIN_TIMING_DAYS` noch zu definieren (Kandidat: 14 Tage)
- Aktuell gilt Hard Block bei `daysUntilVote < 10` (Step1Politik) — Display-Only bräuchte einen zweiten, höheren Schwellenwert
- Heimat: `optimizeForBudget()` oder `calculateImpact()` in `lib/preislogik.ts`

---

## 5. Region-Klassen (`lib/region-buchbarkeit.ts`)

| Code (canonical) | UI-Exposure | Bedeutung                             |
|------------------|-------------|---------------------------------------|
| voll             | —           | Standard DOOH + Display buchbar       |
| begrenzt         | —           | DOOH eingeschränkt, Display ergänzend |
| display-dominant | —           | Kein Standard-DOOH, Display-dominiert |

**Regeln:**
- Canonical Code-Begriff: `display-dominant` (Enum in `lib/region-buchbarkeit.ts`)
- `display-dom` ist nur informelle Kurzform in Diskussionen — nie in Code oder Spec verwenden
- Region-Klassen sind intern — kein UI-Exposure
- 4 permanent ausgeschlossene Gemeinden (keine Standard-Screens): Küsnacht, Martigny, Opfikon, Veyrier

---

## 6. Flow-Begriffe

| Begriff     | Verwendung                   | Nicht verwenden                |
|-------------|------------------------------|--------------------------------|
| Abstimmung  | Politischer Anlass (Politik) | Vote, Voting, Wahl (generisch) |
| Region      | Geografische Einheit         | Gebiet, Ort, Zone              |
| Werbemittel | Kreativ-Assets               | Creative, Banner, Ad           |
| Laufzeit    | Kampagnendauer in Tagen      | Dauer, Zeitraum, Runtime       |
| Budget      | Vom User definierter Betrag  | Spend, Investment, Kosten      |

---

## 7. Deprecated — Nicht mehr verwenden

| Begriff / Code       | Ersetzt durch                       | Entfernt in        | Grund                                               |
|----------------------|-------------------------------------|--------------------|-----------------------------------------------------|
| reach_abs            | reachUniqueAbs                      | v3.5               | Kurzform, nicht kanonisch                           |
| overkill_frequency   | qualityStatus = high_frequency      | v3.5.x (Pfad B)    | Negative Konnotation, ersetzt durch Statusdimension |
| sweet_spot           | optimal_28d_standard                | v3.4               | Vage, nicht deterministisch                         |
| nudge_to_sweet_spot  | — (entfernt)                        | v3.4               | UI-Logik gehört nicht in Statuscode                 |
| capped_by_region     | Reach-Cap via MAX_REACH_CAP         | v3.4               | Intern, nie UI-relevant                             |
| screen_class_limited | display-dominant / begrenzt         | v3.5               | Umbenannt                                           |
| Unique Reach         | Reichweite / reachUniqueAbs         | v3.5               | Englisch, nicht konsistent                          |
| Netto-Reach          | Reichweite                          | v3.5               | Legacy-Begriff                                      |
| display-dom          | display-dominant                    | —                  | Informelle Kurzform — nie in Code oder Spec         |
| Pfad A / Pfad B      | — (nur interne Architektur)         | —                  | Nie im UI verwenden                                 |
| display_only_timing  | deliveryMode = 'display_only'       | — (noch geplant)   | Timing-basierter Display-Only-Fallback; Implementierung ausstehend |
