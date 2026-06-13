# DESIGN v7 — «Lebendes Dossier»

**Quelle:** `public/prototypes/vio-flow-v7-lebendes-dossier.html` (Stand 12.06.2026, v7.4)
**Status:** Prototyp-Designsystem. Ergänzt das bestehende `DESIGN.md`, ersetzt es nicht.
**Scope:** Geführter Politik-Pfad + Impactbuchung, Desktop-first.

---

## 1. Konzept

**Das Dossier ist das Produkt.** Der Flow ist kein Formular, das am Ende ein Resultat ausspuckt — jede Antwort wird sofort sichtbar Teil eines Dokuments, das rechts mitwächst: das **Präsenz-Dossier**. Es ist dasselbe Dokument, das der Kunde dem Vorstand vorlegt und das Stefan erhält. Dieselbe Geschichte, kein Bruch.

Drei Prinzipien:

1. **Ein Maschinenraum, zwei Eingänge.** Geführt und Impactbuchung teilen Anker, Weiche, Werbemittel, Wow, Abschluss — und dieselbe Risiko-Engine. Nur die Mitte unterscheidet sich.
2. **Understatement.** Souverän statt laut: kein Alarm-Rot als Fläche, Risiko als Punkt mit Ausweg, Empfehlung als Fakten, nicht als Verkaufstext.
3. **Der Punkt lebt.** Die Markensignatur (der Punkt in «vio.») ist das einzige «Wesen» im System — Charakter über Bewegung, nie über Niedlichkeit. Kein Maskottchen.

---

## 2. Layout

Drei-Spalten-Grid, volle Höhe (`100vh`), max. 1640px zentriert:

| Spalte | Breite | Inhalt |
|---|---|---|
| Rail | 228px | Marke, Schrittliste mit Fortschrittslinie, Fussnote |
| Flow | flexibel | aktiver Schritt, max. 640px Inhaltsbreite, eigener Scroll |
| Dossier | clamp(380px, 36vw, 480px) | Papier-Dokument, eigener Scroll |

Footer (Zurück/Weiter) klebt unten an der Flow-Spalte, halbtransparent mit Blur.

**Responsive:**
- ≤1180px: Rail kollabiert auf 64px (nur Punkte, Labels weg).
- ≤920px: einspaltig — Rail weg, Footer sticky, Dossier unter dem Flow.

**Hintergrund:** ruhige «Aura» — zwei grosse, stark geblurte violette Radial-Gradients, die sehr langsam driften (26s/32s). Nie im Vordergrund.

---

## 3. Tokens

```css
--violet:#6B4FBB; --violet-700:#5840A0; --ink:#2D1F52;
--violet-soft:#EFEBF9; --violet-tint:#F6F3FC;
--bg:#F4F2F9; --surface:#FFFFFF; --paper:#FFFEFB;
--line:#E6E1F2; --muted:#857DA0;
--go:#15A37E; --warn:#C98A2B; --alert:#BC5640;
--display:'Plus Jakarta Sans' (700/800); --body:'Jost' (400–600);
```

- **Headlines:** Plus Jakarta Sans 800, negatives Letter-Spacing (−.02em), `clamp(26px, 2.6vw, 36px)`.
- **Body:** Jost, 13–16px. Eyebrows: 12px, 600, Uppercase, Letter-Spacing .14em, violett.
- **Papier:** `--paper` ist minimal wärmer als `--surface` — das Dossier liest sich als Dokument, nicht als Panel.
- **Radii:** Karten 14–20px, Chips/Pills 99px (voll rund), Dossier-Papier 18px.
- **Schatten:** weich, violett-getönt (`rgba(45,31,82,…)`), nie hartes Schwarz.
- **Ampel nur als Punkt:** `lo`=go, `mid`=warn, `hi`=alert — 9px-Dot, nie als Flächenfarbe.

---

## 4. Motion-Sprache «Der Punkt lebt»

Alle Bewegung gehört einem Element: dem violetten Punkt. Auftritte:

| Moment | Verhalten |
|---|---|
| Marken-Punkt («vio.», Dossier-Kopf) | atmet: scale 1→1.22, 4s Loop |
| Rail-Fortschrittslinie | Punkt-Spitze wandert mit jedem Schritt mit (Linie wächst .6s) |
| Buchbar-Check | pulsierender Punkt statt Spinner; bei OK grüner Tick |
| «Weiter»-Klick | Punkt fliegt vom Button zur entstehenden Dossier-Sektion (.65s, danach Auflösen); am Schluss landet er auf dem Siegel |
| Dossier-Sektion füllt sich | kurzer «Tinten-Punkt» neben dem Label (einmalig, .9s) |
| Aktive Dossier-Sektion | kleiner pulsierender Punkt vor dem Label, Label violett |
| Risiko/Hinweis | Ampel-Dot mit sanftem Glow-Puls |
| Abschluss | Siegel-Stempel «VIO · Einschätzung bereit» (rotiert, federt ein) |

