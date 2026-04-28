# VIO Challenge-Prompt v1 — Preis/Reichweiten/Frequenz-Logik

> **Zweck:** Externes LLM (Perplexity, GPT-5, Gemini, etc.) soll die VIO-Kernlogik kritisch challengen.
> Wir vergleichen die Antworten gegen interne Annahmen und dokumentieren Findings im Decision Log.
>
> **Version:** 1 · **Datum:** 20. April 2026 · **Status:** Live-Test
>
> **Copy-Paste-Bereich beginnt ab der ersten `═══`-Linie.**

---

## Meta (nicht mitkopieren)

- **Blind getestet:** keine Hinweise auf bekannte Issues (Tiered Cap für grosse Regionen, zwei parallele Modelle).
- **Bewusst offen gelassen:** echte CH-DOOH-Marktpreise, Splicky-Konditionen, interne Margen — wir wollen sehen, ob das LLM die Marktpreise selbst recherchiert oder nur auf Basis der gegebenen Zahlen argumentiert.
- **Erfolgskriterium:** Findet das LLM die parallele Modell-Inkonsistenz (Sektion 1+2 vs. Sektion 3) und die unrealistische lineare Skalierung bei grossen Regionen? Bonus: Arbitrage via Gemeinde-Stacking, Frequenz-Doppelzählung DOOH/Display.

---

═══════════════════════════════════════════════════════════════════
CHALLENGE-PROMPT BEGINNT HIER
═══════════════════════════════════════════════════════════════════

Du bist Senior-Analyst für Media-Pricing und Werbemarkt-Ökonomie.
Challenge die folgende Produkt-Logik einer Schweizer Self-Service-Plattform
KRITISCH — nicht wohlwollend. Fokus: wo sind Denkfehler, stille Annahmen,
unrealistische Skalierung, Arbitrage-Möglichkeiten, UX-Fallen oder
Geschäftsrisiken? Gib keine höflichen Komplimente. Geh jede Zahl auf
Plausibilität durch.

═══════════════════════════════════════════════════════════════════
PROJEKT-KONTEXT
═══════════════════════════════════════════════════════════════════

Produkt: VIO — Schweizer Self-Service-Plattform für DOOH (Digital
Out-of-Home, digitale Plakatwände) + Display-Werbung.

Zielgruppen: KMU, politische Akteure (Parteien/Komitees), NGOs, Verbände.
Also Kunden OHNE Mediaagentur, die heute keinen Zugang zu
professioneller Reichweite haben.

Positionierung: Einfachste Werbeplattform der Schweiz. Kunde bucht in
5–7 Schritten ohne Vorwissen. Kein Media-Planning, kein Sales-Gespräch
bis CHF 20'000 Budget.

Drei Flows:
• Politik (Abstimmungen/Wahlen) — Reichweite basiert auf Stimmberechtigten
• B2B — Reichweite basiert auf Mitarbeitenden der Zielunternehmen
• B2C — Reichweite basiert auf Einwohnern

Inventory: ~5'700 DOOH-Screens in der Schweiz (Bahnhöfe, Einkaufszentren,
Tankstellen etc.). Für Politik sind ~78% der Screens freigegeben. Display
läuft über DSP (Splicky) auf Schweizer Publishern.

Geschäftsprinzip: Budget-First. Kunde startet mit Budget, nicht mit
Reichweite. Plattform zeigt ihm, was er dafür bekommt.

═══════════════════════════════════════════════════════════════════
1. PAKET-MODELL (Politik & B2B identisch)
═══════════════════════════════════════════════════════════════════

Drei fixe Pakete, dynamisch gepreist je nach Region:

│ Paket    │ Reach % │ Frequenz │ Laufzeit │
├──────────┼─────────┼──────────┼──────────┤
│ Sichtbar │   15%   │    3×    │ 14 Tage  │
│ Präsenz  │   30%   │    4×    │ 28 Tage  │ (empfohlen)
│ Dominanz │   45%   │    7×    │ 35 Tage  │

Frequenz = kombiniert DOOH + Display, gewichtet.

═══════════════════════════════════════════════════════════════════
2. PREIS-FORMEL (linear)
═══════════════════════════════════════════════════════════════════

Fixe Annahmen:
• Budget-Split:  70% DOOH, 30% Display
• DOOH CPM:      CHF 50
• Display CPM:   CHF 15
• Misch-CPM:     CHF 39.50  (0.7×50 + 0.3×15)
• Mindestbudget: CHF 4'000 (Paket Sichtbar, still angewendet)

Berechnung:
  eligibleVoters        = Summe Stimmberechtigte aller gewählten Regionen
  targetReachPeople     = eligibleVoters × reachPercent
  requiredImpressions   = targetReachPeople × frequency
  rawBudget             = (requiredImpressions / 1000) × 39.50

Rundung:
  < 10'000         → auf 100er
  10'000–50'000    → auf 500er
  > 50'000         → auf 1'000er

