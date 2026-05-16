# Claude Code Rules - VIO

NO FULL REWRITE.
Patch existing structure only.
Do not refactor unrelated code.
Do not create new architecture unless explicitly requested.

---

## Core Principle

Code is the only truth for current implementation.

A file name in a prompt is a hypothesis, not a fact.
A UI description in a prompt is a clue, not proof.
Always verify against real code before changing anything.

---

## Skills

Für strukturierte Aufgaben diese Slash-Commands nutzen:

- `/vio-task` – Umsetzung: suchen → verifizieren → planen → freigeben → patchen
- `/vio-map` – Datei-Orientierung ohne Implementierung
- `/vio-review` – Review von Änderungen, Diffs oder Dateien


---

## Effizienz & Prompt-Disziplin

Claude Code optimiert für minimale Token-Nutzung bei ausreichender Präzision.

### Zielgrössen

- Bugfixes: Ziel <30 Zeilen
- Refactors: Ziel <50 Zeilen
- Grössere Architekturarbeiten dürfen ausführlicher sein

### Regeln

- Verlinke Specs statt sie zu kopieren
- Keine narrativen Erklärungen
- Keine langen Kontext-Historien
- Keine detaillierten Such- oder Verifizierungsabläufe
- Keine hypothetischen Ursachenlisten
- Max. 3 konkrete Testfälle
- Fokus auf:
  - Problem
  - Ursache
  - gewünschtes Verhalten
  - betroffene Dateien

### Erlaubt

Kurze technische Pointer sind erlaubt, wenn:

- mehrere ähnliche Codepfade existieren
- bekannte Drift-/Regression-Risiken bestehen
- aktueller Code-State kritisch ist

Beispiel:
`IN_POOL_FACTOR sitzt aktuell nur im budgetFirst-Zweig (~Zeile 485)`

### Kleine Bugfixes

Format: `/vio-task` mit kurzen Feldern.

Bevorzugt:

- AUFGABE
- ERFOLGSKRITERIUM
- BETROFFENE DATEIEN
- TESTFALL

---

## Context Loading Order

Do not read all docs by default.

Always read:

1. `CLAUDE.md`

Read only if needed:

2. `docs/llm/PROJECT-MAP.md` - for file orientation
3. `docs/llm/LOGIC-SOURCES.md` - for source-of-truth decisions
4. `CONTEXT.md` - for product/project status
5. `DESIGN.md` - for all UI/visual/styling tasks
6. `public/vio-regelkatalog-politik-v3-5-3.md` - only for Politik price/reach/budget/bookability logic

Never read legacy files unless explicitly needed:

- `public/vio-regelkatalog-paketlogik.md`
- `public/vio-regelkatalog-politik-v3-5-2.md` (deprecated, superseded by v3-5-3)
- `public/vio-regelkatalog-politik-v3-5-1.md` (deprecated)
- `public/vio-regelkatalog-politik-v3-4.md` (deprecated)
- `lib/vio-paketlogik.ts`
- `lib/b2b-paketlogik.ts`

---

## Locate & Verify

For every UI or code task:

1. Search exact UI strings, variable names, function names or component names.
2. Determine the real file based on actual code.
3. Verify:
   - file exists
   - relevant code is actually there
   - requested change belongs there

If the named file does not contain the relevant code:

- ignore the named file as source of truth
- locate the correct file via repo search
- work only in the verified correct file
- mention the mismatch

Never patch a "probably correct" file.

---

## Scope Rules

- Only read/change explicitly named or verified-relevant files.
- Read additional files only when required for imports, types, shared logic or validation.
- No unrelated refactors.
- No formatting-only rewrites.
- No duplicate logic.
- Preserve function names, exports, props and public interfaces unless explicitly required.
- Keep the smallest possible patch that solves the task.

---

## Politics Logic Rules



