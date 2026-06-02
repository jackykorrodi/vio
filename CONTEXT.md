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

### Supabase
- `lib/supabase.ts` — exportiert `supabase` (createClient-Instance, anon key, RLS aktiv)
- Env-Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Save & Resume Infrastruktur (26.05.2026)
- `app/konfigurator/page.tsx` — Server Component; leitet `GET /konfigurator?resume={UUID}` → `/campaign?type=politik&resume={UUID}` weiter (ohne Param → `/campaign?type=politik`)
- `app/api/save-progress/route.ts` — POST-Proxy zu n8n-Webhook; server-only Env-Var `N8N_SAVE_PROGRESS_WEBHOOK_URL`
- Partner-Resume-Links: `https://joinvio.ch/konfigurator?resume={UUID}`
- Env-Vars: `N8N_SAVE_PROGRESS_WEBHOOK_URL` (kein NEXT_PUBLIC_-Prefix)

### Save & Resume — PolitikFlow Integration (26.05.2026)
- `components/shared/SaveOverlay.tsx` — Modal: Email-Input → POST /api/save-progress → Success-State; inline styles, VIO-Design
- `components/flows/PolitikFlow.tsx` — Inaktivitäts-Timer (90s ab Step 2), Cooldown 300s nach manuellem Close, Save-Icon in Nav (Diskette SVG, sichtbar ab Step >= 2)
- `app/campaign/CampaignFlow.tsx` — `resumeId` (raw UUID-String) als eigene Prop an PolitikFlow; koexistiert mit bestehendem `resumeData`-Prop (base64-JSON-Pfad)
- Resume via Supabase: `user_states.state_data` → BriefingData restore; Fehler abgefangen, Flow startet normal
- Save-Payload: `{ email, flow, currentStep, selectedRegions, votingDate, politikType, selectedPackage, budget, laufzeit }` — keine Bild-Daten
- Email nach Save in `briefing.email` übernommen (Prefill Step 5)

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


## Kampagnen-Dashboard

**Architektur-Entscheid:** Ein Token, eine persistente URL `/dashboard/[token]` deckt den gesamten Kampagnen-Lebenszyklus ab: Werbemittel → Pre-Live → Live → Post. Die Phase wird serverseitig per Token-Lookup bestimmt — nicht per URL-Segment.

**Visueller Prototyp:** `docs/prototypes/dashboard-v1.html` — verbindliche Source-of-Truth für Layout, Farben, Strings, Mikrocopy.

**Phase-Switching (Dev-only):** `?preview=werbemittel|preLive|live|post` — keine Tabs im Production-UI.