═══════════════════════════════════════════════════════════════════
3. REICHWEITEN-RANGE (Tier-Modell, zweites Modell parallel zu 1./2.)
═══════════════════════════════════════════════════════════════════

Im Budget-Step wird dem Kunden kein exakter Wert gezeigt, sondern eine
Range "X–Y Personen". Dafür läuft ein separates Tier-Modell:

Tier-Zuordnung:
• Hochfrequenz: Städte Zürich/Bern/Basel/Genf/Lausanne/Winterthur/
                Luzern/St.Gallen + Kantone ZH/BE/GE/BS
• Mittelgross:  15 weitere Kantone (AG, VD, BL, LU, SG, TI, SO, TG,
                FR, NE, VS, GR, SZ, ZG, SH) + Städte mit ≥80 Screens
• Regional:     Rest

Tier-Parameter:

│ Tier         │ Präsenz │ MaxDurch │ Display │ Band  │
├──────────────┼─────────┼──────────┼─────────┼───────┤
│ Hochfrequenz │   70%   │   45%    │   30%   │ ±7%   │
│ Mittelgross  │   75%   │   55%    │   25%   │ ±10%  │
│ Regional     │   85%   │   75%    │   20%   │ ±13%  │

• Präsenzrate     = Anteil der Zielgruppe, der physisch im DOOH-Umfeld
                    erreichbar ist
• MaxDurchdringung = Anteil davon, der bei gegebenem Budget tatsächlich
                    getroffen wird (skaliert mit Paketfaktor)
• DisplayAnteil   = separater Display-Reach-Anteil (additiv, gedeckelt
                    auf 1.5× DOOH-Reach)
• Band            = Unsicherheitsband ±X% um die Mitte herum

Berechnung:
  doohMitte      = stimmber × Präsenz × MaxDurch × paketFaktor
  displayUnique  = min(displayBudget/15 × 1000 × 0.35, doohMitte × 1.5)
  gesamtMitte    = min(doohMitte + displayUnique, stimmber × 0.80)
  reachVon       = gesamtMitte × (1 − band)      → auf 500er gerundet
  reachBis       = min(gesamtMitte × (1 + band), stimmber × 0.80)

Hard Cap: 80% der Stimmberechtigten, nie höher.

═══════════════════════════════════════════════════════════════════
4. ZEIT-LOGIK (nur Politik)
═══════════════════════════════════════════════════════════════════

• Briefwahl-Offset: 28 Tage vor Abstimmung (Unterlagen im Briefkasten)
• Freigabe-Puffer:  10 Kalendertage für DOOH-Freigabe
• Kampagnenstart   = Abstimmung − 28 − Laufzeit
• Optimales Buchungsdatum = Kampagnenstart − 10

Empfehlungs-Logik je nach Tagen bis Abstimmung:
  ≥ 63 Tage  → Dominanz
  49–62     → Präsenz
  < 49      → Sichtbar

Alle Pakete immer buchbar, nichts wird gesperrt.

═══════════════════════════════════════════════════════════════════
5. WAS DEM KUNDEN GEZEIGT WIRD
═══════════════════════════════════════════════════════════════════

• Reichweite NUR als Range ("Deine Botschaft erreicht 45'000–55'000
  Zürcherinnen und Zürcher"), nie exakt
• CPM wird NIE gezeigt
• Kanal-Split (70/30) wird gezeigt
• Frequenz als "Ø X Kontakte pro Person", nie als "Frequency"
• Budget-Slider von CHF 4'000 bis CHF 200'000, Step 500

═══════════════════════════════════════════════════════════════════
AUFGABE
═══════════════════════════════════════════════════════════════════

Geh die Logik kritisch durch und beantworte:

1) MATHEMATISCHE INTEGRITÄT
   Wo bricht die Formel? Rechne konkrete Beispiele durch:
   - Gemeinde mit 5'000 Stimmberechtigten
   - Stadt Zürich (ca. 270'000 Stimmberechtigte)
   - Kanton Zürich (ca. 970'000 Stimmberechtigte)
   - Gesamte Schweiz (ca. 5.5 Mio Stimmberechtigte)
   Was kostet Dominanz in jedem Fall? Ist das realistisch verkäuflich?

2) MODELL-KONSISTENZ
   Das Paket-Modell (Sektion 1+2) und das Tier-Reach-Modell (Sektion 3)
   laufen parallel. Wo widersprechen sie sich? Was sieht der Kunde,
   wenn er zwischen den Steps hin- und herwechselt?

3) REACH vs. FREQUENZ-TRADE-OFF
   Die Formel skaliert linear: doppelte Reach-% = doppelte Impressions
   = doppeltes Budget. Ist das ökonomisch korrekt? Wo greift in der
   Realität sinkender Grenznutzen?

4) FREQUENZ-MODELL
   Frequenz 7× bei Dominanz — realistisch bei 35 Tagen Laufzeit auf
   DOOH+Display kombiniert? Wird Frequenz hier korrekt über Kanäle
   hinweg aggregiert, oder werden DOOH-Kontakte und Display-Kontakte
   naiv addiert?

