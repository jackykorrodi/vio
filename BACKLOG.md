# VIO Backlog

Priorisierter Backlog für offene Arbeiten. Wird nach jedem Sprint nachgeführt.

Letztes Update: 02.06.2026 (Sprint 3 Phase B Abschluss — Coach + UI)

---

## P1 — Blocker / Live-Kritisch

- **Folge-Steps pfad-aware machen** — Werbemittel / Abschluss / Bestätigung / Email lesen noch `briefing.budget` und `briefing.laufzeit` direkt; im Custom-Pfad sind diese `undefined`. Custom-Pfad ist **nicht live-tauglich** ohne diesen Fix. Lösung: Steps lesen `briefing.pfad === 'custom' ? briefing.customConfig?.budget : briefing.budget` (und analog für laufzeit).

---

## P2 — Wichtig / Nächster Sprint

- **Paket-Rekalibrierung** — Variante a/b/c (Paket-Budget-Anpassung für v3.7) entscheiden und implementieren.
- **Custom-Pfad Reichweiten-Range (±Band)** — `calculateImpactCustom` liefert nur Punkt-Reach (kein Low/High). Outcome-Panel zeigt aktuell Punktwert; ±15%-Band analog `getUncertaintyBand()` im Paket-Pfad ergänzen.
- **`calculateImpactCustom` partnerCodeBoostPct-Parameter** — aktuell wird Boost über Budget-Approximation eingerechnet; sauberer wäre direkter `partnerCodeBoostPct`-Parameter analog zu `calculateImpact`.
- **`reach_collapse`-Schwelle regional-adaptiv** — aktuell fixer Threshold; sollte von Pool-Grösse abhängen.
- **Sweet-Spot-Re-Kalibrierung mit effektivem DOOH-Mix** — Coach nutzt doohAnteil ~0.7–0.8 (aus customImpact), Kalibrierung `SWEET_SPOT_TARGET_SATURATION = 4.0` war mit doohAnteil=0.6 durchgeführt. Nach erstem Live-Test mit realen Splicky-Inventardaten neu kalibrieren.
- **campaignStart an evaluateCustomConfig/checkDoohAvailability durchreichen** — `doohAvailable` prüft aktuell nur Inventar (Screens vorhanden), nicht ob Vorlauf `daysToVote < SETUP_VORLAUF_WERKTAGE`. Wenn campaignStart gesetzt wird, sollte checkDoohAvailability den Werktage-Vorlauf prüfen (Setup-Vorlauf-Check aktivieren).

---

## P3 — Technische Schulden / Pflege

- **Decision-Confidence-Layer** — UI-Signal für Konfidenz der Empfehlung (z.B. bei dünnem Inventar).
- **Karten-Outcome-Copy** — Pakete zeigen noch generische Texte; Region-spezifische Outcome-Copy ausstehend.
- **Toten Code im Custom-Mode aufräumen** — `handleBudgetChange`, alte `days`/`corridor`-State-Felder in `StepPackages.tsx` sind im Custom-Mode unreachable.
- **Terminologie-Migration Pfad A/B → Paket/Custom** — Interne Kommentare und §3 Glossar verwenden noch A/B; auf paket/custom migrieren.
- **Versionsloser Regelkatalog-Dateiname** — `vio-regelkatalog-politik-v3-6.md` enthält Versionsnummer; langfristig einen versionslosen Canonical-Namen überlegen.
- **Historische Doku-Artefakte prüfen/löschen** — `CLAUDE-CHAT-INSTRUCTIONS v3-4`, `DOMINANZ-FIX-PROMPT v2` und ähnliche Legacy-Dokumente auf Relevanz prüfen und ggf. entfernen.
- **`docs/partnercode-konzept.md` Sektion 5 präzisieren** — schreibt linearen +11%-Boost (Impression-Mathematik); tatsächlich ~5–7% Reach-Boost wegen Hofmans-Saturation. Mit «echtem Reach-Delta» und Variabilität je Region aktualisieren.
- **`freqWeekly`/`doohShare` aus `CustomConfig` entfernen** — deprecated seit Phase B (Slider entfernt, Defaults 5/0.6 nur noch TS-Pflicht für `calculateImpactCustom`-Signatur). Wenn `calculateImpactCustom` bereinigt wird, können die Felder aus `CustomConfig` raus.
- **`AllocationBar.tsx` löschen** — nicht mehr verwendet seit Phase B (Import entfernt aus StepPackages). Datei liegt noch in `components/campaign/`.
- **Ortsanker-Referenztabelle** — generischer Platzhalter-Satz im Outcome-Panel ("mehrere mittelgrosse Gemeinden"). Echte Vergleichswerte für 130 Regionen (Stimmbevölkerung) als Referenztabelle; TODO-Kommentar im Code markiert.

---

## OFFEN / Querschnitt

- **Live-Test Custom-Pfad im Browser** — vor Phase B UI-Rollout manuell durchspielen (Step 1 Q3 → Custom → Step 2 → weiter).
- **Mobile-Optimierung Steps 1+2 bei 390px** — Pfad-Karten und Custom-Konfigurator auf Mobilgrösse testen.
- **Cybersecurity-Review vor Go-Live** — ausstehend (kein Termin gesetzt).
- **Smoke-Output Datumsanzeige** — Timezone-Artefakt in Smoke-Test-Output (kosmetisch, kein Logik-Bug).
- **Tier-2 Snapshots auf v3.5.3 in Sandbox** — Sandbox-Seite zeigt noch "v3.6-Re-Validation ausstehend" für Tier-2-Snapshots; nach Custom-Pfad Live-Test aktualisieren.
