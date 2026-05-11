---
description: VIO Umsetzung in Claude Code: suchen, verifizieren, fragen, planen, minimal patchen, validieren.
---

# VIO Task Skill

Du arbeitest im VIO-Projekt.

## Ziel

Setze konkrete VIO-Aufgaben sauber um:
- ohne zu raten
- ohne Full Rewrite
- ohne unnötige Dateien zu verändern
- mit minimalem Eingriff in bestehende Architektur

Fokus:
- bestehende Struktur respektieren
- nur task-relevante Änderungen
- bestehende Patterns weiterverwenden
- klare Validierung

---

# Workflow

## 1. Orientierung & Verifikation

Pflicht:

1. Lies `CLAUDE.md`
2. Lies `docs/llm/PROJECT-MAP.md` nur wenn betroffene Datei unklar ist
3. Suche exakte:
   - UI-Strings
   - Funktionen
   - Variablen
   - Komponenten
   - Status-Codes
4. Verifiziere die echte Datei anhand des Codes
5. Lies nur die minimal nötigen Dateien

Wenn betroffen:
- Preislogik
- Reach
- Budget
- Buchbarkeit
- Optimizer
- Politik-Flow

Dann zusätzlich lesen:
- `docs/llm/LOGIC-SOURCES.md`

Regelkatalog in `/public` nur lesen wenn:
- der Prompt explizit darauf verweist
- Business-Regeln geändert werden
- Optimizer-/Status-Code-Logik betroffen ist
- LOGIC-SOURCES.md nicht ausreicht

Wichtig:
- Docs referenzieren
- Inhalte nicht unnötig kopieren

---

# AskUserQuestion

Nutze AskUserQuestion nur wenn etwas nicht verifizierbar oder fachlich unklar ist.

Erlaubte Gründe:
- Zielverhalten unklar
- UX-Entscheidung nötig
- Wording unklar
- Businesslogik unklar
- Erfolgskriterium fehlt
- mehrere valide Lösungswege
- Widerspruch zwischen Code und Regelkatalog

Nicht fragen bei:
- Dingen, die via Repo-Search prüfbar sind
- redundanten Rückfragen
- technischen Details, die aus bestehendem Code ableitbar sind
- bereits dokumentierten Entscheidungen in CONTEXT.md / LOGIC-SOURCES.md

Regeln:
- maximal 3 Fragen
- möglichst Multiple Choice
- immer Default-Empfehlung nennen
- kurz bleiben

---

# Plan

Vor Änderungen zuerst PLAN liefern wenn:
- mehrere Dateien betroffen sind
- UX-/State-Management betroffen ist
- Shared Businesslogik betroffen ist
- Preis-/Reach-/Budgetlogik mit mehreren Codepfaden betroffen ist
- der User explizit "zuerst Plan" verlangt

Format:

PLAN

Verifizierte Dateien:
- ...

Vorgesehene Änderung:
- ...

Nicht anfassen:
- ...

Risiken / offene Punkte:
- ...

Freigabe nötig:
Ja/Nein

Regeln:
- kein Roman
- keine Wiederholung der gesamten Aufgabe
- keine Repo-Zusammenfassung
- nur task-relevante Punkte

---

# Umsetzung

Nach Freigabe:

- patch existing structure only
- keine Full Rewrites
- keine neue Architektur
- keine unrelated Refactors
- bestehende Funktionsnamen behalten
- bestehende Exports behalten
- bestehende Patterns respektieren
- nur verifizierte Dateien ändern
- minimaler Eingriff

Bevor neue Utilities entstehen:
- prüfen ob bestehende Funktion erweitert werden kann

Keine:
- speculative fixes
- defensive rewrites
- broad cleanup tasks
- automatische Modernisierung

---

# Prompt-Struktur & Token-Disziplin

Ziel:
- präzise Prompts
- geringe Tokenkosten
- hohe Signalqualität

## Standardformat für `/vio-task`

Nutze kompakte Struktur:

/vio-task

AUFGABE:
- 1–3 Sätze

ERFOLGSKRITERIUM:
- 2–5 Bulletpoints

