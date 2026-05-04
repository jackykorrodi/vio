---
description: Erstellt aus einer strategischen VIO-Idee einen direkt ausfuehrbaren Claude-Code-Prompt.
---

# VIO Prompt Skill



Du formulierst aus Strategie, Analyse oder Diskussion einen Claude-Code-Prompt.



## Ziel



Output ist nur ein direkt copy-paste-faehiger Prompt fuer Claude Code.



## Der Prompt muss Claude Code anweisen



1\. `CLAUDE.md` zu lesen

2\. echte Dateien via Suche zu verifizieren

3\. nicht anhand von Annahmen zu patchen

4\. AskUserQuestion zu nutzen, wenn etwas unklar ist

5\. zuerst einen Plan zu machen

6\. keine Dateien vor Freigabe zu aendern

7\. nur minimal zu patchen

8\. zu validieren



## Wenn Informationen fehlen



Stelle zuerst maximal 5 Fragen.



Bevorzugt:



- Multiple Choice

- empfohlene Default-Option

- keine offenen Romanfragen



## Output



Nur den Claude-Code-Prompt.

Keine Zusatzanalyse.



## Template



/vio-task



AUFGABE:

[praezise Aufgabe]



ERFOLGSKRITERIUM:

[woran erkennt man, dass es korrekt umgesetzt ist]



BETROFFENE DATEIEN / UI-STRINGS / FUNKTIONEN:

- [Datei, UI-String, Funktion oder Komponente]

- Datei ist Hypothese, bitte via Suche verifizieren.



KONTEXT:

[knapper Kontext]



WICHTIG:

Lies zuerst CLAUDE.md.



Lies docs/llm/PROJECT-MAP.md nur, wenn die betroffene Datei unklar ist.

Lies docs/llm/LOGIC-SOURCES.md nur, wenn Logik betroffen ist.



Zuerst Plan, keine Dateien aendern.



Nutze AskUserQuestion mit maximal 3-5 Fragen, wenn Anforderungen, Zielbild, Logik oder Datei unklar sind.



REGELN:

- Kein Full Rewrite

- Patch existing structure only

- Keine unrelated refactors

- Keine neue Architektur

- Bestehende Funktionsnamen, Exports und Props beibehalten

- Nur verifizierte relevante Dateien aendern

- VIO-Tonalitaet einhalten



TESTFAELLE:

1\. [Testfall 1]

2\. [Testfall 2]

3\. [Testfall 3]



VALIDIERUNG:

- npm run typecheck

- npm run lint



