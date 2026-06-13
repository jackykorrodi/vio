# VIO Logic Sources

Diese Datei definiert, welche Quelle fuer welche Art von Logik gilt.

## Prioritaet

1. Echter Code ist Wahrheit fuer den aktuellen Zustand.
2. Fuer fachliche Soll-Logik Politik gilt: `public/vio-regelkatalog-politik-v3-6.md` (SPEC_VERSION 3.14).
3. Wenn Code und Regelkatalog widersprechen: nicht still korrigieren, sondern melden und Entscheidung verlangen.
4. `CONTEXT.md` ist Projektstatus, nicht Preislogik-Source-of-Truth.
5. Prototypen sind UI-Referenz, nicht Logik-Source-of-Truth.
6. Legacy-Dateien sind nicht fuer neue Implementierungen zu verwenden.

## Politik Preislogik

Fachliche Source of Truth:

- `public/vio-regelkatalog-politik-v3-6.md` (SPEC_VERSION 3.14)

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

## Eckwerte-Modus (Flow v2)

Fachliche Source of Truth: `public/vio-regelkatalog-politik-v3-6.md` §13 (SPEC_VERSION 3.14).

Frequenzfrei. Zwei Modi: Geführt (VIO schlägt vor) / Impact (Kunde setzt selbst). Hinweis blockiert nie.

Kernformeln: L (Gebietslast aus region.stimm), T (Zeitraum Tage), need = L × (T/7) × WOCHENSATZ, ratio = budget/need, empfehlung = max(MIN_BUDGET, ceil(need×1.05/500)×500). Reach: §5 (reachUniqueLow). Frequenz/CPM/Kanal-Split: nie in UI.

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

## Bekannte Verschiebungen (v3.5.3)

- Pfad A Laufzeit-Granularitaet erweitert von {14,28,42} auf {14,21,28,35,42}.
- Statuscodes (`optimal_28d_*`, `sprint_14d_*`, `aufbau_42d_*`) sind semantische Kategorien, nicht fixe Tage.
- Dominanz-Cap: berechnet Budget > 2.5 × Praesenz → `requiresConsultation = true` → Karte zeigt "Persoenliche Beratung empfohlen".
- DOOH-Vorlauf-Constraint in beiden Pfaden aktiv (§7.0/§7.3 Pfad A, §8.6/§8.7 Pfad B).
- `DISPLAY_SPRINT_SWITCH_DAYS` und `buildDisplaySprint()` entfernt — Trigger emergent aus Optimizer-Status `display_only_late_window`.