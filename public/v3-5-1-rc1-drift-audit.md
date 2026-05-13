# v3.5.1-rc1 Drift Audit

**Erstellt:** 13.05.2026  
**RC-Spec:** `public/vio-regelkatalog-politik-v3-5-1-rc1.md` (SPEC_VERSION: 3.5.1-rc1, 473 Zeilen)  
**Aktive Source of Truth:** `public/vio-regelkatalog-politik-v3-4.md` (unverändert)  
**Ziel:** Terminologie-Drifts und Status-Code-Abweichungen vor RC-Promotion identifizieren.

---

## Zusammenfassung

| Kategorie | Anzahl Findings |
|---|---|
| `needs_migration` (Promotion-Blocker) | 3 |
| `legacy_alias` (Promotion-Blocker) | 2 |
| `obsolete_in_v3_5_1` (Promotion-Blocker) | 1 |
| `promotion_gating` (muss verifiziert werden) | 1 |
| `expected_missing` (Pfad-B noch nicht implementiert) | 1 |
| `acceptable_internal` (kein Handlungsbedarf) | 5 |
| `clean` | 1 |

**Promotion-Status: GEBLOCKT** — 6 Findings müssen adressiert werden vor v3.5.1.

---

## §1 Status-Code Audit (Pfad A — §7.2)

### Erwartete Codes (§7.2)

```
optimal_28d_standard · 28d_broad_reach_low_frequency · sprint_14d_thin_budget
sprint_14d_grosser_pool · sprint_14d_28d_unavailable · aufbau_42d_thin_budget
aufbau_42d_reach_premium · aufbau_42d_28d_unavailable · dominanzmodus
dominanzmodus_stark · too_thin
```

### Grep-Kommando

```
grep -rn "optimal_28d_standard|dominanzmodus|sprint_14d|aufbau_42d|too_thin|broad_reach" --include="*.ts" --include="*.tsx" lib/ app/ components/
```

### Findings — Pfad-A Status-Codes

**Alle 11 erwarteten Codes vorhanden** in `lib/preislogik.ts` (HinweisCode-Typ, Zeilen 58–69) sowie korrekt implementiert in Optimizer-Logik und UI.

Relevante Dateien:
- `lib/preislogik.ts:58–69` — HinweisCode-Typ-Definition
- `lib/preislogik.ts:367–377` — Hint-Texte
- `lib/preislogik.ts:407–506` — Optimizer-Logik (Zuweisung aller Codes)
- `components/campaign/StepPackages.tsx:199–210` — UI-Mapping
- `components/shared/CampaignHint.tsx:25–37` — Rendering

**Unerwarteter Code im Code aber nicht in §7.2:** `overkill_frequency`

Laut CONTEXT.md am 12.05.2026 als HinweisCode ergänzt (bei `f_weekly > F_MAX_WEEKLY`). Nicht in v3.5.1-rc1-Spec erwähnt. Nicht in §7.2 Expected-Liste. Klassifikation: `obsolete_in_v3_5_1`.

| Code | Im Code | In §7.2 | Status |
|---|---|---|---|
| `optimal_28d_standard` | ✓ | ✓ | clean |
| `28d_broad_reach_low_frequency` | ✓ | ✓ | clean |
| `sprint_14d_thin_budget` | ✓ | ✓ | clean |
| `sprint_14d_grosser_pool` | ✓ | ✓ | clean |
| `sprint_14d_28d_unavailable` | ✓ | ✓ | clean |
| `aufbau_42d_thin_budget` | ✓ | ✓ | clean |
| `aufbau_42d_reach_premium` | ✓ | ✓ | clean |
| `aufbau_42d_28d_unavailable` | ✓ | ✓ | clean |
| `dominanzmodus` | ✓ | ✓ | clean |
| `dominanzmodus_stark` | ✓ | ✓ | clean |
| `too_thin` | ✓ | ✓ | clean |
| `overkill_frequency` | ✓ | ✗ | **obsolete_in_v3_5_1** |

### Klassifikation

