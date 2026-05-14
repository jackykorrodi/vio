> CONTEXT.md ist KEIN Default.
> Nur lesen wenn:
> - Logik unklar
> - Flow unklar
> - mehrere Dateien betroffen


# VIO – Projekt Context für Claude Code

> Diese Datei ist die Single Source of Truth für Claude Code.
> Vor jedem grösseren Task lesen. Nach jedem abgeschlossenen Task updaten.

## Stack

### Frontend & Hosting
- Next.js + Tailwind v4, Vercel (Auto-Deploy via GitHub: jackykorrodi/vio) — auch für Live
- Design: Violet #6B4FBB, Ink #2D1F52, Plus Jakarta Sans + Jost

### Self-Hosted Services (Coolify auf Hetzner Zürich)
- Umami (Analytics, DSGVO-konform)
- n8n (Workflow Engine / Automationen)

### APIs & Services
- Pipedrive (CRM — ersetzt HubSpot, noch nicht integriert)
- Resend (E-Mail, Domain: vio.ch — auch für Abandon-Flow Emails)
- Firecrawl + Gemini 2.5 Flash (URL-Analyse)
- AWS S3 Zürich (Werbemittel-Uploads + Offerte PDFs, Presigned URLs) — post Go-Live
- Splicky/Adform (DSP — Dashboard-Daten per Email-Drop oder API)
- Templated.io (Ad Creator V2 — ersetzt custom Ad Creator langfristig)
- Bexio (Buchhaltung CH — post Go-Live)

## Drei Flows
- **Politik** (5 Steps): Region → Budget/Pakete → Werbemittel → Abschluss → Bestätigung
- **B2B** (5 Steps): Zielgruppe → Budget → Werbemittel → Abschluss → Bestätigung
- **B2C** (7 Steps, deprioritisiert): URL → Analyse → Zielgruppe → Budget → Werbemittel → Abschluss → Bestätigung

## Flow-Details

### Gemeinsame Logik (alle Flows)
- State lebt im BriefingData-Objekt im React-State — kein Backend bis zum Abschluss-Step
- SessionId (UUID) wird generiert wenn User Werbemittel-Step erreicht
- Abschluss → POST /api/submit-briefing → HubSpot Contact + Deal + Resend E-Mail an User + intern
- Budget > CHF 15k: Calendly-Link wird automatisch in E-Mail eingefügt

### Politik Flow — Komponenten
1. Step2Politik → Region, Abstimmungstyp, Wahldatum
2. StepPackages (campaign/) → Pakete Sichtbar/Präsenz/Dominanz
3. Step5Creative → Step5AdCreator → Werbemittel
4. Step6Contact → Kontaktdaten + Abschluss
5. Step7Confirmation → Bestätigung

### B2B Flow — Komponenten
1. Step1B2B → Branche, Region, Unternehmensgrösse
2. Step4Budget (steps/) → Budget + Reichweite in Firmen/Mitarbeiter
3. Step5Creative → Step5AdCreator → Werbemittel
4. Step6Contact → Kontaktdaten + Abschluss
5. Step7Confirmation → Bestätigung

### B2C Flow — Komponenten
1. Inline URL-Input in B2CFlow.tsx (Tech-Debt: sollte eigene Komponente sein)
2. Step2Analysis → Firecrawl + Gemini Analyse (POST /api/analyze-url)
3. Step3Audience → Zielgruppe prüfen/anpassen
4. Step4Budget (steps/) → Budget + Reichweite
5. Step5Creative → Step5AdCreator → Werbemittel
6. Step6Contact → Kontaktdaten + Abschluss
7. Step7Confirmation → Bestätigung

### Step8Dashboard
- Ist ein Feedback-Formular nach Buchung (POST /api/feedback)
- In B2B + B2C als Step 6/8 vorhanden aber nicht im Stepper sichtbar
- Nutzt altes Farb-System (Terracotta) — vor Aktivierung auf VIO Design-System updaten
- Status: Vorhanden, nicht aktiv promoted, kein Go-Live Blocker