5) DISPLAY-ROLLE
   Display wird im Tier-Modell als additiver Unique Reach behandelt,
   gedeckelt auf 1.5× DOOH-Reach. Sinnvoll? Oder übertreibt das den
   inkrementellen Reach von Display?

6) ARBITRAGE
   Wo kann der Kunde das System austricksen? Z.B. mehrere kleine
   Gemeinden statt einen Kanton buchen? Budget manuell unter Minimum
   drücken? Zeit-Empfehlung umgehen?

7) GESCHÄFTSRISIKO
   Was passiert, wenn die versprochene Reichweite nicht geliefert wird?
   Wo liegt das Delivery-Risiko bei fixem CPM und variabler Inventory-
   Auslastung?

8) UX-TRAPS
   Wo versteht der Kunde das Angebot falsch? Wo weckt die Darstellung
   Erwartungen, die das Produkt nicht halten kann?

9) BLINDE FLECKEN
   Was fehlt komplett in diesem Modell, das jede seriöse Media-Planung
   hätte?

Sei konkret. Gib Zahlen. Keine generischen "Consider X"-Sätze.

═══════════════════════════════════════════════════════════════════
CHALLENGE-PROMPT ENDET HIER
═══════════════════════════════════════════════════════════════════

---

## Auswertung — aggregierte Findings nach Runs

**Runs:**
- [x] Perplexity (20.04.2026 · Modell unbekannt)
- [x] ChatGPT (20.04.2026 · vermutlich GPT-5)
- [x] Claude-extern (20.04.2026 · ausserhalb Project-Kontext)
- [x] Gemini (20.04.2026 · vermutlich 2.5 Pro)
- [ ] Claude internes Sanity-Check (Datum: _____)

**Legende Schweregrad:** 🔴 Go-Live-relevant · 🟡 Vor Skalierung fixen · 🟢 Dokumentieren / später

**Legende Quelle:** P = Perplexity · C = ChatGPT · Cx = Claude-extern · G = Gemini · ⚑ = von uns vorher erwartet

---

### 🔴 Kritische Findings (Go-Live-relevant)

