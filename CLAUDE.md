# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Projektkontext

**VIO** ist eine Schweizer Self-Service-Plattform für DOOH- (Digital Out-of-Home) und Display-Werbekampagnen. Ziel ist es, KMU und Organisationen in der Schweiz zu ermöglichen, in wenigen Minuten eine professionelle Mediakampagne zu planen und zu buchen – ohne Vorkenntnisse im Marketing. Die Plattform analysiert automatisch die Website des Kunden, leitet daraus die Zielgruppe ab und berechnet Reichweite und Kosten transparent.

Sprache der gesamten Benutzeroberfläche: **Deutsch, formelles Sie, Schweizer Rechtschreibung** (kein «ß», stattdessen «ss»; Dezimaltrennzeichen: Apostroph; Währung: CHF).

---

## 7-Schritt-Flow

Der gesamte Buchungsprozess läuft auf einer einzigen Seite ab. Schritte werden per Framer Motion nacheinander eingeblendet und scrollen automatisch ins Bild. Der State der gesamten Kampagne lebt in `BriefingData` in `app/page.tsx`.

| Schritt | Komponente | Was passiert |
|---|---|---|
| 1 | `Step1Entry` | Kunde gibt seine Website-URL ein und wählt B2C oder B2B. Kein API-Call – Fortschritt sofort. |
| 2 | `Step2Analysis` | Automatischer KI-Analyse-Screen (kein User-Input). Firecrawl scrapt die URL, Gemini analysiert den Content. Dauert 4–15 Sekunden. |
| 3 | `Step3Audience` | Zeigt das KI-Ergebnis an. Nur bestätigte Felder werden angezeigt (siehe Regel unten). Kunde kann Angaben editieren oder ergänzen. |
| 4 | `Step4Budget` | Logarithmischer Budgetslider (CHF 2'500–50'000) und Laufzeitwahl (1/2/4/8 Wochen). Reichweite wird live berechnet. |
| 5 | `Step5Creative` | Wahl der Werbemittel: hochladen / erstellen lassen (CHF 500) / später einschicken. |
| 6 | `Step6Contact` | Kontaktformular. Wahl: Offerte anfordern oder direkt buchen. Ab CHF 15'000 Budget: Calendly-Link für Beratungsgespräch. |
| 7 | Confirmation | Eingebettet in `Step6Contact` nach Submit: Bestätigungsscreen mit nächsten Schritten. |

---

## Preiskalkulation & Reichweite

Die Reichweite wird in `lib/calculations.ts` → `calculateReach()` berechnet. Logik:

### Budgetaufteilung
- **70 %** des Budgets → DOOH (digitale Plakatwände, Schweizer Netz)
- **30 %** des Budgets → Display (Online-Banner)

### CPM-Tarife (Tausendkontaktpreis)
| Kanal | Breit (allgemeine Zielgruppe) | Eng (spezifische Zielgruppe) |
|---|---|---|
| DOOH | CHF 50 | CHF 75 |
| Display | CHF 15 | CHF 25 |

> Der aktuelle Code verwendet fixe Werte (`DOOH_CPM = 50`, `DISPLAY_CPM = 15`). Die Unterscheidung breit/eng ist geplant und wird über die Zielgruppen-Spezifität aus `AnalysisResult` ausgelöst.

### Formel
```
DOOH-Impressionen  = (Budget × 0.70 / CPM_DOOH) × 1000
Display-Impressionen = (Budget × 0.30 / CPM_Display) × 1000
Unique Reach = (DOOH-Impressionen + Display-Impressionen) / Frequenz
Frequenz = 3 (jede Person sieht die Werbung Ø 3× täglich)
```

### Rahmenbedingungen
- Mindestbudget: CHF 2'500 (`MIN_BUDGET`)
- Maximalbudget: CHF 50'000 (`MAX_BUDGET`)
- Werbemittel-Erstellung durch VIO: +CHF 500 (`BANNER_PRODUCTION_COST`)
- Ab CHF 15'000 (`CALENDLY_THRESHOLD`): persönliches Beratungsgespräch via Calendly

---

## Regel: Nur bestätigte KI-Felder anzeigen

In Schritt 3 (`Step3Audience`) gilt: **Es werden ausschliesslich Felder angezeigt, die die KI mit ausreichender Sicherheit aus dem Website-Content ableiten konnte.** Felder mit `null`-Werten oder tiefer Confidence werden nicht gerendert (kein Platzhalter, kein «Unklar»). Einzige Ausnahme: Organisation und Region sind immer sichtbar, da der Kunde sie in jedem Fall bestätigen oder manuell eintragen muss.

Wenn `needsManualInput === true` (d. h. `isUnclear`, `regionConfidence === 'tief'` oder `alterConfidence === 'tief'`), wird eine Warnmeldung angezeigt und der Edit-Mode automatisch geöffnet.

