# Dominanz-Fix: Prompt für Claude Code

> Diesen Prompt in Claude Code einfügen um lib/preislogik.ts zu korrigieren.
> Dominanz ist aktuell 8×/35 Tage im Code – korrekt sind 6×/42 Tage laut Regelkatalog.

---

```
/vio-task

AUFGABE:
Dominanz-Paket in lib/preislogik.ts von 8×/35 Tage auf 6×/42 Tage korrigieren.

ERFOLGSKRITERIUM:
- Dominanz zeigt Frequenz 6×, Laufzeit 42 Tage
- Sichtbar (3×/14 Tage) und Präsenz (5×/28 Tage) bleiben unverändert
- npm run typecheck läuft durch ohne neue Fehler

BETROFFENE DATEIEN / UI-STRINGS / FUNKTIONEN:
- lib/preislogik.ts – Paketdefinitionen für Dominanz (Frequenz, Laufzeit)
- Datei ist verifiziert – bitte trotzdem exakte Zeilennummern vor Patch prüfen.

KONTEXT:
Der Regelkatalog (public/vio-regelkatalog-politik-v2.md) und CONTEXT.md definieren Dominanz mit 6× Frequenz und 42 Tagen Laufzeit. lib/preislogik.ts enthält noch die veralteten Werte 8×/35 Tage. Nur diese zwei Werte ändern, nichts sonst.

REGELN:
- Kein Full Rewrite
- Patch existing structure only
- Keine unrelated Refactors
- Nur die Dominanz-Werte (Frequenz + Laufzeit) anpassen
- Sichtbar und Präsenz nicht anfassen

TESTFÄLLE:
1. Paketauswahl Dominanz → Frequenz-Anzeige zeigt 6×, Laufzeit zeigt 42 Tage
2. Paketauswahl Sichtbar → weiterhin 3×/14 Tage
3. Paketauswahl Präsenz → weiterhin 5×/28 Tage

VALIDIERUNG:
- npm run typecheck
- npm run lint
```