| # | Finding | Quelle | ⚑ | Action Item |
|---|---------|--------|---|-------------|
| 1 | **MISCH-CPM MATHEMATISCH FALSCH BERECHNET** (neu, kritisch): `0.7×50 + 0.3×15 = 39.50` aggregiert CPMs über Budget-Anteile — das ist rechnerisch inkorrekt. Bei 70/30 Budget-Split ist der tatsächliche effektive CPM **CHF 29.41** (1'000 CHF Budget → 14'000 DOOH-Imps + 20'000 Display-Imps = 34'000 Imps total). Unsere Formel unterstellt 25'316 Imps pro 1'000 CHF, real sind es 34'000 → **~34% Diskrepanz**. Drei mögliche Erklärungen: (a) wir liefern silent 34% mehr Impressions als ausgewiesen (stille Marge, intransparent), (b) echte CPMs oder Split stimmen nicht, (c) 70/30 ist eigentlich Impressions-Split — dann wäre der echte Budget-Split 88.6%/11.4%, und unser "Kanal-Split 70/30" in der UI ist falsch. | Cx (G hat es NICHT gefunden) | ✗ | **Vor jeder weiteren Änderung:** Stefan/Dani + Code prüfen was aktuell tatsächlich umgesetzt ist. Dann bewusst entscheiden: CPM korrigieren (auf 29.41), Budget-Split als Impressions-Split deklarieren, oder Formel grundlegend umbauen. Ist Fundament — bis das nicht geklärt ist, sind alle anderen Paketlogik-Fixes blind. |
| 2 | **Zwei inkompatible Produktwahrheiten:** Paket-Modell verkauft Reichweite deterministisch (45%×7×), Tier-Modell zeigt sie probabilistisch (Range, tierabhängig, gecapped). Konkrete Divergenzen: Zürich Präsenz — Paket 81'000 vs. Tier-Range 162'500–186'851 (Cx). G schärft: "Kunde zahlt für einen VW, kriegt auf dem Papier einen Porsche und wird am Ende der Kampagne realisieren, dass das Reporting nicht mit dem Versprechen übereinstimmt." | P+C+Cx+G | ⚑ | Grundsatz-Entscheid vor Go-Live: EIN Modell nach aussen. Entweder budgetbasiertes Angebotsmodell mit Range, oder paketbasiertes Produktmodell mit Lieferlogik — nicht beides parallel. |
| 3 | **Over-Frequency in Kleinstgemeinden:** Mindestbudget CHF 4'000 in 5k-Gemeinde erzeugt mathematisch 45 Kontakte/Person (25 beim 80%-Cap), Paket sagt aber "7× Dominanz". Struktureller Bruch zwischen Paket-Versprechen und Mathematik. Cx: "das ist kein Marketing mehr, das ist Stalking". G: "6.4-faches des nötigen Budgets, völlig übersättigte Kampagne, wird im UI weiterhin als Dominanz verkauft". | C+Cx+G | ⚑ | Bewusste Entscheidung: (a) Over-Frequency als Feature akzeptieren + transparent kommunizieren, (b) Paketformel tier-gewichtet umbauen, oder (c) Untergrenze für Paket-Anwendbarkeit pro Regionsgrösse (Min-Reach statt Min-Budget). |
| 4 | **Delivery-Risiko fix-CPM vs. auction-basierter Einkauf:** Wir verkaufen fixen Misch-CPM. Splicky läuft auction-basiert. Bei Wahl-Peaks/Inventory-Engpässen schluckt Plattform das Delta → Margin-Risiko. Cx: Wahltag-Szenario mit 5+ Komitees/Parteien auf denselben ~4'446 Politik-freigegebenen Screens. G konkret: "Wenn SSP-Bietpreise auf CHF 60 hochschnellen, zahlt VIO bei jeder Ausspielung drauf oder liefert nicht aus (Underdelivery & Vertragsbruch)". | P+C+Cx+G | ✗ | Stefan/Dani brief: realistische Spreizung DOOH-CPM im Splicky-Deal + mit DOOH-Partnern? Fallback-Regel bei Auction-Spitzen. Overbooking-Schutz vor Wahlen/Abstimmungen definieren. |
| 5 | **Tiered Reach Caps für grosse Regionen fehlen:** Lineare CPM-Formel skaliert unrealistisch (Kanton ZH, CH). Floor-Logik nötig. | P+C+Cx+G | ⚑ | Schon im Tech-Debt (`lib/vio-paketlogik.ts`): tiered reach caps nach Populationsgrösse implementieren. |
| 6 | **Slider-Max vs. Schweiz-Dominanz-Overflow:** CHF 684k (Schweiz × 45% × 7×) übersteigt Slider-Max CHF 200k. Flow bricht für genau die Kunden, die am meisten zahlen könnten. G: "Eine nationale Dominanz-Kampagne ist auf dieser Plattform buchstäblich unmöglich zu buchen." | Cx+G | ✗ | Code-Review im Pricing-Flow: was passiert bei raw_budget > slider_max? Entscheidung: (a) Slider hoch auf 1M, (b) Dominanz für nationale Buchungen sperren und Enterprise-Flow triggern, (c) automatischer Fallback auf Präsenz/Sichtbar mit Kommunikation. |
| 7 | **TIMING-EXPLOIT: Kampagne endet genau zu Briefwahl-Start** (neu von G, potenziell kritisch): Formel `Start = Vote − 28 − Laufzeit` bedeutet bei Dominanz (35 Tage) → Kampagne läuft von Vote−63 bis Vote−28. **Ab Tag −28 (Briefwahl-Versand) läuft keine Werbung mehr.** Gemini: "In der heissesten Phase der Meinungsbildung findet null Werbung statt." Realität Schweizer Abstimmungskampagnen: klassischer Werbe-Peak ist 2-3 Wochen vor Abstimmung, viele Stimmende füllen Zettel spät aus. Unsere Design-Annahme (Kampagne muss VOR Unterlagenversand fertig sein) ist strategisch fragwürdig. | G | ✗ | **Strategie-Entscheid mit Co-Founder:** Soll die Kampagnenlogik überarbeitet werden? Optionen: (a) Kampagnenende = Abstimmung selbst (läuft durchgehend), (b) Pflicht-Overlap in Briefwahl-Periode (z.B. 14 Tage), (c) zweigeteilte Kampagnen (Prä-Briefwahl + End-Spurt). Validieren gegen echte Abstimmungsdaten: wann stimmen CH-Bürger tatsächlich ab? |

---

### 🟡 Strukturelle Findings (vor Skalierung fixen)

