# VIO Partnercode-System — Operativ-Konzept v1.2

**Status:** Implementiert in Politik-Flow Step 2 (Phase 1, Mock-Validierung)
**Vorstufe zu:** Regelkatalog v3.5.2 (oder eigenständiger Anhang)
**Letzte Änderung:** 2026-05-20
**Änderungen v1.2:** Sektion 4 und 5 korrigiert nach Sandbox-Verifikation. Hofmans-Sättigung führt zu regional/budgetabhängig variablem Reach-Delta; UI zeigt echten Delta, nicht konfigurierten Boost-Prozentwert.
**Änderungen v1.1:** Wording-Pattern überarbeitet (ruhig, kein Discount-Vibe). Vermittler-Code-Tracking vereinfacht: Eingabe immer manuell, keine URL-Attribution. Backend-Architektur ausgeklammert (folgt mit Gesamt-Backend-Design).

---

## 1. Zweck

Das Partnercode-System etabliert einen zusätzlichen Vertriebskanal über Vermittler (Agenturen, Berater, PR-Büros, Verbände, selbstständige Verkäufer), ohne dass VIO klassische BK/VMK-Modelle anbietet.

Gleichzeitig dient derselbe Mechanismus dem Direktvertrieb (Stefan) zur Endkunden-Aktivierung mit zusätzlicher Reichweite.

**Positionierung:** VIO arbeitet nicht mit Mondpreisen. Der Listenpreis ist der echte Preis. Codes wirken transparent als zusätzliche Reichweite, nicht als CHF-Rabatt. Konsistent verwendetes Vokabular im UI: **Partnercode**, **Partnerkampagne aktiviert**, **zusätzliche Reichweite**. Niemals: Rabatt, Promo, Gutschein, Discount.

---

## 2. CPM-Puffer-Mechanik

Der ausgewiesene Listen-CPM enthält einen Channel-Puffer von 10%. Dieser Puffer ist die einzige Quelle für Reach-Boosts und Vermittler-Provisionen. Die effektive VIO-Marge bleibt in allen Szenarien konstant.

| Grösse | Wert |
|---|---|
| Echter Misch-CPM (VIO-Netto) | 39.50 CHF |
| Listen-CPM (mit 10% Puffer, branchenüblich) | **43.89 CHF** |
| Berechnungsformel | `Listen-CPM = Echter CPM / (1 − Puffer%)` = `39.50 / 0.90` |
| Puffer-Topf pro Buchung | `10% × Budget` |

---

## 3. Code-Typen und Splits

Jeder Code hat einen festen Split zwischen Reach-Boost (Endkunde) und Provision (Vermittler). Der Puffer wird zu 100% aufgeteilt. Die Eingabe erfolgt immer manuell im Booking-Flow.

| Code-Typ | Reach-Boost (Endkunde) | Provision (Vermittler) | Eingabe durch | Einsatz |
|---|---|---|---|---|
| **Direct** | 100% (volle 10%) | 0% | Endkunde | Direktvertrieb durch Stefan |
| **Agentur** | 50% (5%) | 50% (5%) | Endkunde oder Vermittler | Agenturen, Mediabuyer, PR-Büros |
| **Vermittler** | 0% | 100% (volle 10%) | Vermittler (bucht für/mit Endkunde) | Verbände, Kammern, reine Provisionspartner |

**Vermittler-Code (0% Endkunden-Boost):** Greift nur dann, wenn der Vermittler die Buchung im Namen des Endkunden vollzieht oder gemeinsam mit ihm am Bildschirm sitzt. Der Endkunde sieht keinen Reach-Boost; das UI bestätigt nur, dass der Code akzeptiert wurde.

---

## 4. Reach-Berechnung mit Code

Der Code wirkt **vor dem Reach-Cap** auf die ausgelieferten Impressions. Frequenz bleibt Paket-Charakteristik (3× / 5× / 6×) und wird vom Code nicht beeinflusst.