Bei `isManualFallback === true` (Scraping fehlgeschlagen oder zu wenig Content) wird der gesamte Analyse-Step übersprungen und Schritt 3 öffnet sich als leeres manuelles Eingabeformular.

---

## KI-Analyse-Pipeline

**Endpunkt:** `POST /api/analyze-url`

1. **Firecrawl** scrapt die URL zu Markdown (Format: `markdown`, `waitFor: 2000ms`)
2. Die ersten **5'000 Zeichen** des Markdowns werden an **Gemini** (`gemini-2.0-flash`) gesendet
3. Der Prompt ist auf Schweizer Mediaplanung ausgerichtet: Organisation, Branche, Kanton, Alter, Einkommen, Wohnumfeld, Lifecycle, Interessen, Sprache
4. Für B2B zusätzlich: NOGA-Code, Unternehmensgrösse, Rechtsform
5. Gemini antwortet mit **reinem JSON** (kein Markdown-Wrapper) → wird direkt als `AnalysisResult` geparst
6. Fehlerbehandlung auf beiden Ebenen → `isManualFallback: true` als sicherer Fallback

---

## Automationen nach Buchung

**Endpunkt:** `POST /api/submit-briefing`

Beim Absenden des Formulars (Schritt 6) werden automatisch ausgelöst:

1. **HubSpot – Kontakt erstellen** (`crm.contacts.basicApi.create`)
   - Felder: Vorname, Nachname, E-Mail, Telefon, Firma

2. **HubSpot – Deal erstellen** (`crm.deals.basicApi.create`)
   - Dealname: `VIO – [Organisation] – [Budget] CHF`
   - Betrag: Budget in CHF
   - Pipeline: `default`
   - Dealstage: `closedwon` bei Direktbuchung, `presentationscheduled` bei Offerte
   - Description: vollständiges `BriefingData`-JSON (URL, campaignType, analysis, reach, laufzeit, werbemittel, abschluss)
   - Verknüpft mit dem erstellten Kontakt (Association Type ID 3)

3. **Calendly-Link** (nur Frontend) – wird nach Bestätigung angezeigt, wenn `budget >= 15'000`
   - URL kommt aus `NEXT_PUBLIC_CALENDLY_URL` (env variable)

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript 5 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/postcss`, Config in `app/globals.css`) |
| UI-Komponenten | shadcn/ui (New York style, Lucide Icons) – in `components/ui/` |
| Animationen | Framer Motion 12 |
| KI | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| Web-Scraping | Firecrawl (`@mendable/firecrawl-js`) |
| CRM | HubSpot API v3 (`@hubspot/api-client`) |

### Farbpalette (Marke VIO)
Alle Farben sind in `lib/constants.ts` als `COLORS` definiert und werden per Inline-Style gesetzt (kein Tailwind für Markenfarben):

| Name | Hex |
|---|---|
| Navy (Primär, Text) | `#0A0A23` |
| Rot (CTA, Akzent) | `#FF3B30` |
| Erfolg | `#34C759` |
| Hintergrund | `#F8F8F8` |
| Grau (Text sekundär) | `#6B7280` |
| Hell-Grau (Rahmen) | `#E5E7EB` |

---

## Environment Variables

In `.env.local` erforderlich:

```
FIRECRAWL_API_KEY=          # Firecrawl – Website-Scraping
GEMINI_API_KEY=             # Google Gemini – KI-Analyse
HUBSPOT_ACCESS_TOKEN=       # HubSpot – CRM-Automationen
NEXT_PUBLIC_CALENDLY_URL=   # Calendly – Beratungslink (öffentlich)
```

---

## Befehle

```bash
npm run dev      # Entwicklungsserver starten (Port 3000)
npm run build    # Produktions-Build
npm run lint     # ESLint
```

Kein Test-Framework konfiguriert.

---

## Schlüsseldateien

| Pfad | Zweck |
|---|---|
| `app/page.tsx` | Shell: hält `BriefingData`-State, rendert alle 6 Schritte progressiv |
| `lib/types.ts` | `BriefingData` + `AnalysisResult` Interfaces; `initialBriefing` Konstante |
| `lib/constants.ts` | Markenfarben, Kantonsliste, CPM-Werte, Budget-Schwellen |
| `lib/calculations.ts` | `calculateReach()`, `formatCHF()`, `formatNumber()` |
| `components/StepLayout.tsx` | Zweispaltiges Layout-Wrapper für jeden Schritt (2/3 Formular + 1/3 Sticky-Infobox) |
| `app/api/analyze-url/route.ts` | Firecrawl → Gemini → `AnalysisResult` JSON |
| `app/api/submit-briefing/route.ts` | HubSpot Kontakt + Deal erstellen |