BETROFFENE DATEIEN:
- Datei + Funktion/Komponente

KONTEXT:
- max. 2–4 Sätze
- relevante Docs referenzieren
- keine langen Erklärungen

TESTFÄLLE:
- kurz
- Input → erwartetes Verhalten

## Regeln

Bevorzugen:
- referenzieren statt kopieren
- Problem + Ursache + gewünschtes Verhalten
- konkrete Symptome
- reale Beispiele

Vermeiden:
- ganze Regelkataloge kopieren
- lange Architektur-Erklärungen
- Verifizierungsanleitungen
- grep-/search-Skripte
- überlange Testmatrizen
- dieselbe Information mehrfach

## Richtwerte

Kleine Bugfixes:
- ~20–40 Zeilen Prompt

Mittlere Refactors:
- ~40–80 Zeilen

Große Architektur-Themen:
- nur wenn wirklich nötig ausführlich

Wichtig:
Mehr Text bedeutet nicht bessere Resultate.

---

# Umgang mit Code-Stellen

Erlaubt:
- konkrete Datei nennen
- Funktion nennen
- bekannte kritische Zeile referenzieren
- bekannten Patch referenzieren

Beispiel:
- "IN_POOL_FACTOR sitzt aktuell nur im budgetFirst-Zweig (~Zeile 485)"

Nicht nötig:
- detaillierte Suchstrategien
- mehrere alternative Suchpfade
- Schritt-für-Schritt Repo-Navigation

Claude soll selbst suchen und verifizieren.

# Umgang mit bestehenden Änderungen

Wenn betroffene Dateien bereits unstaged/staged Änderungen enthalten:

- zuerst prüfen ob der gewünschte Fix bereits existiert
- bestehende Änderungen respektieren
- keine vollständige Re-Analyse des gesamten Moduls
- nur task-relevante Stellen prüfen

Wenn bestehende Änderungen die Aufgabe bereits erfüllen:
- direkt validieren
- DONE statt Neuimplementierung

Nur PLAN oder AskUserQuestion wenn:
- Konflikte zwischen Änderungen bestehen
- mehrere konkurrierende Implementationen existieren
- Regression-Risiko unklar ist



---




# Validierung

Nach Änderungen immer ausführen:

1.
`npm run typecheck`

2.
`npm run lint`

Wenn typecheck nicht existiert:
`npx tsc --noEmit`

Wenn Build relevant:
`npm run build`

Regeln:
- nur task-relevante Fehler fixen
- bestehende Fremdfehler nicht automatisch anfassen
- bestehende Probleme klar erwähnen

---

# Abschlussformat

Immer exakt dieses Format:

DONE

Geänderte Dateien:
- ...

Konkrete Änderungen:
- ...

Validierung:
- ...

Getestete Fälle:
- ...

Offene Risiken / Annahmen:
- ...

Regeln:
- konkret bleiben
- keine langen Narrative
- keine Wiederholung des gesamten Prompts

---

# Politik-/Reach-Logik

Bei Änderungen an:
- Preislogik
- Optimizer
- Reach
- Frequenz
- Pools
- Caps
- Budgetsteuerung

Immer:
- bestehende Konstanten prüfen
- bestehende Optimizer-Pfade prüfen
- nur relevante Modi/Pfade prüfen
  (z.B. budgetFirst ODER paketLevel)
- andere Pfade nur prüfen wenn:
  - Shared Logic geändert wird
  - Regression-Risiko wahrscheinlich ist
- Sandbox-/Curve-Validierung berücksichtigen

Keine impliziten Annahmen über:
- Reach-Caps
- Frequenzlogik
- Poolgrössen
- Paketdefinitionen

Immer gegen:
- LOGIC-SOURCES.md
- aktuellen Regelkatalog
- CONTEXT.md

verifizieren.

---

# Prioritäten

Reihenfolge:

1. Korrektheit
2. Minimaler Eingriff
3. Konsistenz mit bestehender Architektur
4. Verständlichkeit
5. Performance
6. Eleganz

Keine unnötige Perfektionisierung.