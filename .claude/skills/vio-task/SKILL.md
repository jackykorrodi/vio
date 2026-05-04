---
description: VIO Umsetzung in Claude Code: suchen, verifizieren, fragen, planen, minimal patchen, validieren.
---

# VIO Task Skill



Du arbeitest im VIO-Projekt.



## Ziel



Setze eine konkrete VIO-Aufgabe sauber um, ohne zu raten, ohne Full Rewrite und ohne unnoetige Dateien zu veraendern.



## Pflicht



1\. Lies `CLAUDE.md`.

2\. Lies `docs/llm/PROJECT-MAP.md` nur zur Orientierung, wenn die betroffene Datei unklar ist.

3\. Suche exakte UI-Strings, Variablen, Funktionen oder Komponenten aus der Aufgabe.

4\. Verifiziere die echte Datei anhand des Codes.

5\. Lies nur die minimal noetigen Dateien.

6\. Wenn Preis-/Reach-/Budget-/Buchbarkeitslogik betroffen ist, lies `docs/llm/LOGIC-SOURCES.md` und `public/vio-regelkatalog-politik-v2.md`.



## AskUserQuestion



Nutze AskUserQuestion wenn unklar:



- Zielverhalten

- UX-Entscheidung

- Wording

- Logik

- Erfolgskriterium

- betroffene Datei

- mehrere Loesungswege

- Widerspruch zwischen Code und Regelkatalog



Regeln:



- maximal 3-5 Fragen

- moeglichst Multiple Choice

- immer mit empfohlener Default-Option

- keine Fragen zu Dingen, die im Code pruefbar sind



## Plan



Vor Aenderungen immer Plan liefern, wenn:



- mehr als eine Datei betroffen ist

- Businesslogik betroffen ist

- Preis-/Reach-/Budgetlogik betroffen ist

- UX-Flow betroffen ist

- der User "zuerst Plan" oder "keine Dateien aendern" schreibt



Format:



PLAN



Verifizierte Dateien:

- ...



Vorgesehene Aenderung:

- ...



Nicht anfassen:

- ...



Risiken / offene Punkte:

- ...



Freigabe noetig:

Ja/Nein



## Umsetzung



Nach Freigabe:



- patch existing structure only

- keine Full Rewrites

- keine unrelated refactors

- keine neue Architektur

- bestehende Funktionsnamen und Exports beibehalten

- nur verifizierte Dateien aendern

- minimaler Eingriff



## Validierung



Nach Code-Aenderungen ausfuehren:



- `npm run typecheck`

- `npm run lint`



Wenn `npm run typecheck` nicht existiert:



- `npx tsc --noEmit`



Wenn Lint bestehende Fehler ausserhalb des Task-Scopes zeigt:



- nicht automatisch fixen

- klar als bestehendes Problem melden

- nur task-relevante Fehler beheben



## Abschluss



Immer so abschliessen:



DONE



Geaenderte Dateien:

- ...



Konkrete Aenderungen:

- ...



Validierung:

- ...



Getestete Faelle:

- ...



Offene Risiken / Annahmen:

- ...




