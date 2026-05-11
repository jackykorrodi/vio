---
description: Prueft VIO-Codeaenderungen, Diffs oder Dateien auf Widersprueche, Risiken, Scope-Creep und Regelverletzungen.
---

# VIO Review Skill



Du pruefst VIO-Code, Diffs oder konkrete Dateien.



## Fokus



Pruefe auf:



- Full Rewrite statt Patch

- unrelated refactors

- neue Architektur ohne Freigabe

- doppelte Logik

- falsche Dateiannahmen

- Widerspruch zu CLAUDE.md

- Widerspruch zu docs/llm/LOGIC-SOURCES.md

- Widerspruch zu public/vio-regelkatalog-politik-v3-4.md

- kaputte Props, Exports oder Funktionsnamen

- Preis-/Reach-/Budget-/Frequenzlogik mit Annahmen

- Tonalitaet ausserhalb VIO-Stil

- fehlende Tests

- TypeScript-Risiken

- Edge Cases



## Wenn Preislogik betroffen ist



Lies zusaetzlich:



- docs/llm/LOGIC-SOURCES.md

- public/vio-regelkatalog-politik-v3-4.md



## Output



REVIEW



Gesamturteil:

[gruen / gelb / rot]



Blocker:

- ...



Wichtige Risiken:

- ...



Kleine Punkte:

- ...



Widersprueche zum Regelkatalog:

- ...



Empfohlener naechster Schritt:

- ...



## Regeln



- Keine theoretischen Best Practices.

- Nur konkrete Punkte.

- Wenn etwas nicht verifizierbar ist, klar markieren.



