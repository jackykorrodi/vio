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

## Context Loading Order

Do not read all docs by default.

Always read:

1. `CLAUDE.md`

Read only if needed:

2. `docs/llm/PROJECT-MAP.md` - for file orientation
3. `docs/llm/LOGIC-SOURCES.md` - for source-of-truth decisions
4. `CONTEXT.md` - for product/project status
5. `public/vio-regelkatalog-politik-v2.md` - only for Politik price/reach/budget/bookability logic

Never read legacy files unless explicitly needed:

- `public/vio-regelkatalog-paketlogik.md`
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
2. `public/vio-regelkatalog-politik-v2.md`
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