| Finding | Klassifikation |
|---|---|
| Alle 11 Pfad-A Status-Codes vollständig vorhanden | `clean` |
| `overkill_frequency` im Code, nicht in v3.5.1-rc1-Spec | `obsolete_in_v3_5_1` — durch `qualityStatus = 'high_frequency'` (Pfad-B §8.8) ersetzt; Entfernung im Promotion-Task |

---

## §2 Status-Code Audit (Pfad B — §8.8)

### Erwartete Dimensionen (§8.8)

```
deliveryMode: standard | display_only
availability: available | unavailable
qualityStatus: balanced | high_frequency | thin
contextFlag: mikro_limited
```

### Grep-Kommando

```
grep -rn "deliveryMode|qualityStatus|contextFlag|mikro_limited|high_frequency|display_only" --include="*.ts" --include="*.tsx" lib/ app/ components/
```

### Findings

**Keine Treffer.** Keine der §8.8-Dimensionen ist in `lib/`, `app/` oder `components/` implementiert.

### Klassifikation

| Finding | Klassifikation |
|---|---|
| Pfad-B Status-Dimensionen komplett fehlend | `expected_missing` — Pfad-B ist im Status `draft, validation pending` (RC-Spec Header). Kein Blocker für Pfad-A-Promotion, aber §12 Soll-Werte (36 Werte) müssen vor vollständiger Promotion definiert werden. |

---

## §3 Reach-Terminologie Audit

### Kanonische Terms (§3)

```
reach_unique_abs · reach_unique_pct · contacts_total · contacts_gross
contacts_dooh · contacts_display
```

### Grep-Kommando

```
grep -rn "uniqueReach|reach_mitte|reachMitte|reachVon|reachBis" --include="*.ts" --include="*.tsx" lib/ app/ components/
```

### Findings

**`reachMitte`** — öffentliches Feld auf `PaketResult`-Typ und `OptimizeResult`-Typ:
- `lib/preislogik.ts:86` — `reachMitte: number;` (PaketResult)
- `lib/preislogik.ts:126` — `reachMitte: number;` (OptimizeResult)
- `lib/preislogik.ts:289` — `reachMitte: number;` (interne Struct)
- `lib/preislogik.ts:582` — `const reachMitte = Math.round(uniqueReach);` (Berechnung)
- `app/test-internal/preislogik-curves/page.tsx:109` — `reach_abs: r.reachMitte`
- `lib/preislogik-adapter.ts:114` — `impressions: Math.round(p.reachMitte * p.frequencyCampaign)`

Kanonisch gemäss §3: `reach_unique_abs`

**`reachVon` / `reachBis`** — Confidence-Interval-Felder auf mehreren Typen:
- `lib/types.ts:77–80` — `reachVon?: number; reachBis?: number; reachVonPct?: number; reachBisPct?: number;`
- `lib/preislogik.ts:84–85` — `reachVon: number; reachBis: number;`
- `lib/preislogik.ts:124–125` — `reachVon: number; reachBis: number;`
- `lib/preislogik.ts:87–88` — `reachVonPct: number; reachBisPct: number;`

Kein direktes §3-Äquivalent. Confidence-Interval-Konzept in §3 nicht spezifiziert.

**`uniqueReach`** — interne Computation-Variable:
- `lib/preislogik.ts:398, 570, 571, 574` — lokale Variable in Berechnung
- Nicht als öffentliches Feld exportiert

**`uniqueReachPercent`** — in Legacy-Dateien:
- `lib/b2b-paketlogik.ts:11` — Legacy-Datei (CLAUDE.md: "Never read")
- `lib/vio-paketlogik.ts:20` — Legacy-Datei (CLAUDE.md: "Never read")

### Klassifikation

| Finding | Klassifikation |
|---|---|
| `reachMitte` (öffentliches Feld, exportiert) | `needs_migration` — **Promotion-Blocker.** Umbenennung auf `reach_unique_abs` vor v3.5.1-Promotion nötig. Betrifft: `lib/preislogik.ts`, `lib/preislogik-adapter.ts`, Test-Page. |
| `reachVon` / `reachBis` / `reachVonPct` / `reachBisPct` (öffentliche Felder) | `legacy_alias` — **Promotion-Blocker.** Confidence-Interval nicht in §3. Klären ob Konzept in v3.5.1 bleibt, umbenannt oder entfernt wird. |
| `uniqueReach` (interne Variable) | `acceptable_internal` — lokale Computation-Variable, nicht exportiert. |
| `uniqueReachPercent` (Legacy-Dateien) | `out_of_scope` — Legacy-Dateien ausserhalb v3.5.1-Scope. |