### Neue Dateien (Phase 1, 19.05.2026)
- `app/dashboard/[token]/page.tsx` — Route, Server Component, liest searchParams.preview
- `components/dashboard/DashboardShell.tsx` — Header (Logo, Pill, Meta), Frame
- `components/dashboard/PhaseWerbemittel.tsx` — Phase 0: Upload-CTA, Checklist, Callout
- `components/dashboard/PhasePreLive.tsx` — Phase 1: Countdown, Checklist, Creative, Contact
- `components/dashboard/PhaseLive.tsx` — Phase 2: Stats, Timeline, Screenshots, Channel-Mix (Client Component)
- `components/dashboard/PhasePost.tsx` — Phase 3: Endresultat, Eckdaten, Screenshots
- `components/dashboard/atoms.tsx` — Card, Label, KeyValueRow, ProgressBar, Pill, StatCard, Callout, ChecklistItem, ScreenshotGrid, ContactCard, ChannelMixCard, Btn
- `lib/dashboard/types.ts` — TypeScript-Typen (DashboardData, Phase, Checkpoint, Screenshot, Contact)
- `lib/dashboard/mock-data.ts` — 4 Mock-Datensätze (Energiezukunft Zürich, CHF 6'000, Paket Präsenz)

**Bridge-Button (`Step7Confirmation.tsx`):** Ghost-Button "Dashboard öffnen →" am Ende des Politik-Bestätigungs-Steps. Generiert client-side `crypto.randomUUID()`, navigiert auf `/dashboard/[uuid]?demo=1`. Temporär — wird durch echte Token-Generierung im Backend ersetzt.

**Demo-Modus (`?demo=1`):** Renders `DemoPhaseSwitcher` oberhalb der Shell. Pill-Buttons schalten zwischen Phasen via `router.push(/dashboard/[token]?preview=<phase>&demo=1)`. In Production (ohne `?demo=1`) kein Switcher sichtbar.
- `components/dashboard/DemoPhaseSwitcher.tsx` — Client Component, useRouter

**Aktueller Stand:** UI fertig, Mock-Daten, kein Backend, keine Persistenz. Token-Storage, E-Mail-Versand und Webhook folgen.


## Preislogik (vereinfacht)

**Aktuelle Logik-Version: v3.5.3 Single Source of Truth (14.05.2026)**

- Min Budget: CHF 4'000
- Pakete: Sichtbar / Präsenz / Dominanz
- Reach basiert auf Hofmans-Saturation (asymptotisch, kein hartes Capping)
- Frequenz emergent: f_campaign = contacts / unique_reach
- Sweet Spot (§7.4): `calculateSweetSpot(regions, daysUntilVote?)` → niedrigstes Budget bei dem `optimizeForBudget()` einen stabilen Status liefert (NICHT in unstable-Menge {sprint_14d_thin_budget, aufbau_42d_thin_budget, too_thin, dominanzmodus_stark, too_short_for_campaign, vote_passed}). Linear-Scan über `[B_MIN, B_HARD_MAX]` in 500er-Schritten. Rückgabe `{budget, context: 'optimal'|'constrained'} | null`. UI: kein Slider-Marker, dreigeteilter HintCard-Präfix (unter/im/über Sweet Spot, Korridor ×1.3).
- DOOH-Vorlauf-Constraint in beiden Pfaden aktiv (§7.0/§7.3 Pfad A, §8.6/§8.7 Pfad B).
- Pfad A Laufzeit-Granularität: {14, 21, 28, 35, 42} (war {14, 28, 42} in v3.5.2).
- Dominanz-Cap (§8.1): wenn Dominanz.budget > 2.5 × Präsenz.budget → `requiresConsultation = true` → Karte zeigt „Persönliche Beratung empfohlen" klickbar (Calendly), nicht ausgegraut.
- Berechnung: siehe `public/vio-regelkatalog-politik-v3-5-3.md` (Single Source of Truth)

### Einkauf-Modell
- EK CHF 25 DOOH / CHF 5 Display sind Preise gegenüber Operating-Partner (nicht Splicky-Rohpreis)
- Partner übernimmt: Splicky-Setup, Screen-Auswahl, Monitoring, Freigabe-Koordination
- Splicky-Rohpreise können tiefer liegen — Delta ist Partner-Marge, VIO-irrelevant
- VIO-Marge 51.9% ist netto nach Partner-Fee gerechnet

### Konstanten (v3.5.3)
| Konstante | Wert | Hinweis |
|---|---|---|
| F_MIN_WEEKLY | 3 | Krugman-Schwelle |
| F_MIN_TOLERANCE | 2.7 | Near-F-Min für 28d-broad_reach (aktiv) |
| F_MAX_WEEKLY | 10 | Wearout-Grenze |
| F_OVERKILL_THRESHOLD | 15 | ab hier Beratung empfehlen (aktiv) |
| OTS_DOOH | 1.8 | Audience Contacts pro DOOH-Play |
| REACH_CURVE_K | 0.25 | Hofmans-Saturation Steilheit |
| IN_POOL_FACTOR | 0.7 | Anteil Kontakte die Pool treffen |
| WEAROUT_FLOOR | 0.70 | Minimaler Wearout-Faktor |
| LARGE_POOL_THRESHOLD | 500'000 | Schwelle für Sprint-Override Pfad A (aktiv) |
| REACH_PREMIUM_THRESHOLD | 1.4 | +40% Reach für Sprint/Toleranz-Trigger (aktiv) |
| AUFBAU_PREMIUM_THRESHOLD | 1.2 | +20% Reach für Aufbau-Override 35d/42d vs 28d (NEU v3.5.3) |
| CPM_DOOH | 50 | unverändert |
| CPM_DISPLAY | 15 | unverändert |
| CPM_LIST | 43.89 | Listen-CPM mit 10% Channel-Puffer (= 39.50 / 0.90). Basis für Partnercode-Boost-Faktor. |
| MIN_VORLAUF_DOOH | 10 | DOOH-Freigabe-Untergrenze (v3.5.2) |
| MIN_VORLAUF_DISPLAY | 1 | Display-Sprint-Untergrenze (v3.5.2) |
| MIN_DISPLAY_ONLY_LAUFZEIT | 7 | Untergrenze sinnvolle Display-Sprint-Laufzeit (v3.5.2) |
| DOMINANZ_BUDGET_CAP | 100_000 | Hard-Cap CHF: Dominanz.budget > 100k → requiresConsultation (v3.5.3, geändert 19.05.2026) |
| LAUFZEITEN_BASIS | [14,21,28,35,42] | Pfad-A-Laufzeit-Granularität (v3.5.3 erweitert) |

**Entfernt in v3.5.2**: `DISPLAY_SPRINT_SWITCH_DAYS = 24`

---

## Custom-Pfad Modell (Sprint 3 Phase A — ab 01.06.2026)

### Pfad-Asymmetrie
- **Step 1 Q3**: Nutzer wählt Pfad (`paket` | `custom`) → gespeichert in `briefing.pfad`
- **Step 2**: Single-Path — `StepPackages.tsx` rendert entweder Paket-Cards (Pfad `paket`) oder Custom-Konfigurator (Pfad `custom`). Kein Tab-Switch, kein Mode-Toggle nach Pfad-Wahl.

### Custom-Modell: 3 Hebel, 2 Outputs
- **Inputs (Nutzer steuert):** Budget (CHF), Kampagnenfenster (Laufzeit in Tagen), Wirkungsfokus (`breit` | `ausgewogen` | `verankerung`)
- **Outputs (emergent):** Frequenz (aus Wirkungsfokus-Zielwert) + Kanal-Mix (aus DOOH-Inventory-Klassifizierung)
- Wirkungsfokus-Frequenzwerte: `breit=2.1`, `ausgewogen=3.1`, `verankerung=4.6` (kalibriert, v3.7)

### Reach-Formel
```
reachLinear = impressionenImPool / (zielFrequenz × laufzeitWeeks)
reach       = poolCap × (1 − e^(−K × reachLinear/poolCap))   // Hofmans
```
Frequenz koppelt invers: höhere Frequenz → tieferer reachLinear → tiefere Reach bei gleichem Budget.

### Zeitachsen-Trennung
- **Wirkungsdauer**: Kalendertage (unverändert für beide Pfade)
- **DOOH-Setup-Vorlauf**: nur im Custom-Pfad → `SETUP_VORLAUF_WERKTAGE = 10` Werktage via `addBusinessDays()`
- Paket-Pfad behält `DOOH_CUTOFF_DAYS = 10` (Kalendertage, unverändert)

### DOOH-Zwei-Zustand
- `available: true` → `channelMix` = Max-DOOH-Anteil aus Screen-Klasse (0.80 / 0.55 / 0.20)
- `available: false` → Reason `setup_vorlauf` (Vorlauf unterschritten) oder `no_inventory` (0 Screens)
- Inventar-Copy-Regel: UI zeigt je nach Zustand "im Raum + online" vs. "online-only"

### Sweet-Spot über Sättigungsgrad
- Ziel-Sättigungsgrad `SWEET_SPOT_TARGET_SATURATION = 4.0` (dimensionslos: reachLinear / poolCap)
- Empirisch kalibriert via 13-Cluster-Smoke (entspricht ~63% des Pool-Caps)
- `calculateSweetSpotCustom()` → Budget bei dem Sättigungsgrad = 4.0 erreicht wird, pro Wirkungsfokus

### Outcome-Panel-Konzept (Phase B — IMPLEMENTIERT 02.06.2026)
- Komponenten: Reichweite-Hero + Dot-Grid (Stil A) + Präsenz-Story + Ortsanker + Coach-Zeile
- Kein Adtech-Vokabular (kein CPM, kein %, keine GRP-Anzeige)
- Umsetzung: `components/campaign/StepPackages.tsx` Custom-Pfad Zone 2

### Phase-Schnitt Sprint 3
- **Phase A (Logik): ABGESCHLOSSEN** — Custom-Modell, DOOH-Zwei-Zustand, Sweet-Spot, Smoke Tests, Regelkatalog v3.7
- **Phase B (UI + Coach): ABGESCHLOSSEN** — Cockpit 3 Hebel + Outcome-Panel + Coach-Engine (02.06.2026)

### Custom-Pfad Phase B — Coach-Engine + UI (02.06.2026)

**Coach-Engine (`lib/custom-hints.ts`):**
- `evaluateCustomConfig()` → `CustomEvaluation { coachHint: CoachHint | null, presence }`
- Ein priorisierter Hint, deterministisch, Sweet-Spot-relativ
- Sweet-Spot-Zone 60–115% = still (kein Hint)
- `budget_niedrig`: Budget < 60% × Sweet-Spot → Empfehlung mehr Budget
- `laufzeit`: Budget < 60% × ss(aktuell) ABER >= 60% × ss(28d) + laufzeit > 28d → Laufzeit verkürzen (bringt Budget in Zone ohne Budget-Erhöhung)
- `saettigung`: Budget > 115% × Sweet-Spot → Sättigungs-Warnung
- `REFERENZ_LAUFZEIT_DAYS = 28` (Ankerlaufzeit für Laufzeit-Hint)

**presence-Objekt:**
- `doohAvailable`, `showScreenCount`, `screenCount`
- Logik komplett in lib (nicht in UI) — UI orchestriert nur
- `SCREEN_ANZEIGE_SCHWELLE = 30`: Zahl anzeigen ab 30 Screens, sonst qualitativ

**Konstanten (preislogik.ts / custom-hints.ts):**
- `REFERENZ_LAUFZEIT_DAYS = 28`
- `COACH_BUDGET_LOW_RATIO = 0.6`
- `COACH_BUDGET_HIGH_RATIO = 1.15`
- `SCREEN_ANZEIGE_SCHWELLE = 30`

**UI Step 2 Custom-Pfad — Cockpit (3 Hebel):**
- Layout: Cockpit oben, Outcome unten (kein Side-by-Side)
- Hebel 1: Budget-Slider + Sweet-Spot-Zone (%-basiert, live-verschiebend, COACH_BUDGET_LOW/HIGH_RATIO × ss) + Marker + "Auf Empfehlung setzen"-Button
- Hebel 2: Kampagnenfenster-Zeitachse — `briefing.votingDate` = fixes rechtes Ende (garantiert vorhanden, PolitikFlow prüft vor Step-2-Skip); Start-Handle + Wochen-Ticks antippbar; Wochen-Snap RÜCKWÄRTS vom Wahltag (ganze Wochen, `laufzeitWochen × 7 = laufzeitDays`); Vorlauf-Sperrzone links schraffiert (`addBusinessDays(heute, SETUP_VORLAUF_WERKTAGE)`)
- Hebel 3: Wirkungsfokus 3er-Toggle (Breite Wirkung / Ausgewogen / Verankerung)
- Coach-Box als Brücke Hebel → Outcome (erscheint nur bei `coachHint !== null`)

**UI Step 2 Custom-Pfad — Outcome-Panel:**
- Reichweite-Hero: `customImpact.reach` (Schweizer Format), "Stimmberechtigte erreicht", "Ø N× gesehen · im [Name] / in deiner Auswahl" (Frequenz = `WIRKUNGSFOKUS_FREQUENZ[wirkungsfokus] × laufzeitDays/7`, gerundet)
- Dot-Grid (Stil A, gerade/dicht): adaptiver `DOTUNIT` = poolCap / ~50, gerundet auf `[250, 500, 1000, 2000, 5000]`; poolCap exakt invertiert: `reach / (1 − e^(−REACH_CURVE_K × saturationRatio))`; max 60 Slots, 12/Reihe; Legende mit DOTUNIT-Wert
- Präsenz-Story (3 Zustände): (1) `doohAvailable && showScreenCount` → Zahl in Fett; (2) `doohAvailable && !showScreenCount` → qualitativ ohne Zahl; (3) `!doohAvailable` → online-only
- Ortsanker: generischer Platzhalter-Satz ("mehrere mittelgrosse Gemeinden") + TODO-Kommentar für echte Referenztabelle (separate Verfeinerung)

**Rückbau:**
- Frequenz-Slider entfernt (`freqWeekly` bleibt in `CustomConfig` als TS-Pflicht, Default 5, kein Slider)
- AllocationBar-Import entfernt (`AllocationBar.tsx` liegt noch, nicht mehr verwendet)
- `customMaxDoohShare` useMemo entfernt

**campaignStart:**
- `CustomConfig.campaignStart?: string` (ISO-date); gesetzt beim Zeitachsen-Drag
- `calculateImpactCustom()` bekommt `campaignStart?: Date` → `checkDoohAvailability()` nutzt es (Vorlauf-Check)

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
| 02.06.2026 | **Phase B UI + Coach COMPLETE** | Coach-Engine (`evaluateCustomConfig` → `CustomEvaluation`), presence-Objekt (doohAvailable/showScreenCount/screenCount), Konstanten COACH_BUDGET_LOW/HIGH_RATIO/SCREEN_ANZEIGE_SCHWELLE/REFERENZ_LAUFZEIT_DAYS. UI: 3-Hebel-Cockpit (Budget+Sweet-Spot-Zone %-basiert, Zeitachse-Wochen-Snap rückwärts, Wirkungsfokus-Toggle), Coach-Brücke, Outcome-Panel (Dot-Grid adaptiver DOTUNIT, poolCap-Inversion, Präsenz-Story 3 Zustände, Ortsanker-Platzhalter). Rückbau: Frequenz-Slider + AllocationBar. `CustomConfig.campaignStart?: string`. |
| 02.06.2026 | Decision: SCREEN_ANZEIGE_SCHWELLE=30 | Nicht 10 (SCREENS_THRESHOLD_LIMITED) — würde schwache Zahlen zeigen (z.B. 10 Screens Adliswil). Qualitativ ist vertrauenswürdiger als schwache Zahlen. |
| 02.06.2026 | Decision: presence vollständig in lib | UI orchestriert nur; Logik (doohAvailable, showScreenCount, screenCount) komplett in `evaluateCustomConfig`. |
| 02.06.2026 | Decision: Dot-Grid Stil A + adaptiver DOTUNIT | Jede Region erscheint ~gleich voll (40–55 Punkte); Absolutzahl ist zweitrangig, Verhältnis zeigt Ausschöpfung. DOTUNIT aus `[250,500,1000,2000,5000]` ≥ poolCap/50. |
| 02.06.2026 | Decision: Sweet-Spot-Zone %-basiert | Keine clientWidth-Berechnung; responsive und Mobile-sicher. leftPct/rightPct geclampt [0,100]. |
| 02.06.2026 | Decision: Zeitachse Wochen-Snap rückwärts | `laufzeitWochen × 7 = laufzeitDays` → immer ganze Wochen; Snap-Richtung vom Wahltag rückwärts (nicht vorwärts ab frühesterStart) verhindert krumme Laufzeiten. |
| 01.06.2026 | **v3.7 (SPEC_VERSION 3.7)** | Custom-Pfad-Modell vollständig spezifiziert: Wirkungsfokus-Modell (3 Hebel: Budget, Kampagnenfenster, Wirkungsfokus; Frequenz+Kanal als Outputs), Reach-Formel (reachLinear = impressionenImPool/(zielFrequenz×laufzeitWeeks)), DOOH-Zwei-Zustand (im Raum + online / online-only), SETUP_VORLAUF_WERKTAGE=10 (Custom-Pfad), SWEET_SPOT_TARGET_SATURATION=4.0 (13-Cluster-Smoke kalibriert). Regelkatalog-Dateiname: vio-regelkatalog-politik-v3-6.md. |
| 21.05.2026 | **v3.6** | v3.6: OTS_DOOH, DELIVERY_DOOH, DELIVERY_DISPLAY aus contacts_*-Formel entfernt. Naming unverändert. EK-CPM mit Operating-Partner preist OTS/Delivery ein. |
| 20.05.2026 | fix(partnercode) | **Cap-Edge-Case Range-Inkonsistenz behoben.** `isCapEdgeCase` + `displayReachImpact` als component-level derived values in `StepPackages.tsx`. Wenn Code mit Boost aktiv aber `deltaPersonen=0`: Range (Low/High + Abdeckungs-%) aus `impactBase` (ohne Code) statt aus `impact`. Vorher asymmetrisch (Upper am Cap, Lower minimal mitgewandert). |
| 20.05.2026 | feat(partnercode) | **Partnercode-System Phase 1 (Mock-Validierung, Politik-Flow).** `lib/partner-codes-mock.ts`: PartnerCode-Typ + 3 Test-Codes (direct/agentur/vermittler) + `validatePartnerCode()` (case-insensitive). `lib/preislogik.ts`: `CPM_LIST = 43.89` + `partnerCodeBoostPct?`-Parameter in `calculateImpact` — Faktor `mixedCpm / (CPM_LIST × (1 − boost/100))` auf `impressionsEffective`. Kein Code → Reach sinkt ~10% ggü. früher (Liste-Puffer); Direct-Code (10%) → identisch zu heute. `components/campaign/StepPackages.tsx`: Partnercode-UI collapsed unter Wirkungsindikator, Validierung, Bestätigungs-Pattern (Boost-Anzeige / Cap-Edge-Case / Hinterlegt), State persistiert via `briefing.partnerCode`. `agenturcode` komplett entfernt (types.ts, Step6Contact, submit-briefing). **⚠ Doku-Update pending:** `docs/partnercode-konzept.md` Sektion 5 schreibt linearen +11%-Boost (Impression-Mathematik), tatsächlich ~5–7% Reach-Boost wegen Hofmans-Saturation. Sektion muss mit «echtem Reach-Delta» und Variabilität je Region präzisiert werden. |
| 19.05.2026 | feat(dashboard) | **Dashboard-Layer Phase 1 + Bridge-Button + Demo-Modus:** UI-Skelett mit 4 Phasen und Mock-Daten. Politik-Step 7 öffnet Dashboard mit temporärer client-side UUID + `?demo=1`. `DemoPhaseSwitcher` für Phase-Wechsel in Demo. Backend-Sequenz (KV → Token → Magic Link → Webhook) in Planung. |
| 19.05.2026 | fix(optimizer) | **Saturation-Tie-Break Schritt 4** — bei vollgesättigtem Pool (`bestLong.reach ≥ chosen.reach × 0.99`) UND deutlich tieferer Frequenz (`bestLong.fWeekly < chosen.fWeekly × 0.85`) wird long-Laufzeit (42d/35d) bevorzugt. Trigger-Case: CHF 100k + Bern. `lib/preislogik.ts` ~Zeile 517. |
| 19.05.2026 | UX-Patch | **Sweet-Spot-Zone statt Punkt** — §7.4: Budget-Marker-Präfix neu als Zone ±20% um `sweetSpot.budget` (×0.9–×1.2). Unterhalb Zone: CHF-Betrag sichtbar. In Zone: „Im Sweet Spot." Über Zone: positiv bestätigend ohne CHF. Änderung in `components/campaign/StepPackages.tsx` (~Zeile 463–469). |
| 19.05.2026 | Logik-Patch | **Dominanz-Advisory-Schwelle auf CHF 100k vereinfacht** — `lib/preislogik.ts`: `DOMINANZ_CAP_MULTIPLIER = 2.5` (relativ zu Präsenz-Budget) ersetzt durch `DOMINANZ_BUDGET_CAP = 100_000` (absoluter Hard-Cap). `requiresConsultation` greift nur noch bei `dominanz.budget > 100_000`. Vereinheitlicht mit Pfad-A-Slider-Maximum. `praesenzBudgetRef`-Parameter aus `buildOne()` entfernt. |
| 19.05.2026 | UI-Patch | **StepPackages: Restlaufzeit-Label in Zeitraum-Zelle** — Bedingtes Label „Effektive Kampagnenzeit bis Abstimmung: X Tage" in der ZEITRAUM-KPI-Zelle ergänzt (`components/campaign/StepPackages.tsx`). Erscheint nur wenn `daysUntilVote > displayDays`. Kein neues State-Feld, kein Eingriff in `calculateImpact()` oder `preislogik.ts`. |
| 14.05.2026 | **v3.5.3** | **Pfad-A-Laufzeit-Granularität von {14,28,42} auf {14,21,28,35,42} erweitert** (§7.0/§7.1). Statuscodes als semantische Kategorien dokumentiert (§3). Schritte 1+4 in §7.1 testen jetzt 21d+28d (Standard) bzw. 35d+42d (Aufbau). Neue Konstante `AUFBAU_PREMIUM_THRESHOLD = 1.2`. Kein dynamischer max_vorlauf-Kandidat (Mediaplaner-Entscheidung). **Dominanz-Capping bei grossen Regionen**: `requiresConsultation = (Dominanz.budget > 2.5 × Präsenz.budget)` → UI „Persönliche Beratung empfohlen", klickbar (Calendly), nicht ausgegraut (§8.1, §9.2, §9.3 Guardrail). Neue Konstante `DOMINANZ_CAP_MULTIPLIER = 2.5`. |
| 14.05.2026 | **v3.5.2** | **DOOH-Vorlauf-Constraint in Pfad A** (§7.0/§7.3 analog Pfad B §8.6/§8.7). Sweet-Spot/Budget-Marker formal definiert (§7.4) als niedrigstes Budget mit stabilem Status. Slider-Marker entfällt vollständig, HintCard absorbiert mit dreigeteiltem Präfix (unter/im/über Sweet Spot, Korridor ×1.3). Statuscodes neu: `display_only_late_window`, `too_short_for_campaign`, `vote_passed`, `sprint_14d_vorlauf_constrained`, `optimal_28d_vorlauf_constrained`. Alle stabilen Status durchgängig tone='good', title='Empfehlung'. Intern/Extern-Trennung normativ (§7.2, §9.4). `DISPLAY_SPRINT_SWITCH_DAYS=24` entfernt, `buildDisplaySprint()` entfernt, `TARGET_FREQ=4.5`-Hardcode entfernt. Neue Konstanten: `MIN_VORLAUF_DOOH=10`, `MIN_VORLAUF_DISPLAY=1`, `MIN_DISPLAY_ONLY_LAUFZEIT=7`. **Pfad B**: §8.6/§8.7/§8.8 nachträglich implementiert (war Spec-only Drift). `buildPackages()` respektiert Vorlauf, Pakete werden bei knappem Vorlauf display_only oder unavailable. Pfad-B-HintCard-Mapping via `pkgToHint()` mit §9.2-Tabelle. Generischer „Im Sweet Spot"-Fallback in `hinweisToDisplay()` entfernt. |
| 14.05.2026 | v3.5.1 (Doku-Korrektur) | **§5.5 Wearout-Schwellen an produktiven Code angeglichen** (weeks ≤ 8 → 1.0, slope −0.03/W, Floor bei ~18 W). Klärungs-Block (a/b/c) entfernt, da Code-Reading von `applyWearoutFactor` in `lib/preislogik.ts` Verhalten eindeutig bestätigt: Funktion ist aktiv, wird in `computeCombo` (Z. 399) und `calculateImpact` (Z. 575) jeweils nach Cap-Clamp multiplikativ angewendet, nicht neutralisiert. KEINE Code-Änderung. KEINE Änderung der §11 Referenzwerte. Sandbox bleibt 72/72 grün. Spec↔Code-Drift war einseitig in der Spec; Code + Soll-Werte waren bereits konsistent. Versionsnummer bleibt v3.5.1 — `documentation correction`, keine `logic revision`. Begründung des Code-Verhaltens: Wearout-Decay greift erst nach Entscheidungsfenster (>8 W); kurzfristige Überpräsenz wird über Frequenz-Limits (`F_MAX_WEEKLY`, `F_OVERKILL_THRESHOLD`) modelliert. Ausnahme von Header-PRECEDENCE-Regel in diesem Einzelfall durch validierten Stand (Code + §11) gerechtfertigt. |
| 13.05.2026 | v3.5.1 | **Promotion v3.5.1-rc1 → v3.5.1 (final). Single Source of Truth.** Gating-Kriterien erfüllt: (1) Sandbox 72/72 grün (24 Spec-Tier 1 + 48 Snapshot-Tier 2 über 12 Cluster-Repräsentanten), (2) Terminologie-Drifts migriert (reachMitte/reachVon/reachBis/weeklyFreq → kanonische Terms), (3) overkill_frequency bleibt als Transitional-Hint für Pfad B (kein Promotion-Blocker, wird in Pfad-B-Implementation durch qualityStatus=high_frequency ersetzt), (4) Wearout-Verhalten §5.5 dokumentiert mit Klärungs-Block (Smoke-Test 2026-05-13 bestätigt: Plateau-Cases zeigen keinen sichtbaren Wearout-Decay), definitive Klärung in v3.5.2. v3.4 deprecated. CLAUDE.md aktualisiert. |
| 12.05.2026 | v3.5.1-rc1 | Release Candidate für neue Single Source of Truth. NICHT produktiv. v3.4 bleibt aktiv bis RC-Promotion. Drift-Audit: 3 Terminologie-Drifts (reachMitte, reachVon/reachBis, weeklyFreq) + 1 obsoleter HinweisCode (overkill_frequency) als Promotion-Blocker dokumentiert. Wearout-Verhalten §5.5 ungeklärt (applyWearoutFactor existiert, Soll-Werte §11 zeigen aber keine Wearout-Multiplikation). Promotion nach: (1) §11 Sandbox 24/24 green ±2%, (2) Wearout-Klärung, (3) 3 Drifts migriert, (4) overkill_frequency entfernt. Bei Fail entsteht rc2. Drift-Audit dokumentiert in public/v3-5-1-rc1-drift-audit.md. |
| 11.05.2026 | v3.4d | Bug-Fix: StepPackages zeitraumDates zeigte vergangenheitliche Kampagnendaten wenn Briefwahl-Fenster (vote−28 bis vote−28−laufzeit) bereits vergangen. Fallback: start=today+10, end=start+effectiveDays (MIN_SETUP_DAYS=10). Offene Inkonsistenz: StepSummaryPolitik.calcCampaignDates verwendet endISO=votingDate (nicht vote−28) — noch nicht behoben. |
| 07.05.2026 | v3.4c | Bug-Fix: buildPackages.buildOne Budget-Rücklösung `* 0.7` → `/ IN_POOL_FACTOR` (Pricing-Korrektur für grosse Regionen). StepPackages Pfad-B-Indikator auf mode='paketLevel' umgestellt (Indikator zeigt jetzt Paket-konforme Werte). Pfad-A-State (Budget/Laufzeit) wird bei Tab-Wechsel A↔B korrekt gespeichert und wiederhergestellt. |
| 07.05.2026 | v3.4b | Optimizer + Status-Codes: 7-Schritt-Optimizer (optimizeForBudget), 11 neue HinweisCode-Werte (optimal_28d_standard, sprint_14d_*, aufbau_42d_*, dominanzmodus*, too_thin, 28d_broad_reach_low_frequency). Alte Codes entfernt (capped_by_region, screen_class_*, nudge_to_sweet_spot, sweet_spot, no_dooh_inventory). UI-Botschaften in CampaignHint.tsx und StepPackages.tsx migriert. Sandbox Status-Diff aktiv. |
| 07.05.2026 | v3.4 | Konstanten-Phase: REACH_CURVE_K 0.4→0.25; IN_POOL_FACTOR=0.7 eingeführt (auf impressionsEffective); F_MIN_WEEKLY 2.5→3; 4 neue Konstanten deklariert (F_MIN_TOLERANCE, F_OVERKILL_THRESHOLD, LARGE_POOL_THRESHOLD, REACH_PREMIUM_THRESHOLD) |
| 04.05.2026 | v2.3 | Hofmans-Saturation (ersetzt lineares Capping); Frequenz emergent (F_REC_WEEKLY entfernt); OTS 2.0→1.8; F_MIN_WEEKLY 3→2.5; Wearout-Floor 0.80→0.70; REACH_CURVE_K=0.4 (NEU); Reach-Caps +50%; Multi-Region-Klasse aus aggregiertem politScreens_total; daily_below_floor_region pro Region (NEU); Laufzeit-Korridor maxDays 35→42 bei Budget <15k; Sweet Spot Logik: calculateSweetSpot() + nudge_to_sweet_spot Hint (NEU) |
| 22.04.2026 | v2.2 | Initiale Version (F_REC_WEEKLY=5, linearer Reach, hartes Capping) |

### Kampagnen-Timing Politik (v3.5.3)
- CAMPAIGN_END_OFFSET_DAYS = 0 → alle Pakete enden am Abstimmungstag
- Laufzeit rückwärts vom Vote: Pfad A {14,21,28,35,42}d, Pfad B paket-spezifisch (§8.3)
- `MIN_VORLAUF_DOOH = 10` — DOOH-Freigabe-Untergrenze in beiden Pfaden
- `MIN_VORLAUF_DISPLAY = 1` — Display-Sprint-Untergrenze
- `MIN_DISPLAY_ONLY_LAUFZEIT = 7` — Untergrenze sinnvolle Display-Sprint-Laufzeit
- Display-Only-Trigger emergent aus Optimizer-Status `display_only_late_window` (kein hardcoded SWITCH_DAYS mehr).

### Datums-Gating (emergent aus §7.0)
- `daysUntilVote < 1` → `vote_passed`, unavailable
- `daysUntilVote ∈ [1, 7]` → `too_short_for_campaign`, unavailable
- `daysUntilVote ∈ [8, 23]` → Display-Only-Mode (§7.3 Pfad A, §8.7 Pfad B)
- `daysUntilVote ≥ 24` → Optimizer findet beste Laufzeit aus `gültige_laufzeiten` (mind. 14d DOOH-buchbar)

### Empfehlungssystem (§9.3)
- Standard → Präsenz
- Display-only + verfügbares Budget < CHF 9'000 → Präsenz
- Display-only + verfügbares Budget ≥ CHF 9'000 → Dominanz
- Mikroregion (pool < 20'000) + Budget < CHF 6'000 → Sichtbar
- Guardrails: Dominanz `requiresConsultation` → Fallback auf Präsenz; unavailable → nächstes verfügbares; high_frequency → kein Badge

### Backlog

Vollständiges Backlog → siehe `BACKLOG.md` (Root).

**Dashboard-Backend (Sequenz):**
- **Vercel KV Setup + Token-Schema** `dashboard:[token]` → JSON mit Phase + DashboardData
- **Token-Generierung im Booking-Submit** — ersetzt temporäre client-side UUID in `Step7Confirmation.tsx`; Token im Submit-Handler generieren und in KV speichern
- **E-Mail-Versand "Dashboard-Link"** ab Werbemittel-Step via Resend (ersetzt/ergänzt send-resume-link)
- **n8n-Webhook für Status-Updates** — `POST /api/dashboard/[token]/update` → schreibt Phase + Daten in KV
- **Screenshot-Upload-Flow** — S3-Presigned-URL, n8n-Trigger, Workflow undefiniert
- **Werbemittel-Vorschau-Renderer** — Format-Branching: Image / HTML5 Banner / MP4
- **Dynamische Deadline-Eskalation (Werbemittel-Phase)** — Callout-Stufen je nach Restzeit bis DOOH-Cutoff (früh / knapp / kritisch)
- **B2B-Flow: Bridge-Button** — identisches "Dashboard öffnen →"-Pattern am Ende von B2B-Bestätigungs-Step einbauen

**Optimizer / Preislogik:**
- **Glossar definieren** (`docs/glossary.md`): einheitliches Otto-Vokabular für Reichweite, Stimmberechtigte erreicht, Jede Person sieht es, Sweet Spot, Zeitraum, Kanal-Mix etc. Anschliessend Cross-Flow-Sync-Pass über Politik + B2B Steps 1–5.
- **RC-3: laufzeitDays-Rundung** — Step 2 schreibt `Math.round(impact.laufzeitDays / 7)` in `briefing.laufzeit`, Step 3 multipliziert × 7. Bei Optimizer-Werten ≠ 7-Vielfache Rundungsverlust möglich.
- **RC-4: 1-Tag-Versatz Start-Datum** — Step 2 `zeitraumDates` vs. Step 3 `calcCampaignDates` mit today-Fallback. Konsolidierung pending.
- **Architektur-Refactor** — Step 2 serialisiert finalen `impactSnapshot` ins briefing, Step 3 rendert nur. Eliminiert ganze Klasse von State-Drift-Bugs.
- **Legacy** — `buildVioPackagesV2` + `briefing.vioPackages.finalBudget` — toter Pfad, Quelle des 5000-Fallbacks in RC-1. Bei Architektur-Refactor entfernen.

