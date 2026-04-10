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

## Wichtige Dateien
- `lib/dooh-screens.json` — 146 Einträge, Feld screens_politik für ~78% politikfähige Screens
- `lib/vio-inhabitants-map.ts` — 26 Kantone + ~120 Gemeinden mit Demonymen
- `lib/vio-paketlogik.ts` — Dynamische Paketlogik Politik (Sichtbar/Präsenz/Dominanz)
- `lib/b2b-paketlogik.ts` — Paketlogik B2B
- `public/vio-adcreator-v16.html` — Ad Creator Referenz
- `public/prototypes/` — Abgenommene HTML-Prototypen als Ground Truth

### Step-Komponenten (immer exakte Pfade verwenden)
- `components/steps/Step1Entry.tsx` — Einstieg B2C
- `components/steps/Step1B2B.tsx` — Einstieg B2B
- `components/steps/Step2Politik.tsx` — Politik Region
- `components/steps/Step2PolitikBudget.tsx` — Politik Budget
- `components/steps/Step4Budget.tsx` — B2C Budget
- `components/campaign/Step4Budget.tsx` — Campaign Budget (ACHTUNG: andere Datei als steps/Step4Budget.tsx)
- `components/campaign/StepPackages.tsx` — Paketauswahl

### Prototypen (Ground Truth für visuelle Implementierung)
- `public/prototypes/` — alle abgenommenen HTML-Referenzen

## Bekannte Fallstricke
- Umlaut-Encoding: Immer gegen Schweizer Schreibweise validieren (Bülach, nicht Bulach)
- CSS + Turbopack: Bei visuellen Komponenten inline style={{}} bevorzugen, keine externen CSS-Klassen
- 4 Gemeinden permanent ausgeschlossen: Küsnacht, Martigny, Opfikon, Veyrier
- Nie CPM oder Kanalaufteilung dem User zeigen — nur Von-Bis Reichweite

## Prompt-Regeln
- Struktur: ZIEL / DATEI / ZEILEN / REFERENZ / ÄNDERUNG / NICHT ANFASSEN
- Immer Dateipfade angeben, nie ohne Kontext bauen
- Prototyp aus /public/prototypes/ als Referenz mitgeben bei visuellen Änderungen
- Endet immer mit: git add . && git commit -m 'feat: [beschreibung]' && git push

## Offene Go-Live Blocker
🔴 KRITISCH: HubSpot Properties anlegen / Resend Domain verifizieren / Vercel ENV prüfen / Firecrawl Rate Limiting
🟡 WICHTIG: Mobile Steps 1-4+6-7 / Session Timeout / Firecrawl Fallback / Offerte PDF / Duplicate Submission
🔒 SECURITY: Rate Limiting / Input Validation / CORS / API Keys in ENV

## Letzter Stand
- Was wurde geändert: Prototypen in /public/prototypes/ organisiert, Komponenten-Pfade in CONTEXT.md dokumentiert
- Datum: 2026-04-10