---

## §4 Frequency-Terminologie Audit

### Kanonische Terms (§3)

```
frequency_weekly · frequency_campaign · pcap_share · pcap_abs · saturation_factor · wearout_factor
```

### Grep-Kommando

```
grep -rn "f_weekly|fWeekly|weeklyFreq|f_camp|fCampaign|frequencyCampaign" --include="*.ts" --include="*.tsx" lib/ app/ components/
```

### Findings

**`weeklyFreq`** — Feld in `PAKET_SPECS`-Konstante:
- `lib/preislogik.ts:145` — `weeklyFreq: number;` (Typ)
- `lib/preislogik.ts:149` — `sichtbar: { ..., weeklyFreq: 3, ... }`
- `lib/preislogik.ts:150` — `praesenz: { ..., weeklyFreq: 5, ... }`
- `lib/preislogik.ts:151` — `dominanz: { ..., weeklyFreq: 6, ... }`
- `components/steps/Step4Budget.tsx:413–415` — `PAKET_SPECS.sichtbar.weeklyFreq` etc.

Kanonisch gemäss §3: `frequency_weekly`

**`frequencyCampaign`** — öffentliches Feld, kamelisiertes §3-Term:
- `lib/preislogik.ts:91, 122, 577, 637, 702` — Berechnung + Export
- `components/campaign/StepPackages.tsx:73, 407, 428` — UI-Nutzung
- `components/shared/ImpactIndicator.tsx:166, 330` — Display

**`frequencyWeekly`** — öffentliches Feld, kamelisiertes §3-Term:
- `lib/preislogik.ts:578, 638` — Berechnung + Export
- `components/campaign/StepPackages.tsx:429` — UI-Nutzung

**`fWeekly`** — lokale Computation-Variable in `lib/preislogik.ts` (viele Stellen) und Test-Fixtures.

**`fCampaign`** — lokale Variable:
- `components/campaign/StepPackages.tsx:73, 428` — lokaler Shorthand

**`f_weekly`** — nur in Test-Fixtures (`app/test-internal/preislogik-curves/page.tsx`).

### Klassifikation

| Finding | Klassifikation |
|---|---|
| `weeklyFreq` (PAKET_SPECS-Feld, exportiert) | `needs_migration` — **Promotion-Blocker.** Umbenennung auf `frequency_weekly` vor v3.5.1-Promotion nötig. Betrifft: `lib/preislogik.ts`, `components/steps/Step4Budget.tsx`. |
| `frequencyCampaign` (öffentliches Feld) | `acceptable_internal` — TypeScript-camelCase von `frequency_campaign` (§3). Konvention-konform, kein Drift. |
| `frequencyWeekly` (öffentliches Feld) | `acceptable_internal` — TypeScript-camelCase von `frequency_weekly` (§3). Konvention-konform, kein Drift. |
| `fWeekly` (lokale Variable, Optimizer) | `acceptable_internal` — interner Shorthand, nicht exportiert. |
| `fCampaign` (lokale Variable, UI) | `acceptable_internal` — lokaler Shorthand, nicht user-facing. |
| `f_weekly` (Test-Fixture) | `acceptable_internal` — Test-Helper, kein Produktionscode. |

---

## §5 Saturation / Wearout Audit

### Kanonische Terms (§3)

```
saturation_factor · wearout_factor
```

### Grep-Kommando

```
grep -rn "saturation|wearout|wearOut|wear_out" --include="*.ts" --include="*.tsx" lib/ app/ components/
```

### Findings

**Saturation:**
- `lib/preislogik.ts:262` — `const saturationBudget = ...`
- `lib/preislogik.ts:266–267` — `if (raw >= saturationBudget)`
- `lib/preislogik.ts:569` — `const saturationFactor = 1 - Math.exp(-REACH_CURVE_K * ratio);`
- `lib/preislogik.ts:570–571` — `uniqueReach = Math.min(poolCap * saturationFactor, ...)`

