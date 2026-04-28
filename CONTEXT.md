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

- Min Budget: CHF 4'000
- Pakete: Sichtbar / Präsenz / Dominanz
- Reach basiert auf:
  - Budget
  - Region
  - Laufzeit
- Berechnung: siehe vio-regelkatalog-politik-v2.md

### Einkauf-Modell
- EK CHF 25 DOOH / CHF 5 Display sind Preise gegenüber Operating-Partner (nicht Splicky-Rohpreis)
- Partner übernimmt: Splicky-Setup, Screen-Auswahl, Monitoring, Freigabe-Koordination
- Splicky-Rohpreise können tiefer liegen — Delta ist Partner-Marge, VIO-irrelevant
- VIO-Marge 51.9% ist netto nach Partner-Fee gerechnet

### Pakete (Politik + B2B identisch)
| Paket | Frequenz | Laufzeit | Min-Budget |
|---|---|---|---|
| Sichtbar | 3× | 14 Tage | CHF 4'000 |
| Präsenz  | 5× | 28 Tage | CHF 6'000 |
| Dominanz | 6× | 42 Tage | CHF 8'000 |

### Tiered Reach Caps (nach Stimmberechtigten bzw. Mitarbeitenden)
- < 50'000: 15 / 30 / 45%
- 50–200k: 8 / 15 / 25%
- 200–500k: 4 / 8 / 14%
- 500k+: 2 / 4 / 8%

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

