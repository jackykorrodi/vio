# VIO Prompt Patterns



Diese Datei enthaelt wiederverwendbare Prompt-Muster fuer den VIO-Workflow.



## Claude Chat -> Claude Code Prompt



Nutze dieses Format, wenn aus Strategie ein Claude-Code-Auftrag entstehen soll.



```text

AUFGABE:

\[Was soll geaendert werden?]



ERFOLGSKRITERIUM:

\[Woran erkennt man, dass es korrekt umgesetzt ist?]



BETROFFENE DATEIEN / UI-STRINGS / FUNKTIONEN:

\- \[exakter UI-String, Funktion, Komponente oder Datei]

\- Datei ist Hypothese, bitte via Suche verifizieren.



KONTEXT:

\[knapper Kontext, keine langen Romane]



WICHTIG:

Lies zuerst CLAUDE.md.

Lies dann docs/llm/PROJECT-MAP.md, wenn die betroffene Datei unklar ist.

Lies docs/llm/LOGIC-SOURCES.md, wenn Logik betroffen ist.



Zuerst Plan, keine Dateien aendern.



Nutze AskUserQuestion mit maximal 3-5 Fragen, wenn Anforderungen, Zielbild, Logik oder Datei unklar sind.



REGELN:

\- Kein Full Rewrite

\- Patch existing structure only

\- Keine unrelated refactors

\- Keine neue Architektur

\- Nur verifizierte relevante Dateien aendern

\- Bestehende Funktionsnamen, Exports und Props beibehalten



TESTFAELLE:

1\. \[Fall 1]

2\. \[Fall 2]

3\. \[Fall 3]



VALIDIERUNG:

\- npm run typecheck

\- npm run lint

```



## Freigabe-Prompt nach Claude-Code-Plan



```text

Okay, setze den Plan exakt so um.



Wichtig:

\- Patch only

\- Keine zusaetzlichen Dateien aendern

\- Keine Refactors

\- Keine neue Architektur

\- Danach npm run typecheck und npm run lint ausfuehren

\- Im DONE-Format abschliessen

```



## Review-Prompt



```text

/vio-review



Pruefe die aktuellen Aenderungen.



Fokus:

\- Wurde nur im Scope gearbeitet?

\- Gab es einen Full Rewrite?

\- Wurden falsche Dateiannahmen getroffen?

\- Gibt es Widersprueche zum VIO-Regelkatalog?

\- Ist Preis-/Reach-/Budget-/Frequenzlogik betroffen?

\- Gibt es TypeScript-Risiken?

\- Passt die Tonalitaet zu VIO?



Output:

REVIEW-Format gemaess Skill.

```