## Preislogik (vereinfacht)

**Aktuelle Logik-Version: v3.5.1 Single Source of Truth (13.05.2026)**

- Min Budget: CHF 4'000
- Pakete: Sichtbar / Präsenz / Dominanz
- Reach basiert auf Hofmans-Saturation (asymptotisch, kein hartes Capping)
- Frequenz emergent: f_campaign = contacts / unique_reach
- Sweet Spot: calculateSweetSpot(regions, laufzeitDays) → Cap-Level-2-Pool × 4.5×/Wo → CHF-Zielwert (85% des Sättigungsbudgets); gibt null zurück wenn Sättigungsbudget zu nah am B_MIN; nudge_to_sweet_spot nur wenn Budget < 85% des Sweet Spots UND cappedByRegion === false (nur Pfad A)
- Berechnung: siehe vio-regelkatalog-politik-v3-5-1.md (Single Source of Truth)

### Einkauf-Modell
- EK CHF 25 DOOH / CHF 5 Display sind Preise gegenüber Operating-Partner (nicht Splicky-Rohpreis)
- Partner übernimmt: Splicky-Setup, Screen-Auswahl, Monitoring, Freigabe-Koordination
- Splicky-Rohpreise können tiefer liegen — Delta ist Partner-Marge, VIO-irrelevant
- VIO-Marge 51.9% ist netto nach Partner-Fee gerechnet

### Konstanten (v3.5.1)
| Konstante | Wert | Hinweis |
|---|---|---|
| F_MIN_WEEKLY | 3 | Krugman-Schwelle (war 2.5) |
| F_MAX_WEEKLY | 10 | Wearout-Grenze |
| DOOH_OTS_MULTIPLIER | 1.8 | Audience Contacts pro Ad Play |
| REACH_CURVE_K | 0.25 | Hofmans-Saturation Steilheit (war 0.4) |
| IN_POOL_FACTOR | 0.7 | Anteil Kontakte die Pool treffen (NEU v3.4) |
| WEAROUT_FLOOR | 0.70 | Minimaler Wearout-Faktor |
| CPM_DOOH | 50 | unverändert |
| CPM_DISPLAY | 15 | unverändert |

Deklariert, noch nicht aktiv: F_MIN_TOLERANCE=2.7, F_OVERKILL_THRESHOLD=15, LARGE_POOL_THRESHOLD=500_000, REACH_PREMIUM_THRESHOLD=1.4

### Pakete (Politik + B2B identisch)
| Paket | Frequenz | Laufzeit | Min-Budget |
|---|---|---|---|
| Sichtbar | 3× | 14 Tage | CHF 4'000 |
| Präsenz  | 5× | 28 Tage | CHF 6'000 |
| Dominanz | 6× | 42 Tage | CHF 9'000 |

### Tiered Reach Caps (v2.3 — +50% zu v2.2)
| Stimmberechtigte | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| < 50'000 | 22% | 45% | 65% |
| 50–200k | 12% | 22% | 38% |
| 200–500k | 6% | 12% | 21% |
| > 500k | 3% | 6% | 12% |

