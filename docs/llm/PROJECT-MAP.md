# VIO Project Map

Diese Datei ist die schnelle Orientierung für Claude.

Nicht automatisch alle Dateien lesen. Erst anhand dieser Map entscheiden.

## App Entry

- `app/page.tsx`  
  Landingpage / Home.

- `app/campaign/page.tsx`  
  Suspense Wrapper für CampaignFlow.

- `app/campaign/CampaignFlow.tsx`  
  Verteilt nach URL-Parameter auf Politik, B2B oder B2C.

## Flows

- `components/flows/PolitikFlow.tsx`  
  Orchestriert Politik-Flow mit 6 sichtbaren Steps.

- `components/flows/B2BFlow.tsx`  
  Orchestriert B2B-Flow.

- `components/flows/B2CFlow.tsx`  
  Orchestriert B2C-Flow.

## Politik Steps

- `components/steps/Step1Politik.tsx`  
  Abstimmungsdatum, Regionenauswahl, Budget-known Frage.

- `components/campaign/StepPackages.tsx`  
  Paket-/Budget-Auswahl, Pfad A/B, Wirkungsindikator.

- `components/campaign/StepSummaryPolitik.tsx`  
  Kampagnenübersicht, Budget/Laufzeit nachjustieren.

- `components/shared/ImpactIndicator.tsx`  
  Darstellung Reichweite, Frequenz, Laufzeit, Budget, Kanal-Mix.

- `components/shared/CampaignHint.tsx`  
  Darstellung von Hinweisen aus Preislogik.

## Politik Logik

- `public/vio-regelkatalog-politik-v3-4.md`  
  Fachliche Source of Truth für Politik-Preislogik.

- `lib/preislogik.ts`  
  Aktuelle Berechnungslogik.

- `lib/region-buchbarkeit.ts`  
  Buchbarkeit, Screen-Klassen, Channel-Split.

- `lib/preislogik-adapter.ts`  
  Temporäre Brücke zwischen neuer Logik und alter Step-Struktur.

## Legacy / nicht für neue Logik

- `public/vio-regelkatalog-paketlogik.md`
- `lib/vio-paketlogik.ts`
- `lib/b2b-paketlogik.ts`

Nur lesen, wenn explizit Legacy-Aufräumen oder Vergleich verlangt wird.

## Prototyp

- `public/prototypes/vio-wirkungskonfigurator.html`  
  Nur UI-/Interaktionsreferenz. Nicht als Berechnungs-Source-of-Truth verwenden.