**Subtile Gesten (v7.3):**
- **Settle:** jede Auswahl (Chips, Pills, Karten, Pakete, Segmente) federt kurz ein — scale .965→1.012→1, .28s.
- **Wert-Flip:** geänderte Dossier-Werte faden mit 5px-Versatz neu ein (`vflip`, .35s) — nur bei echter Änderung, nie bei identischem Wert. Preis zählt per Tween hoch/runter (.42s).
- **Sanftes Mitscrollen:** Live-Anpassungen (Budget, Laufzeit) scrollen das Dossier zur betroffenen Sektion (`smooth`, `nearest`).
- **Weiter-Puls:** einmalig pro Schritt, sobald die Kernentscheidung getroffen ist (Glow-Ring, .9s, nie blinkend).
- **Slider:** 5 sichtbare Rastpunkte unter der Bahn, Wertanzeige poppt (.25s).
- **Enter = Weiter.** Im Geo-Suchfeld wählt Enter den ersten Treffer, in Budget-Feldern geht es direkt weiter.
- **Schritt-Einstieg:** Inhalte steigen gestaffelt auf (`rise`, 70ms Versatz pro Element via `--i`).

**Regeln:** Rückwärts fliegt nichts. `prefers-reduced-motion: reduce` deaktiviert alles. Ghost-Platzhalter im Dossier sind statisch — nur die gerade aktive Sektion schimmert.

---

## 5. Komponenten

- **Chips** (Art, Ebene, Quick-Geo): Pill-Form, on = violett gefüllt + Schatten, Hover hebt 1px.
- **Geo-Suche:** Suchfeld mit Typeahead-Dropdown über Land/Kanton/Bezirk/Gemeinde (max. 8 Treffer, Typ-Label rechts). Nicht-Buchbares ausgegraut mit «keine Flächen» — sichtbar, nicht versteckt. Gewähltes als violette Chips mit ✕. Ebene steuert Quick-Vorschläge: eidg. → «Ganze Schweiz wählen», kantonal → Kantons-Chips, kommunal → nur Suche.
- **Termin-Karten:** Wahlsonntage als Auswahl (Datum + Ebenen-Meta), kein Datumsfeld.
- **Buchbar-Check:** Karte unter der Geo; pulsierender Punkt → grüner Zustand mit Detail («38 DOOH-Standorte …»). Läuft bei jeder Geo-Änderung neu (debounced).
- **Weiche:** zwei grosse Modus-Karten, Tag «Beim ersten Mal» auf geführt.
- **Schwerpunkt-Slider:** 5 Rastpunkte, Basis ↔ Unentschlossene, kein «beides».
- **Zielgruppen-Toggle:** Partei oder Milieu, max. 2 Pills, Rest disabled.
- **Budget-Weiche:** zwei Radio-Karten; CHF-Feld erscheint nur bei «Wir haben ein Budget».
- **Justier-Karte (Einschätzung):** Budget-Stepper (±500), Laufzeit-Segmente (Kurz & dicht 14 · Empfohlen 28 · Lang & stetig 42), Gebiet-Link zurück zum Anker. Konsequenz-Zeile darunter, kursiv.
- **Paket-Karten (Impact):** Sichtbar/Präsenz/Dominanz mit Tagen + ab-Preis; freies CHF-Feld; Hinweis-Zeile (nie blockierend).
- **Werbemittel:** 3 Options-Karten, O2 (Plakat→Formate) mit Tag «Empfohlen», O3 mit «Bald».
- **Wow-Stage:** zweigeteilte Szene — City-Light-Stele (Ken-Burns-Sujet, Claim-Wechsel, LIVE-Dot) + Handy-Mockup (News-Feed-Skelett mit Anzeige). Labels: «Im öffentlichen Raum» / «Im Privaten». Darunter 4 Signal-Karten (qualitativ + Reach-Zahl) und das «So könnte es klingen»-Zitat auf Ink.
- **Abschluss-Pfade:** Direkt buchen (primär) · Offerte als PDF · «Kurz besprechen» erscheint ab CHF 12'000. Meta-Zeile: Sujet-Frist (Start − 5 Arbeitstage) + Sichtbarkeits-Nachweis.

---

## 6. Das Dossier