**Formel (Impressions):**
```
CPM_effektiv  = Listen-CPM × (1 − Reach-Boost%)
Impressions   = (Budget / CPM_effektiv) × 1000
```

### Wichtig: Impressions-Boost ≠ Reach-Boost

Der konfigurierte `reachBoostPct` im Code wirkt linear auf **Impressions**. Der tatsächliche **unique Reach** wird in `calculateImpact` durch die Hofmans-Sättigungskurve berechnet — der Reach-Zuwachs ist deshalb **regional und budget-abhängig variabel**:

- Bei kleinen Budgets in grossen Regionen: Reach-Delta ≈ Impressions-Delta (fast linear)
- Nahe Sättigung: Reach-Delta wird gestaucht (z.B. Zürich Stadt 6'000 → +10% Impressions ergeben +5.6% Reach)
- Am 40%-Cap: Reach-Delta = 0% (siehe Edge Cases)

**Beispiel CHF 6'000 (Sandbox-verifiziert):**

| Szenario | Impressions-Boost | Reach-Delta Zürich Stadt | Reach-Delta Appenzell IR (gecapped) | Provision |
|---|---|---|---|---|
| Kein Code (Listenpreis) | Basis | Basis | Basis | – |
| Direct-Code (10%) | +11.1% | +5.6% | 0% (gecapped) | – |
| Agentur-Code (5%/5%) | +5.3% | +2.7% | 0% (gecapped) | 300 CHF |
| Vermittler-Code (0%/10%) | ±0% | ±0% | ±0% | 600 CHF |

**Konsequenz für UI:** Es wird der **echte Reach-Delta** angezeigt, nicht der konfigurierte `reachBoostPct` aus dem Code-Objekt. Siehe Sektion 5.

**VIO-Netto-Marge pro Impression bleibt in allen Szenarien bei ~39.50 CPM.**

---

## 5. Kommunikation an Endkunden

Code-Eingabe und Bestätigung sind bewusst ruhig gestaltet — kein grünes Blinken, kein "Erfolgreich gespart!", keine Discount-Anmutung. Konsistent mit VIOs Positionierung gegen Rabatt-Theater der Branche.

### Eingabe-Pattern (UI)

**Default:** Collapsed-Link unter Reach/Budget.

```
Partnercode hinzufügen
```

**Nach Klick:** Input erscheint.

```
Code eingeben
```

### Bestätigungs-Pattern bei erfolgreicher Validierung

Drei Varianten, abhängig vom echten Reach-Delta:

**Fall 1: Reach-Delta > 0 (Direct- und Agentur-Code, keine Cap-Kollision)**

```
Partnerkampagne aktiviert
+{deltaPct}% zusätzliche Reichweite
≈ {deltaPersonen} zusätzlich erreichte Personen
```

**Fall 2: Reach-Delta = 0, aber Code hat konfigurierten Boost (Cap-Edge-Case)**

```
Partnerkampagne aktiviert
Gesamte Region wird erreicht, kein zusätzlicher Reach-Effekt möglich.
```

**Fall 3: Code hat keinen Boost konfiguriert (Vermittler-Code, 0%)**

```
Partnerkampagne aktiviert
Code wurde erfolgreich hinterlegt.
```

### Berechnungslogik im UI

```ts
const deltaReach    = impactWithCode.reachUniqueAbs - impactBase.reachUniqueAbs;
const deltaPct      = Math.round((deltaReach / impactBase.reachUniqueAbs) * 100);
const deltaPersonen = round500(deltaReach);
```

- `impactBase` = `calculateImpact()` ohne `partnerCodeBoostPct`
- `impactWithCode` = `calculateImpact()` mit aktivem Code

### Kommunikations-Regeln

- 1:1-Kommunikation der echten Reach-Werte, gestützt auf den ohnehin verwendeten `ca.`-Modus und die ±15%-Range
- Personen-Zahl mit `round500()` gerundet, konsistent zur bestehenden Reach-Logik
- Niemals: "Du sparst CHF X" — Budget bleibt unverändert, der Wert kommt als Reach
- Visual: schlicht, gleiche Hierarchie wie bestehende Reach-Anzeige, kein Erfolgs-Theater

---

## 6. Edge Cases

| Fall | Verhalten |
|---|---|
| **Reach am 40%-Cap** | Code-Reach-Boost wird vor Cap angewendet. Wenn auch nach Boost noch gecapped → UI-Hinweis: "Gesamte Region wird erreicht. Partnerkampagne ist aktiv, kein zusätzlicher Reach-Effekt möglich." Provision bleibt für Vermittler-Anteil bestehen. |
| **Min-Budget (CHF 4'000)** | Gilt immer, Code wirkt nur auf Reach-Output, nie auf Budget-Untergrenze. (Diskutierbar: spätere Anhebung auf Präsenz/6'000.) |
| **Display-Sprint (DOOH-Cutoff)** | Code wirkt analog auf Display-only-Reach. Konsistente Wording-Variante. |
| **Code-Stacking** | Nicht erlaubt. Ein Code pro Buchung, hart geprüft. |
| **Pfad B (Pakete)** | Code wirkt auf den vom Paket gelieferten Reach. Min-Budget pro Paket gilt unverändert. |

---

## 7. Operativer Prozess

### Code-Lifecycle
- **Ausstellung:** Manuell durch VIO (Stefan/Jacky). Kein Self-Service.
- **Gültigkeit:** Unbegrenzt, jederzeit deaktivierbar.
- **Eindeutigkeit:** Ein Code pro Vermittler (oder pro Kampagne im Direktvertrieb).

### Auszahlung an Vermittler
- **Rhythmus:** Quartalsweise
- **Voraussetzungen (alle müssen erfüllt sein):**
  1. Kampagne ist ausgeliefert
  2. Endkunde hat bezahlt
  3. 30-Tage-Reklamationsfrist ist abgelaufen
- **Abrechnung:** Vermittler stellt VIO Rechnung über die aufgelaufene Provision
- **MWST:** Immer netto vereinbart — MWST geht zu Lasten des Vermittlers
- **Beträge:** Provision in CHF (nicht in Reach-Equivalent)

---

## 8. Risiken & offene Punkte

| Punkt | Status |
|---|---|
| Backend-Architektur (Code-Management, DB-Schema, Validierungs-Endpoint, Admin-UI) | Offen — wird mit Gesamt-Backend-Design entschieden, nicht isoliert vorgezogen. |
| UX-Platzierung Code-Eingabe (Step 2 vs. Step 4) | Vorschlag: Step 2 (Pakete/Budget), collapsed Default — finalisierung mit UI-Konzept. |
| Code-Stacking bei Mehrfachbuchungen desselben Kunden: einmalig oder pro Kampagne? | Vorschlag: pro Kampagne unbegrenzt einlösbar. |
| Anhebung Min-Budget für Code-Einlösung von 4'000 auf 6'000 | Diskutierbar nach erstem Live-Quartal. |
| Wearout-Klärung Regelkatalog v3.5.2 | Bleibt separater Workstream. |

---

## 9. Nächste Schritte (Empfehlung)

1. Konzept intern finalisieren (Jacky, Stefan, Dani)
2. Aufnahme als Anhang in Regelkatalog v3.5.2 oder als eigenständiges Spec-Dokument
3. UX-Integration konzipieren: Code-Eingabe in Step 2 (Pakete/Budget) für Politik- und B2B-Flow, mit Wording-Pattern aus Sektion 5
4. Backend-Architektur folgt mit dem Gesamt-Backend-Design (Code-Management, Validierung, Provisions-Tracking — nicht isoliert vorgezogen)
5. Pipedrive-Anbindung: Codes als CRM-Attribut für Lead-Tracking (Detail im Backend-Design)