Z.B. im KONTEXT-Teil:
KONTEXT: Bug in IN_POOL_FACTOR-Anwendung (paketLevel-Modus)
→ siehe LOGIC-SOURCES.md (Politik Preislogik: lib/preislogik.ts)
→ siehe CONTEXT.md (Decision Log: v3.4c)

Nicht: "Laut LOGIC-SOURCES.md und Regelkatalog sind Pakete
Sichtbar 3×/14 Tage, Präsenz 5×/28 Tage..." etc.

For tasks touching:

- budget
- reach
- frequency
- campaign duration
- channel split DOOH / Display
- region bookability
- Wirkungsindikator
- packages

Read:

1. `docs/llm/LOGIC-SOURCES.md`
2. `public/vio-regelkatalog-politik-v3-5-3.md`
3. relevant implementation file only

If rule catalogue and implementation differ:

1. Identify the mismatch.
2. Do not silently fix it.
3. Ask whether to align implementation to the rule catalogue.
4. Wait for confirmation.

---

## Prototype Rule

`public/prototypes/vio-wirkungskonfigurator.html` is UI reference only.

Do not use prototype formulas as source of truth.
Do not copy prototype logic into production unless explicitly requested.

---

## AskUserQuestion Rule

Use AskUserQuestion when requirements, target behaviour, UX logic or implementation path are unclear.

Use AskUserQuestion for:

- multiple valid solution paths
- unclear UX decisions
- unclear wording or tone decisions
- pricing, reach, frequency, budget or bookability logic
- contradictory requirements
- missing success criteria
- unclear affected file after repo search
- decisions with product/business impact

Do not use AskUserQuestion for:



- typo fixes
- exact text replacements
- simple CSS tweaks
- obvious import fixes
- TypeScript errors with a clear fix
- Dinge, die du via Repo-Search selbst verifizieren kannst
- Redundante Klärungen (wenn du schon 80% sicher bist, frag nicht)
Question rules:

- maximum 3-5 questions
- prefer multiple choice
- include recommended default option
- no broad open-ended questions
- do not ask for things verifiable in code

---

## Plan-before-Code

If the prompt contains:

- "zuerst Plan"
- "keine Dateien aendern"
- "nur Analyse"
- "erst fragen"
- "Plan before code"

Then:

1. Do not change files.
2. Search and read only relevant files.
3. Verify real target files.
4. Ask targeted questions if needed.
5. Propose concrete implementation plan.
6. Name affected files.
7. List risks or assumptions.
8. Wait for explicit approval.

Without explicit approval, do not modify files.

---

## Working Style

- 80/20
- no overengineering
- deterministic
- no speculation
- minimal intervention, maximum effect
- simple readable code over clever abstraction
- no new dependencies unless approved

---

## VIO Tone

Language:

- German
- du-form
- Swiss orthography
- CHF
- use Umlauts

Tone:

- clear
- calm
- practical
- Swiss
- grounded
- trustworthy
- not salesy
- no SaaS buzzwords

Avoid:

- revolutionaer
- bahnbrechend
- entfessle
- hyperpersonalisiert
- maximale Performance
- KI-gestuetzt unless actually relevant
- marketing fluff

---

## Validation

After code changes run:

```bash
npm run typecheck
```

If available also run:

```bash
npm run lint
```

If `npm run typecheck` does not exist, run:

```bash
npx tsc --noEmit
```

If validation fails:

1. Report exact failure.
2. Fix only if within task scope.
3. If unrelated, state clearly and do not refactor.

---

## DONE Format

```text
DONE

Geaenderte Dateien:
- ...

Konkrete Aenderungen:
- ...

Validierung:
- npm run typecheck: ...
- npm run lint: ...

Getestete Faelle:
- ...

Offene Risiken / Annahmen:
- ...
```

---

## Git Rules

Do not commit automatically unless explicitly requested.

If asked to commit:

1. Run validation first.
2. Show changed files.
3. Commit only task-related files.
4. Push only if explicitly requested.

---

## Wichtigste Regel

Datei ist nie Wahrheit.
Code ist Wahrheit.