**Wearout (lowercase pattern):** Keine Treffer.

**Wearout (tatsächliche Implementation):** Wearout ist aktiv, aber unter anderem Namen:
- `WEAROUT_FLOOR` — Konstante (aus CONTEXT.md: Wert 0.70)
- `applyWearoutFactor(weeks)` — Funktion, aufgerufen in `lib/preislogik.ts:574` auf `uniqueReach`
- Aufruf: `uniqueReach = uniqueReach * applyWearoutFactor(laufzeitWeeks);`

Wearout ist demnach **aktiv implementiert** — reduziert `uniqueReach` in Abhängigkeit der Laufzeit. RC-Spec §5.5 und §11 Sandbox-Soll-Werte müssen prüfen ob Wearout-Werte übereinstimmen.

### Klassifikation

| Finding | Klassifikation |
|---|---|
| `saturationFactor` / `saturationBudget` (interne Vars) | `acceptable_internal` — Computation-Variablen, nicht exportiert. |
| `wearout` (lowercase pattern) — keine Treffer | `promotion_gating` — Wearout ist aktiv als `applyWearoutFactor` + `WEAROUT_FLOOR`. RC-Spec §5.5 Kriterium muss via §11 Sandbox-Run verifiziert werden: stimmen Ist-Werte mit §11 Soll-Werten überein? |

---

## Gesamtklassifikation

| Bereich | Finding | Klassifikation |
|---|---|---|
| Pfad-B Status-Dimensionen | Keine Treffer im Code | `expected_missing` (Pfad-B noch nicht implementiert) |
| `reachMitte` (`lib/preislogik.ts:86, 126`) | Öffentliches Feld, exportiert | `needs_migration` **(Promotion-Blocker)** |
| `reachVon` / `reachBis` (`lib/types.ts:77–78`) | Confidence-Interval-Aliase | `legacy_alias` **(Promotion-Blocker)** |
| `weeklyFreq` (PAKET_SPECS, `lib/preislogik.ts:145`) | Kanonisch wäre `frequency_weekly` | `needs_migration` **(Promotion-Blocker)** |
| `fWeekly`, `frequencyCampaign`, `fCampaign` | Interne camelCase-Vars | `acceptable_internal` |
| `saturationFactor`, `saturationBudget` | Interne Computation-Vars | `acceptable_internal` |
| `applyWearoutFactor` existiert, lowercase `wearout` ohne Treffer | Wearout aktiv, §5.5-Soll/Ist unklar | `promotion_gating` §5.5 |
| Alle 11 Pfad-A Status-Codes | Vollständig vorhanden | `clean` |
| `overkill_frequency` (HinweisCode, ergänzt 12.05.) | Nicht in §7.2, nicht in v3.5.1-rc1-Spec | `obsolete_in_v3_5_1` — durch `qualityStatus = 'high_frequency'` (Pfad-B §8.8) ersetzt; Migration im Promotion-Task |

---

## Empfehlung für RC-Promotion

**3 Terminologie-Drifts (`reachMitte`, `reachVon`/`reachBis`, `weeklyFreq`) und 1 obsoleter HinweisCode (`overkill_frequency`) müssen vor v3.5.1-Promotion adressiert werden. Wearout-Verhalten (§5.5) muss via Sandbox-Run gegen §11 verifiziert werden. Promotion erst nach allen 5 Kriterien grün.**

### RC-Promotion Kriterien (Reminder)

1. §11 Sandbox Validation = 24/24 green (Re-Validierung gegen diese Spec)
2. Keine Reach/Frequency-Abweichung > ±2%
3. Wearout-Verhalten eindeutig: `applyWearoutFactor` aktiv gemäss §5.5 — Ist-Werte gegen §11 Soll-Werte verifiziert
4. `reachMitte` → `reach_unique_abs` migriert; `reachVon`/`reachBis` geklärt; `weeklyFreq` → `frequency_weekly` migriert
5. `overkill_frequency` HinweisCode entfernt (durch Pfad-B `qualityStatus` ersetzt)

Bei Fail von ≥1 Kriterium: Erstelle rc2 in neuem Task. Kein stilles Überschreiben von rc1.
