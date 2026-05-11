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

**Aktuelle Logik-Version: v3.4 Konstanten-Phase (07.05.2026)**

- Min Budget: CHF 4'000
- Pakete: Sichtbar / Präsenz / Dominanz
- Reach basiert auf Hofmans-Saturation (asymptotisch, kein hartes Capping)
- Frequenz emergent: f_campaign = contacts / unique_reach
- Sweet Spot: calculateSweetSpot(regions, laufzeitDays) → Cap-Level-2-Pool × 4.5×/Wo → CHF-Zielwert (85% des Sättigungsbudgets); gibt null zurück wenn Sättigungsbudget zu nah am B_MIN; nudge_to_sweet_spot nur wenn Budget < 85% des Sweet Spots UND cappedByRegion === false (nur Pfad A)
- Berechnung: siehe vio-regelkatalog-politik-v3-4.md (v2.3)

### Einkauf-Modell
- EK CHF 25 DOOH / CHF 5 Display sind Preise gegenüber Operating-Partner (nicht Splicky-Rohpreis)
- Partner übernimmt: Splicky-Setup, Screen-Auswahl, Monitoring, Freigabe-Koordination
- Splicky-Rohpreise können tiefer liegen — Delta ist Partner-Marge, VIO-irrelevant
- VIO-Marge 51.9% ist netto nach Partner-Fee gerechnet

### Konstanten (v3.4)
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

### Datums-Gating Step 1 Politik
- < 10 Tage: Hard Block (Weiter disabled)
- 10–23 Tage: Warning
- 24–37 Tage: Info (Präsenz nicht mehr machbar)
- ≥ 38 Tage: kein Hinweis

### Empfehlungssystem (Variante B)
- Präsenz immer Default-Empfehlung
- Dominanz wird nie automatisch empfohlen
- Schwellen: ≥ 38 Tage → Präsenz, < 38 Tage → Sichtbar

