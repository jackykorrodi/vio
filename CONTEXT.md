# VIO – Projekt Context für Claude Code

> Diese Datei ist die Single Source of Truth für Claude Code.
> Vor jedem grösseren Task lesen. Nach jedem abgeschlossenen Task updaten.

## Stack
- Next.js + Tailwind v4, Vercel (Auto-Deploy via GitHub: jackykorrodi/vio)
- HubSpot Deal Properties (State-Speicher, dealId via URL Params)
- Firecrawl + Gemini 2.5 Flash (URL-Analyse, Ad Creator)
- Resend (E-Mail, Domain: vio.ch)
- Design: Violet #6B4FBB, Ink #2D1F52, Plus Jakarta Sans + Jost

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

## Tech-Debt (nach Go-Live angehen)
- B2C Step 1 URL-Input ist inline in B2CFlow.tsx — in eigene Step1B2C.tsx Komponente auslagern
- Step5AdCreator (1134 Zeilen) + Step4Budget/steps (951 Zeilen) sind zu gross — aufteilen
- Step8Dashboard Farben auf VIO Design-System updaten wenn aktiviert

## Wichtige Dateien
- `lib/dooh-screens.json` — 146 Einträge, Feld screens_politik für ~78% politikfähige Screens
- `lib/vio-inhabitants-map.ts` — 26 Kantone + ~120 Gemeinden mit Demonymen
- `lib/vio-paketlogik.ts` — Dynamische Paketlogik Politik (Sichtbar/Präsenz/Dominanz)
- `lib/b2b-paketlogik.ts` — Paketlogik B2B
- `DESIGN.md` — Design System, vor visuellen Änderungen lesen
- `public/vio-adcreator-v16.html` — Ad Creator Referenz
- `public/prototypes/` — Abgenommene HTML-Prototypen als Ground Truth

### Step-Komponenten (immer exakte Pfade verwenden)
- `components/steps/Step1Entry.tsx` — Einstieg B2C
- `components/steps/Step1B2B.tsx` — Einstieg B2B
- `components/steps/Step2Politik.tsx` — Politik Region
- `components/steps/Step2PolitikBudget.tsx` — Politik Budget
- `components/steps/Step4Budget.tsx` — B2C + B2B Budget (AKTIV, wird von B2BFlow + B2CFlow importiert)
- `components/campaign/Step4Budget.DEPRECATED.tsx` — NICHT VERWENDEN (ungenutzt, deprecated)
- `components/campaign/StepPackages.tsx` — Paketauswahl

### Prototypen (Ground Truth für visuelle Implementierung)
- `public/prototypes/` — alle abgenommenen HTML-Referenzen

## Bekannte Fallstricke
- Umlaut-Encoding: Immer gegen Schweizer Schreibweise validieren (Bülach, nicht Bulach)
- CSS + Turbopack: Bei visuellen Komponenten inline style={{}} bevorzugen, keine externen CSS-Klassen
- 4 Gemeinden permanent ausgeschlossen: Küsnacht, Martigny, Opfikon, Veyrier
- Nie CPM oder Kanalaufteilung dem User zeigen — nur Von-Bis Reichweite

## Prompt-Regeln

### Pre-Prompt Checkliste (vor jedem Task abhaken)
☐ HTML-Prototyp abgenommen und in /public/prototypes/?
☐ Exakter Dateipfad bekannt?
☐ Task auf eine einzige Sache reduziert?
→ Nur wenn alle drei ✓: Prompt ausführen

### Prompt-Abschluss (immer in dieser Reihenfolge)
1. npx tsc --noEmit ausführen — bei Fehlern zuerst fixen, dann weiter
2. CONTEXT.md ## Letzter Stand updaten
3. git add . && git commit -m 'feat: [was] — [wo] — getestet: ja/nein' && git push

- Struktur: ZIEL / DATEI / ZEILEN / REFERENZ / ÄNDERUNG / NICHT ANFASSEN
- Immer Dateipfade angeben, nie ohne Kontext bauen
- Prototyp aus /public/prototypes/ als Referenz mitgeben bei visuellen Änderungen
- Endet immer mit: git add . && git commit -m 'feat: [beschreibung]' && git push

## Definition of Done
Ein Task gilt als abgeschlossen wenn:
1. Vercel Build grün (kein Deploy-Fehler)
2. Screenshot in Vercel gemacht und mit Prototyp/Ziel verglichen
3. Abnahme erfolgt (visuell oder funktional bestätigt)
4. CONTEXT.md ## Letzter Stand aktualisiert

## Commit-Konvention
Format: `feat: [was] — [wo] — getestet: ja/nein`
Beispiele:
- `feat: channel cards inline-styled — Step4Budget.tsx — getestet: ja ✓`
- `fix: paketauswahl klickbar — StepPackages.tsx — getestet: nein (Vercel pending)`

## Stabile Versionen (Git Tags)
Bei jedem funktionierenden Meilenstein: `git tag v0.x-stable`
Rollback: `git checkout v0.x-stable`

## Decision Log
| Datum | Entscheid | Begründung |
|---|---|---|
| 2026-04-10 | Inline styles statt CSS-Klassen für Komponenten | Turbopack cached CSS aggressiv, inline ist zuverlässiger |
| 2026-04-10 | HubSpot Deal Properties statt Supabase | MVP-tauglich, kein extra Service nötig |
| 2026-04-10 | Gemini 2.5 Flash statt Claude für Analyse | Kosteneffizienter für URL-Crawling |
| 2026-04-10 | 70% DOOH / 30% Display fix | Bewusste Mediaplanung-Entscheidung, nicht ändern |
| 2026-04-10 | Keine CPM-Anzeige für User | Vereinfachung, nur Von-Bis Reichweite zeigen |

## Offene Go-Live Blocker
🔴 KRITISCH: HubSpot Properties anlegen / Resend Domain verifizieren / Vercel ENV prüfen / Firecrawl Rate Limiting
🟡 WICHTIG: Mobile Steps 1-4+6-7 / Session Timeout / Firecrawl Fallback / Offerte PDF / Duplicate Submission
🔒 SECURITY: Rate Limiting / Input Validation / CORS / API Keys in ENV

## Letzter Stand
- Datum: 2026-04-11
- Politik Budget-Step: Design auf v2 Prototype angeglichen (Sidebar, Channel Cards mit vio-Bildern, Sliders, Vote-Hint)
- Paket-Karten: onClick-Selektion gefixt, selectedPackage State korrekt verdrahtet (inline styles, kein className wegen Turbopack)
- Channel Cards: Hintergrundbilder /images/vio-dooh-bahnhof.jpg + /images/vio-display-phone.jpg eingebunden
- Insight-Badges: alle 3 Pakete haben kontextabhängige Badges (red/good/best)
- Präsenz Badge-Text: "Läuft rund um den Unterlagen-Versand — optimale Präsenz in der Meinungsbildungsphase."
- Datumslogik: campaignEnd = voteDate − 3 Tage, campaignStart = campaignEnd − durationDays, Fallback auf heute
- Empfehlungslogik: daysUntilVote-basiert (< 49 → sichtbar, 49–62 → praesenz, ≥ 63 → dominanz)