### Decision Log
| Datum | Version | Änderungen |
|---|---|---|
| 14.05.2026 | v3.5.1 (Doku-Korrektur) | **§5.5 Wearout-Schwellen an produktiven Code angeglichen** (weeks ≤ 8 → 1.0, slope −0.03/W, Floor bei ~18 W). Klärungs-Block (a/b/c) entfernt, da Code-Reading von `applyWearoutFactor` in `lib/preislogik.ts` Verhalten eindeutig bestätigt: Funktion ist aktiv, wird in `computeCombo` (Z. 399) und `calculateImpact` (Z. 575) jeweils nach Cap-Clamp multiplikativ angewendet, nicht neutralisiert. KEINE Code-Änderung. KEINE Änderung der §11 Referenzwerte. Sandbox bleibt 72/72 grün. Spec↔Code-Drift war einseitig in der Spec; Code + Soll-Werte waren bereits konsistent. Versionsnummer bleibt v3.5.1 — `documentation correction`, keine `logic revision`. Begründung des Code-Verhaltens: Wearout-Decay greift erst nach Entscheidungsfenster (>8 W); kurzfristige Überpräsenz wird über Frequenz-Limits (`F_MAX_WEEKLY`, `F_OVERKILL_THRESHOLD`) modelliert. Ausnahme von Header-PRECEDENCE-Regel in diesem Einzelfall durch validierten Stand (Code + §11) gerechtfertigt. |
| 13.05.2026 | v3.5.1 | **Promotion v3.5.1-rc1 → v3.5.1 (final). Single Source of Truth.** Gating-Kriterien erfüllt: (1) Sandbox 72/72 grün (24 Spec-Tier 1 + 48 Snapshot-Tier 2 über 12 Cluster-Repräsentanten), (2) Terminologie-Drifts migriert (reachMitte/reachVon/reachBis/weeklyFreq → kanonische Terms), (3) overkill_frequency bleibt als Transitional-Hint für Pfad B (kein Promotion-Blocker, wird in Pfad-B-Implementation durch qualityStatus=high_frequency ersetzt), (4) Wearout-Verhalten §5.5 dokumentiert mit Klärungs-Block (Smoke-Test 2026-05-13 bestätigt: Plateau-Cases zeigen keinen sichtbaren Wearout-Decay), definitive Klärung in v3.5.2. v3.4 deprecated. CLAUDE.md aktualisiert. |
| 12.05.2026 | v3.5.1-rc1 | Release Candidate für neue Single Source of Truth. NICHT produktiv. v3.4 bleibt aktiv bis RC-Promotion. Drift-Audit: 3 Terminologie-Drifts (reachMitte, reachVon/reachBis, weeklyFreq) + 1 obsoleter HinweisCode (overkill_frequency) als Promotion-Blocker dokumentiert. Wearout-Verhalten §5.5 ungeklärt (applyWearoutFactor existiert, Soll-Werte §11 zeigen aber keine Wearout-Multiplikation). Promotion nach: (1) §11 Sandbox 24/24 green ±2%, (2) Wearout-Klärung, (3) 3 Drifts migriert, (4) overkill_frequency entfernt. Bei Fail entsteht rc2. Drift-Audit dokumentiert in public/v3-5-1-rc1-drift-audit.md. |
| 11.05.2026 | v3.4d | Bug-Fix: StepPackages zeitraumDates zeigte vergangenheitliche Kampagnendaten wenn Briefwahl-Fenster (vote−28 bis vote−28−laufzeit) bereits vergangen. Fallback: start=today+10, end=start+effectiveDays (MIN_SETUP_DAYS=10). Offene Inkonsistenz: StepSummaryPolitik.calcCampaignDates verwendet endISO=votingDate (nicht vote−28) — noch nicht behoben. |
| 07.05.2026 | v3.4c | Bug-Fix: buildPackages.buildOne Budget-Rücklösung `* 0.7` → `/ IN_POOL_FACTOR` (Pricing-Korrektur für grosse Regionen). StepPackages Pfad-B-Indikator auf mode='paketLevel' umgestellt (Indikator zeigt jetzt Paket-konforme Werte). Pfad-A-State (Budget/Laufzeit) wird bei Tab-Wechsel A↔B korrekt gespeichert und wiederhergestellt. |
| 07.05.2026 | v3.4b | Optimizer + Status-Codes: 7-Schritt-Optimizer (optimizeForBudget), 11 neue HinweisCode-Werte (optimal_28d_standard, sprint_14d_*, aufbau_42d_*, dominanzmodus*, too_thin, 28d_broad_reach_low_frequency). Alte Codes entfernt (capped_by_region, screen_class_*, nudge_to_sweet_spot, sweet_spot, no_dooh_inventory). UI-Botschaften in CampaignHint.tsx und StepPackages.tsx migriert. Sandbox Status-Diff aktiv. |
| 07.05.2026 | v3.4 | Konstanten-Phase: REACH_CURVE_K 0.4→0.25; IN_POOL_FACTOR=0.7 eingeführt (auf impressionsEffective); F_MIN_WEEKLY 2.5→3; 4 neue Konstanten deklariert (F_MIN_TOLERANCE, F_OVERKILL_THRESHOLD, LARGE_POOL_THRESHOLD, REACH_PREMIUM_THRESHOLD) |
| 04.05.2026 | v2.3 | Hofmans-Saturation (ersetzt lineares Capping); Frequenz emergent (F_REC_WEEKLY entfernt); OTS 2.0→1.8; F_MIN_WEEKLY 3→2.5; Wearout-Floor 0.80→0.70; REACH_CURVE_K=0.4 (NEU); Reach-Caps +50%; Multi-Region-Klasse aus aggregiertem politScreens_total; daily_below_floor_region pro Region (NEU); Laufzeit-Korridor maxDays 35→42 bei Budget <15k; Sweet Spot Logik: calculateSweetSpot() + nudge_to_sweet_spot Hint (NEU) |
| 22.04.2026 | v2.2 | Initiale Version (F_REC_WEEKLY=5, linearer Reach, hartes Capping) |

