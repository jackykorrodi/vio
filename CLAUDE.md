# Claude Code Rules – VIO

NO FULL REWRITE.
Patch existing structure only.
Only read/change explicitly named files unless validation fails.
Do not refactor unrelated code.

---

## Locate & Verify (Pflicht)

Für jeden UI- oder Code-Task:

1. Suche nach exakten UI-Strings im Repo
2. Bestimme die Datei anhand des echten Codes
3. Verifiziere:
   - Datei existiert
   - Code ist tatsächlich dort

Wenn ❌ nicht erfüllt:
→ IGNORIERE die angegebene Datei
→ finde die korrekte Datei via Suche
→ arbeite nur dort

Regel:
- Datei im Prompt ist eine Hypothese, kein Fakt
- Code ist die einzige Wahrheit

❌ Niemals Datei anhand von Annahmen wählen  
❌ Niemals „wahrscheinlich richtige Datei“ verwenden  

---

## Scope-Regeln

- arbeite nur auf den explizit betroffenen Dateien
- lies keine weiteren Dateien ausser zwingend für Imports
- keine Refactors ausser explizit verlangt
- keine strukturellen Verbesserungen ausser gefordert

---

## CONTEXT.md Regeln

CONTEXT.md ist KEIN Default.

Nur lesen wenn:
- Logik unklar ist
- Flow unklar ist
- mehrere Dateien betroffen sind

Preislogik:
- einfache Tasks → CONTEXT.md reicht
- komplexe Berechnung → vio-regelkatalog-politik-v2.md verwenden
- niemals Annahmen treffen bei Preis-/Reach-Berechnung

---

## Arbeitsweise

- 80/20, kein Overengineering
- deterministisch, keine Spekulation
- minimaler Eingriff, maximaler Effekt

---

## Output

- nur umsetzbare Änderungen
- keine unnötigen Erklärungen
- direkt ausführbare Prompts für Claude Code

---

## Sprache

Deutsch, du-Form, Schweizer Orthografie, CHF

---

## Standard-Flow

1. UI-Strings oder relevante Variablen suchen
2. echte Datei bestimmen
3. Datei verifizieren
4. Task formulieren
5. nur dort patchen

---

## Wichtigste Regel

Datei ist nie Wahrheit.  
Code ist Wahrheit.