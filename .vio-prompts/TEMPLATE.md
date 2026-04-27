# VIO Prompt-Template

## Core Rules
NO FULL REWRITE.
Patch existing structure only.
Only read/change explicitly named files unless imports are unclear.
Only patch what's explicitly in the task. No refactoring, no style changes.

---

## Template

VIO TASK: [Ziel in einer Zeile]

FILE: [exakter Pfad, z.B. components/steps/Step1Politik.tsx]

LINES: [optional, z.B. 120–160]

CONTEXT: [1–2 Sätze — warum diese Datei, welches Problem]

IMPLEMENTATION:
- Input: [Was reinkommt]
- Output: [Was rauskommt]
- Logik: [konkret, deterministisch – keine Interpretationsspielraum]

DO NOT TOUCH:
- [Datei/Funktion 1 — bleibt unangetastet]
- [Datei/Funktion 2]

TEST:
- Fall 1: [Input] → [erwartetes Output, z.B. "Bülach angezeigt, nicht broken"]
- Fall 2: [Input] → [erwartetes Output]
- Fall 3: [Input] → [erwartetes Output]

DONE:
npx tsc --noEmit
git add <changed-files>
git commit -m '[type]: [kurz was ändert sich]'
git push origin HEAD:master