Papier-Karte mit violetter Randleiste links, Kopf: `vio.` + Status-Tag (**Entwurf** → **Bereit**), Titel «Präsenz-Dossier», Datum.

Sektionen (erscheinen nur für den aktiven Pfad, in Schritt-Reihenfolge):

| Sektion | gefüllt durch | Inhalt |
|---|---|---|
| Anlass | Anker | Art · Ebene · Termin |
| Gebiet | Anker | Gebiets-Chips + «Buchbar · 38 Standorte» |
| Wo ihr erscheint | Buchbar-OK | 2 Karten: öffentlicher Raum (Stelen) / privat (CH-Premium-Portale) — nie «DOOH»/«Display» |
| Stossrichtung *(geführt)* | Wen | Schwerpunkt + Zielgruppen-Chips |
| Budget *(geführt)* | Budget | Betrag oder «Empfehlung durch VIO» |
| Unsere Einschätzung *(geführt)* | Einschätzung | Zielbild · Ausgangslage · Hinweis-Dot · Empfehlung |
| Paket *(Impact)* | Eckwerte | Paket · Tage · Betrag · Reach + Hinweis-Dot |
| Werbemittel | Werbemittel | gewählte Option als Satz |
| Vorschau | Wow | Mini-Sujet + Kennwerte |

**Empfehlungs-Block (geführt):** ein kurzer Warum-Satz («Konzentriert auf eure Hochburgen — ab Versand der Stimmunterlagen.») + **2×2-Fakten-Karte**: Betrag (violett, Hero) · Reichweite · Laufzeit · Start. Langbegründung im Aufklapper «Warum diese Empfehlung? +». Leere Sektionen: stille matte Linien, Label sichtbar.

---

## 7. Engine (UI-relevante Regeln)

Eine Engine, zwei Modi — **gleiche Formel, andere Rolle**:

- `Risiko = Budget × Gebiet × Laufzeit`: `need = gebietLast × (laufTage/7) × Wochensatz`, `ratio = Budget/need` → niedrig (≥1.05) / mittel (≥0.8) / hoch.
- **Geführt:** VIO schlägt Budget und Laufzeit vor, Hinweis erscheint beim Justieren.
- **Impact:** Kunde setzt alles selbst; Hinweis mit konkreter Empfehlung, **nie blockierend** — buchbar ist es immer. Einzige harte Grenze: Minimum CHF 4'000.
- Risiko **nur mit Hebel** (fokussieren / straffen / erhöhen) — nie Angst ohne Ausweg.
- **Reach:** konservativer Floor, kommuniziert als «ca. X+ Stimmberechtigte», als Minimum gerahmt.
- **Nie in der UI:** Frequenz, CPM, Impressions, Kanal-Split-Prozente. Pakete zeigen Tage, keine Frequenzen.
- Laufzeit-Default: ab Versand der Stimmunterlagen (~3–4 Wochen vor Termin), gedeckelt durch verfügbare Zeit.

Alle Zahlen im Prototyp sind **Demo-Heuristiken** — Source of Truth bleibt der Regelkatalog (`vio-regelkatalog-politik-v3-6.md`, SPEC 3.7) bzw. die Splicky-Kalibrierung.

---

## 8. Ton

- Deutsch, ihr-Form gegenüber dem Komitee, Schweizer Orthografie, CHF mit Apostroph (6'000).
- Kurz, ruhig, konkret. Keine SaaS-Sprache, kein «revolutionär», kein Manipulations-Vokabular.
- Ehrlichkeit mit Ausweg: «Wir sagen ehrlich, ob es reicht» / «buchbar ist es so oder so».
- Souveränität beim Kunden: «Unser Rat, nicht euer Befehl.»
- Die Botschaft kommt immer vom Kunden — VIO macht Format und Bewegung (Haftungslinie).

---

## 9. Offene Punkte

- Demo-Heuristiken (Wochensatz 250, Reach-Faktor 4.8, Gebietslasten) durch Regelkatalog/Splicky ersetzen.
- Geo-Daten: vollständige buchbare Liste (~100 Gemeinden, Bezirke, Kantone) statt Demo-Ausschnitt; BFS-NRW-2023 für Partei/Milieu-Hochburgen.
- Wahlsonntag-Daten (Urnengang-Quelle) für die Termin-Liste.
- PDF-Export des Dossiers (Offerte) + Stefans aufklappbare Zahlen-Ebene (Frequenz/Kanal-Mix) — im Prototyp nur angedeutet.
- Assistenz-Chat «Vio-la»: Avatar = der atmende Punkt, keine Figur. Separat zu testen.