### Kampagnen-Timing Politik
- CAMPAIGN_END_OFFSET_DAYS = 0 → alle Pakete enden am Abstimmungstag
- Laufzeit rückwärts vom Vote: 2 / 4 / 6 Wochen
- Setup-Puffer 10 Tage (DOOH-Freigabe ca. 7 Werktage)
- `DOOH_CUTOFF_DAYS = 10` — operativer Supply Constraint: DOOH-Freigabe nicht mehr möglich
- `DISPLAY_SPRINT_SWITCH_DAYS = 24` — Produkt-Switch: `daysUntilVote < 24` → Display Sprint Mode
  - `buildDisplaySprint(budget, stimmTotal)` → 7 Tage Display-only
  - Formel: `impressions = budget / CPM_DISPLAY * 1000`; `uniqueReach = impressions * 0.35`; `cappedReach = min(uniqueReach, stimmTotal * 0.40)`; `reachVon/Bis = round500(cappedReach × 0.85/1.15)`
  - In StepPackages: Amber-Banner + Einzelkarte ersetzt Pfad-A/B + Wirkungsindikator

### Datums-Gating Step 1 Politik
- < 10 Tage: Hard Block (Weiter disabled)
- 10–23 Tage: Warning
- 24–37 Tage: Info (Präsenz nicht mehr machbar)
- ≥ 38 Tage: kein Hinweis

### Empfehlungssystem (Variante B)
- Präsenz immer Default-Empfehlung
- Dominanz wird nie automatisch empfohlen
- Schwellen: ≥ 38 Tage → Präsenz, < 38 Tage → Sichtbar

### Backlog
- **Glossar definieren** (`docs/glossary.md`): einheitliches Otto-Vokabular für Reichweite, Stimmberechtigte erreicht, Jede Person sieht es, Sweet Spot, Zeitraum, Kanal-Mix etc. Anschliessend Cross-Flow-Sync-Pass über Politik + B2B Steps 1–5.
- **RC-3: laufzeitDays-Rundung** — Step 2 schreibt `Math.round(impact.laufzeitDays / 7)` in `briefing.laufzeit`, Step 3 multipliziert × 7. Bei Optimizer-Werten ≠ 7-Vielfache Rundungsverlust möglich.
- **RC-4: 1-Tag-Versatz Start-Datum** — Step 2 `zeitraumDates` vs. Step 3 `calcCampaignDates` mit today-Fallback. Konsolidierung pending.
- **Architektur-Refactor** — Step 2 serialisiert finalen `impactSnapshot` ins briefing, Step 3 rendert nur. Eliminiert ganze Klasse von State-Drift-Bugs.
- **Legacy** — `buildVioPackagesV2` + `briefing.vioPackages.finalBudget` — toter Pfad, Quelle des 5000-Fallbacks in RC-1. Bei Architektur-Refactor entfernen.