| # | Finding | Quelle | ⚑ | Action Item |
|---|---------|--------|---|-------------|
| 8 | **Gemeinde-Stacking-Arbitrage:** Mehrere Kleingemeinden statt Kanton buchen fällt in Regional-Tier (85% Präsenz, ±13% Band) → höhere Reach-% bei gleichem Budget. Cx konkret: 20 ZH-Gemeinden à CHF 4'000 = CHF 80'000 vs. Kanton ZH Dominanz CHF 121'000 → **CHF 41k Ersparnis**. G: "Cherry-Picking bei Tiers zwingt System, Impressions in wertlose lokale Screens zu pumpen". | P+C+Cx+G | ✗ | Paketformel tier-gewichtet machen (aktuell kennt sie keine Tiers). Mittelfristig: Überlappungs-Erkennung bei Mehrfachbuchung in geografischer Nähe. |
| 9 | **Paket-Stacking-Vektor:** Kann derselbe Kunde Sichtbar + Präsenz + Dominanz parallel buchen? Wenn ja: 80%-Cap greift pro Buchung statt pro Kampagne → theoretisch 240% Reach. | Cx | ✗ | In Pipedrive / Buchungslogik prüfen: Duplicate-Detection pro Kunde+Region+Zeitraum. |
| 10 | **"Stimmberechtigte" ≠ erreichte Personen** (neu von G): DOOH-Screens haben keinen Pass-Scanner. Strahlen auf Einwohner, Touristen, Minderjährige, Grenzgänger. G: "In städtischen Gebieten teils 30% keine Schweizer Stimmbürger" (Inference, nicht belegt). Unsere Wording "45'000 Stimmberechtigte erreicht" ist formal falsch — korrekt: Impressions auf Personen im Wirkraum von Screens. Relevant für Haftung + Transparenz bei politischen Komitees. | G | ✗ | Wording überarbeiten: "X Personen im Wirkraum" statt "X Stimmberechtigte erreicht". Streuverlust-Disclaimer einbauen. Longterm: Kalibrierungsfaktor für Non-Stimmberechtigte pro Region. |
| 11 | **B2B-Zielgruppenmodell zu naiv:** "Mitarbeitende der Zielunternehmen" ist kein Reichweitenuniversum. Cx: DOOH-Screen im HB kann UBS-Mitarbeitende nicht identifizieren ausser über Device-ID-Matching mit <50% Genauigkeit. (G hat B2B kaum adressiert — Fokus stark auf Politik.) | C+Cx | ✗ | B2B-Paketlogik grundsätzlich überdenken. Mittelfristig: Universum realistischer modellieren. |
| 12 | **Cross-Channel-Frequency-Deduplication fehlt:** DOOH-Kontakte + Display-Kontakte werden naiv addiert. Cx: Zürich Dominanz liefert real 9.4× Frequenz, nicht 7×. G: "DOOH-Kontakt (10-Sekunden-Vorbeilaufen im Bahnhof) und Display-Kontakt (Banner im unteren Bildschirmrand) naiv zu addieren ist handwerklicher Unfug. Ein Kontakt ist nicht gleich ein Kontakt." | P+C+Cx+G | ✗ | Overlap-Annahme einbauen (konservativ: −30% bei urbanen Zielgruppen). Gewichtete Kontakte prüfen (DOOH = 1.0, Display = 0.3-0.5). Kurzfristig: Wording anpassen (siehe #14). |
| 13 | **Display als Unique-Booster statt Frequenzverdichter:** 1.5×-DOOH-Cap ist Produktannahme ohne empirische Basis. G konkret: "Display verkauft Luft, indem die Plattform behauptet, der Display-Kanal treffe ausschliesslich Menschen, die an keinem Plakat vorbeigelaufen sind — erfindet Geister-Nutzer." Cx: Realistisch wären 30-50% inkrementeller Unique Reach. 0.35-Faktor in `displayBudget/15 × 1'000 × 0.35` ist Magic Number. | C+Cx+G | ⚑ | Display-Rolle in Paketlogik re-framen. 1.5×-Faktor und 0.35-Koeffizient empirisch prüfen mit Splicky-Daten. Dokumentieren oder neu herleiten. |
| 14 | **Wording "Ø 7 Kontakte pro Person" als Leistungsversprechen:** Klingt härter/messbarer als unser Modell hergibt. Cx: starke Schiefe — 30% sehen 1-2×, 30% sehen 15-20×. G: "Durchschnitts-Lüge: Ø von 4 bedeutet 80% sehen es 1×, 5% der Pendler am Kiosk 60×." Plus G's OTS-Benchmark: "Echte Dominanz im OOH erfordert OTS 15-20+ pro Woche" — unsere 7× in 35 Tagen = 1.4×/Woche sind weit darunter. | C+Cx+G | ✗ | Sprache entschärfen: "wiederholte Präsenz über mehrere Wochen" / "hohe Sichtbarkeit" statt exakter Kontaktzahl. Paket-Naming prüfen: ist "Dominanz" bei 1.4×/Woche OTS haltbar? |
| 15 | **Reichweite-Range als implizites Leistungsversprechen:** "45'000–55'000 erreicht" liest sich als realistische Lieferzone. Cx: Exposure-zu-aktiver-Wahrnehmung bei DOOH liegt bei 20-40%. Haftungsrisiko bei Underdelivery. | C+Cx | ✗ | Konservativer modellieren + Disclaimer. Alternative: Reichweitenklasse statt Zahlenrange. |
| 16 | **Paketfaktor (0.35/0.60/0.80) undokumentiert:** Im Prompt erwähnt, im Code vorhanden, Herleitung nirgends dokumentiert → nicht auditierbar. | C+Cx | ✗ | In DESIGN.md oder `/docs/paketfaktor-herleitung.md` dokumentieren. |
| 17 | **Zeit-Empfehlung ist Deko + Briefwahl-Window bei <42 Tagen:** Dominanz bleibt wählbar trotz Empfehlung Sichtbar. Cx: bei <42 Tagen bis Abstimmung ist selbst Sichtbar (14 Tage Laufzeit) nicht mehr im Briefwahl-Window. Bei 30 Tagen Vote + Dominanz (35 Tage) = mathematisch unmöglich. (Hinweis: dieses Finding überlappt mit #7 Timing-Exploit, bleibt aber separat für UX-Side.) | C+Cx | ✗ | Soft-Discouragement + Warnhinweis. Hard-Block oder automatische Laufzeit-Kürzung bei unmöglichen Kombinationen. |
| 18 | **Share of Time (SoT) fehlt komplett** (neu von G): DOOH-Screens laufen typischerweise 60-Sekunden-Loops. Unser 10-Sekunden-Slot = 16% SoT. Ohne SoT-Garantie kann Splicky/Partner unsere Impressions in Trash-Zeiten (Montag 03:00 Dorfbahnhof) ausspielen, um Impression-Ziele zu erreichen — bei schlechterer Wirkung. | G | ✗ | **Mit Dani klären:** gibt es im Splicky-Deal SoT-Garantien? Wenn nein, wie wird Ausspielzeitraum kontrolliert? Dokumentieren und ggf. vertraglich nachschärfen. |

---

### 🟢 Dokumentieren / spätere Iteration

| # | Finding | Quelle | ⚑ | Action Item |
|---|---------|--------|---|-------------|
| 19 | **Lineare Reach-Skalierung ignoriert Grenznutzen:** Kostenkurve sollte nichtlinear sein (Sättigungskurve). Cx: Sichtbar→Präsenz braucht real ~2.3× Imps, Präsenz→Dominanz ~1.8-2×. G: "Ab 30% steigt die Wahrscheinlichkeit massiv, denselben Heavy Pendler zum 20. Mal zu treffen, statt eine neue unerreichte Person." | P+C+Cx+G | ✗ | Post-Go-Live mit echten Kampagnendaten kalibrieren. Saturation-Faktor pro Tier. |
| 20 | **Creative-Effekt als blinder Fleck:** Medienmenge ≠ Werbewirkung. | C+Cx | ✗ | Expectation Management in Onboarding. Sauber kommunizieren: wir liefern Mediaplan + Ausspielung, nicht Performance. |
| 21 | **Inventory-Verfügbarkeitsprüfung vor Buchung fehlt.** | C+Cx | ✗ | Mittelfristig: Verfügbarkeits-API gegen Splicky + DOOH-Partner. Kurzfristig: konservative Floors + manuelle Freigabe bei Grossbuchungen. |
| 22 | **Budget-Slider bis CHF 200'000 trotz Calendly ab CHF 20'000.** Cx: kantonale Komitees budgetieren 20-80k für Gesamtkampagne — unsere Kanton-Dominanz CHF 121k ist für diese Zielgruppe nicht Self-Service-kompatibel. G: "Kunden mit >100k Budget verlangen Agentur-Pitch, Rabatte und garantiertes Share-of-Voice-Reporting, keinen 5-Klick-Wizard." | C+Cx+G | ✗ | Obergrenze Slider auf CHF 20k setzen + Enterprise-Flow für Grosskampagnen? |
| 23 | **Kontaktqualität nicht differenziert:** Bahnhof HB ≠ Tankstelle peripher. Cx: "APG\|SGA rechnet DOOH-Inventory mit Audience-Faktor pro Screen". G: "Ein gigantischer E-Board-Screen im Zürcher HB ist in dieser Formel genauso viel wert wie ein kleiner Zapfsäulen-Bildschirm in Graubünden." | C+Cx+G | ✗ | Langfristig: Premium-/Basis-Split pro Region. Kurzfristig: akzeptierter Trade-off. |
| 24 | **Politik-Freigabe ist nicht einfach "78% frei":** Restriktionen variieren pro Vermarkter. | C | ✗ | Edge-Case-Screening mit Dani: wo brechen die 78% konkret? |
| 25 | **Day-Parting fehlt:** Morgen-Pendler ≠ Abend-Shopping ≠ Wochenende. | Cx+G | ✗ | V2-Feature. |
| 26 | **Wear-Out / Sujet-Rotation:** Ab ~12 Kontakten kippt Wirkung ins Negative. Bei Kleinregionen (#3) weit drüber. | Cx | ✗ | Post-Go-Live: Sujet-Rotation im Ad-Creator ermöglichen. |
| 27 | **Targeting jenseits Geografie:** Politik in CH nicht rein geografisch (Sinus-Milieus). Geo-only-Logik trifft SVP- und SP-Wähler gleich. | Cx | ✗ | V2-Feature. Erfordert Publisher-Daten-Integration. |
| 28 | **Messung / Attribution fehlt komplett:** Kunde weiss hinterher nicht, ob's gewirkt hat. | Cx | ✗ | V2-Feature. Post-Kampagnen-Report mit Impressions + geografischer Delivery. |

---

### Was NICHT ins Backlog geht (kritisch einsortiert)

| Finding aus LLM | Quelle | Warum nicht übernommen |
|-----------------|--------|------------------------|
| "45× Überpreisung" beim Mindestbudget | P | Methodisch falsches Framing — Mindestbudget ist keine Preiserhöhung pro Kontakt, sondern Budget-Floor. Das echte Problem (Over-Frequency) ist in #3 sauberer gefasst von C+Cx. |
| "DOOH-CPM real CHF 50–100" | P | Marktpreis-Claim ohne Quelle. Programmatic DOOH via Splicky liegt typischerweise tiefer als Premium-Direct. Validierung gegen Partner-Konditionen nötig. |
| "APG\|SGA TKP CHF 2-5" | C | Vermutlich klassisches Plakat / Rail, nicht dynamisches Programmatic DOOH mit Targeting. Die konkreten Zahlen sind mit Stefan/Dani zu validieren. |
| "DOOH-CPM real CHF 15-35 programmatisch" | Cx | Explizit als "Inference, exakte Marktzahlen sind NDA" markiert. Ehrlicher als P+C, aber bleibt Vermutung. Drei LLMs schätzen CHF 2-5 (C), CHF 15-35 (Cx), CHF 50-100 (P) — Spektrum ist zu breit, um ohne eigene Daten zu handeln. |
| "Kantonale Komitees budgetieren 20-80k gesamt" | Cx | Inference, nicht belegt. Plausibel, aber Datenpunkt nötig vor strategischer Repositionierung. Geht in #19 als Hinweis, nicht als Fakt. |
| "Viewability DOOH 20-40%" / "Display CH 65-75%" | Cx | Inferences, nicht belegt. Relevant für Modellkalibrierung post-launch, nicht für Formelstruktur jetzt. |
| Konkrete Tier-Reach-Zahlen "Mitte ~65'000 für Zürich Sichtbar" | P | Rechnerisch falsch — korrekt ~45'000. Die Divergenz zwischen Modellen ist real, aber die konkreten Zahlen von Cx (Zürich Präsenz: 81k Paket vs. 162k Tier) sind belastbarer. |
| "Frequency-Capping stoppt bei 5-6×" für DOOH | P | Konzept-Verwechslung — Frequency-Capping ist Display-Logik, für DOOH gibt's technisch kein User-Level-Capping. |
| "Viewability 30-50%" als Challenge des 0.35-Faktors | P | Konzept-Verwechslung — der 0.35-Faktor ist Unique-Reach-Koeffizient, nicht Viewability. Cx bestätigt separat, dass der Faktor undokumentiert ist (→ #11). |
| Multi-Account-Inventory-Hoarding | P | Spekulativ, kein konkreter Angriffsvektor ohne KYC-Modell. |
| "Brand-Safety / Context-Ausschluss" als eigener Punkt | Cx | Wichtig, aber via DSP-Settings (Splicky) standardmässig abgedeckt. Nicht eigener Fix nötig. |
| "MRC-Standards / Viewability" als Modell-Anforderung | Cx | V2-Thema, nicht für Self-Service-Claim kritisch. Branchen-Standard, aber unsere Messung läuft über Splicky-Reports. |

---

### Konvergenz-Analyse (alle vier Runs)

**Alle vier Runs konvergent auf:**
- Modell-Inkonsistenz Paket vs. Tier (#2)
- Delivery-Risiko fix-CPM (#4)
- Tiered Reach Caps fehlen (#5)
- Gemeinde-Stacking-Arbitrage (#8)
- Cross-Channel-Frequency-Problem (#12)
- Lineare Skalierung ignoriert Grenznutzen (#19)

**Drei von vier (C+Cx+G ohne P):**
- Over-Frequency in Kleinstgemeinden mathematisch quantifiziert (#3)
- Display-Rolle falsch geframed (#13)
- Wording "Ø 7 Kontakte" als Leistungsversprechen (#14)

**Zwei von vier (Cx+G):**
- Slider-Max vs. Schweiz-Overflow (#6)
- Kontaktqualität nicht differenziert (#23)

**Nur von Gemini gefunden (einzigartig):**
- **Timing-Exploit / Kampagne endet bei Briefwahl-Start** (#7) — potenziell kritischer strategischer Punkt
- **"Stimmberechtigte" ≠ erreichte Personen** (#10) — Streuverlust bei DOOH
- **Share of Time (SoT) fehlt komplett** (#18) — Planungs-Parameter
- **OTS-Benchmark**: Echte OOH-Dominanz braucht 15-20+/Woche, unsere 7× in 35 Tagen = 1.4×/Woche (eingeflossen in #14)

**Nur von Claude-extern gefunden (einzigartig):**
- **Misch-CPM-Bug** (#1) — der potenziell fundamentalste Finding
- **Paket-Stacking-Vektor** (#9)
- **Briefwahl-Window < 42 Tage bricht Empfehlungslogik** (#17)
- **Wear-Out / Sujet-Rotation** (#26)

**Nur von ChatGPT gefunden (einzigartig):**
- **B2B-Zielgruppenmodell zu naiv** (#11) — G hat B2B kaum adressiert
- **Paketfaktor undokumentiert** (#16)

**Nur Perplexity:** Keine substanziellen Unique-Findings.

### Wichtige Meta-Erkenntnis zum Misch-CPM-Bug

**Nur Claude-extern (1/4) hat den CPM-Bug gefunden.** Gemini hat die Zahl 39.50 einfach unhinterfragt durchgerechnet, statt sie mathematisch zu challengen. Das hat zwei Implikationen:

1. **Wir haben keine LLM-Konvergenz auf diesen Finding** — also müssen wir ihn selbst verifizieren im Code, nicht auf "3/4 LLMs bestätigen es" vertrauen.
2. **LLM-Konvergenz ist kein Wahrheitsmass** — auch eine 3/4-Konvergenz hätte uns den Bug nicht garantiert. Drei LLMs können denselben Basiswert unhinterfragt übernehmen.

Daraus folgt: Claude-extern's Finding ist weder bestätigt noch widerlegt durch die anderen Runs. Es bleibt unsere Aufgabe, im Repo zu prüfen.

### Einschätzung der vier Runs

| Aspekt | Perplexity | ChatGPT | Claude-extern | Gemini |
|--------|-----------|---------|---------------|--------|
| Strukturelle Produkt-Kritik | B | A | A | A |
| Mathematische Schärfe | C (Rechenfehler) | A | A+ (CPM-Bug) | B (Formeln übernommen) |
| Schweiz-Marktkenntnis | C (generisch) | B | B (ehrliche Inferences) | A (OTS-Benchmarks) |
| Strategische Tiefe | C | A | A | A+ (Timing-Exploit) |
| Neue Findings | 1 | 10 | 6 (davon 1 kritisch) | 4 (davon 1 kritisch) |
| Ton | neutral | differenziert | analytisch | scharf/polemisch |

**Gesamt-Urteil:** Die vier Runs ergänzen sich stark. Keiner allein hätte gereicht. Perplexity war hauptsächlich Konvergenz-Check für uns, die anderen drei haben je unterschiedliche Stärken:
- **ChatGPT:** breiteste strukturelle Abdeckung
- **Claude-extern:** mathematische Fundament-Prüfung
- **Gemini:** strategische/praxisnahe Produktkritik (Timing, SoT, OTS)

Das bestätigt: für scharfe Analyse komplexer Systeme lohnt sich der Multi-Model-Ansatz — nicht nur als Validierung, sondern als Ergänzung.

### Meta-Lesson für Challenge-Prompts

- **Prompt ist scharf genug** — alle A-Level-LLMs haben substanzielle Findings produziert.
- **Blind-Testing funktioniert** — keine Hinweise auf bekannte Issues im Prompt, trotzdem haben 3/4 LLMs die Tiered-Cap-Problematik eigenständig gefunden.
- **Multi-Model notwendig** — kein Einzellauf hätte das vollständige Bild ergeben. Prompt v2 würde den Nutzen schmälern: Vergleichbarkeit der Runs wichtiger als marginale Prompt-Verbesserungen.
- **LLM-Konvergenz ≠ Korrektheit** — dokumentierter Fakt jetzt dank Misch-CPM-Bug (1/4 gefunden, andere nicht widersprochen).

---

## Nächste Schritte (Entscheidungs-Dependencies)

**Sofort (diese Woche):**

1. **🔴 MISCH-CPM-BUG SELBST VERIFIZIEREN** (#1) — Code-Review `lib/vio-paketlogik.ts` + Pricing-Flow: werden 34'000 Imps pro 1'000 CHF eingekauft oder 25'316? Keine LLM-Konvergenz — muss im Code geprüft werden. Blockiert alle Paketlogik-Änderungen.

2. **🔴 TIMING-EXPLOIT STRATEGISCH ENTSCHEIDEN** (#7) — Mit Co-Founder: ist unsere Briefwahl-Offset-Logik haltbar? Soll Kampagne über Tag −28 hinaus laufen? Validieren gegen echte Abstimmungsdaten wann CH-Bürger stimmen. Entscheid blockiert Paket-Laufzeit-Definition.

3. **🔴 SLIDER-OVERFLOW** (#6) — Code-Review: was passiert bei raw_budget > 200'000? Einzeln fixbar, nicht blockierend.

**Parallel:**

4. **Grundsatz-Entscheid Modell-Architektur** (#2) — blockiert alle Paketlogik-Änderungen nach CPM-Fix.
5. **Stefan/Dani-Briefing** zu Delivery-Risiko (#4) + Share-of-Time (#18) + CPM-Realität — braucht externe Daten.
6. **Wording-Review** (#10, #14, #15) — kann parallel laufen, nicht blockiert.

**Strategic:**

7. **Go-Live mit offenen Findings?** Entscheiden welche der 🔴 wirklich Pre-Go-Live-Blocker sind. Meine Einschätzung: #1 + #2 + #7 sind echte Blocker. #3 + #4 + #5 + #6 können mit dokumentiertem Workaround go-live-fähig gemacht werden.


