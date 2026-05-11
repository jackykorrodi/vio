# VIO Logic Sources

Diese Datei definiert, welche Quelle fuer welche Art von Logik gilt.

## Prioritaet

1. Echter Code ist Wahrheit fuer den aktuellen Zustand.
2. Fuer fachliche Soll-Logik Politik gilt: `public/vio-regelkatalog-politik-v3-4.md`.
3. Wenn Code und Regelkatalog widersprechen: nicht still korrigieren, sondern melden und Entscheidung verlangen.
4. `CONTEXT.md` ist Projektstatus, nicht Preislogik-Source-of-Truth.
5. Prototypen sind UI-Referenz, nicht Logik-Source-of-Truth.
6. Legacy-Dateien sind nicht fuer neue Implementierungen zu verwenden.

## Politik Preislogik

Fachliche Source of Truth:

- `public/vio-regelkatalog-politik-v3-4.md`

Implementation:

- `lib/preislogik.ts`
- `lib/region-buchbarkeit.ts`

Temporaere Bruecke:

- `lib/preislogik-adapter.ts`

UI:

- `components/campaign/StepPackages.tsx`
- `components/campaign/StepSummaryPolitik.tsx`
- `components/shared/ImpactIndicator.tsx`
- `components/shared/CampaignHint.tsx`

## Legacy / nicht fuer neue Logik verwenden

- `public/vio-regelkatalog-paketlogik.md`
- `lib/vio-paketlogik.ts`
- `lib/b2b-paketlogik.ts`

Nur lesen, wenn explizit Legacy-Aufraeumen oder Vergleich verlangt wird.

## Prototyp

- `public/prototypes/vio-wirkungskonfigurator.html`

Nur als UI-/Interaktionsreferenz verwenden.
Nicht als Berechnungslogik uebernehmen.

## Bekannte Pruefpunkte

Bei Paket-, Preis- oder Wirkungslogik immer pruefen:

- Sichtbar: Frequenz, Laufzeit, Mindestbudget
- Praesenz: Frequenz, Laufzeit, Mindestbudget
- Dominanz: Frequenz, Laufzeit, Mindestbudget
- Reach Caps
- Budget-Hard-Cap
- Channel-Split
- Laufzeitkorridor
- Wearout
- Datums-Gating
- Abstimmungstag / Startdatum / Unterlagenversand

## Aufgeloester Konflikt – Dominanz

Korrekte Regel: Dominanz = 6x / 42 Tage (gemaess Regelkatalog und CONTEXT.md).

`lib/preislogik.ts` enthaelt noch 8x / 35 Tage — Code muss via /vio-task angepasst werden.

Bis zur Code-Korrektur: Regelkatalog und CONTEXT.md haben Vorrang.