// Custom-Pfad v3.7 Smoke-Tests — Wirkungsfokus-Modell
// Aufruf: npx tsx lib/__smoke__/custom-impact-v37-smoke.ts
//
// Cluster-Liste: neue Auswahl (keine vordefinierte 12er-Liste im Repo gefunden).
// Sprint-2-Referenz-Regionen (Bern, Zürich, Aargau, Adliswil) sind enthalten.
// Spektrum: klein (~9k stimm) bis sehr gross (~1M stimm).

import {
  calculateImpactCustom,
  calculateSweetSpotCustom,
  checkDoohAvailability,
  SETUP_VORLAUF_WERKTAGE,
  SWEET_SPOT_TARGET_SATURATION,
} from '../preislogik';
import { addBusinessDays } from '../business-days';
import { KANTONE, STAEDTE } from '../regions';
import type { Region } from '../regions';

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function d(isoDate: string): Date {
  const [y, m, day] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function fmt(n: number): string {
  return n.toLocaleString('de-CH');
}

function fmtChf(n: number): string {
  return "CHF " + Math.round(n).toLocaleString('de-CH');
}

const TODAY = d('2026-05-29');
const IN30  = new Date(TODAY); IN30.setDate(IN30.getDate() + 30);
const IN5   = new Date(TODAY); IN5.setDate(IN5.getDate() + 5);

// ─── Regionen ────────────────────────────────────────────────────────────────

const BERN_KT   = KANTONE.find(r => r.name === 'Bern')!;
const ZH_KT     = KANTONE.find(r => r.name === 'Zürich')!;
const AG_KT     = KANTONE.find(r => r.name === 'Aargau')!;
const ZH_STADT  = STAEDTE.find(r => r.name === 'Zürich')!;
const ADLI      = STAEDTE.find(r => r.name === 'Adliswil')!;
const MURI      = STAEDTE.find(r => r.name === 'Muri bei Bern')!;
const WIL       = STAEDTE.find(r => r.name === 'Wil')!;
const THUN      = STAEDTE.find(r => r.name === 'Thun')!;
const BIEL      = STAEDTE.find(r => r.name === 'Biel/Bienne')!;
const LUGANO    = STAEDTE.find(r => r.name === 'Lugano')!;
const LU_STADT  = STAEDTE.find(r => r.name === 'Luzern')!;
const WINTERTHUR = STAEDTE.find(r => r.name === 'Winterthur')!;
const LAUSANNE  = STAEDTE.find(r => r.name === 'Lausanne')!;

// Synthetische Region für no_inventory-Test (kein Eintrag in dooh-screens.json → 0 Screens)
const NO_INVENTORY_REGION: Region = { name: 'TestKleinGemeinde', type: 'stadt', kanton: 'BE', pop: 7000, stimm: 5000 };

// ─── Test Case (a): Frequenz-Inversion ───────────────────────────────────────

console.log('\n=== (a) Frequenz-Inversion — reach(breit) > reach(ausgewogen) > reach(verankerung) ===\n');
console.log('  Region: Kanton Bern | Budget: CHF 18\'000 | Laufzeit: 28 Tage | campaignStart: +30 Tage\n');

const FREQ_TEST_CONFIG = { budget: 18000, laufzeitDays: 28, freqWeekly: 0, doohShare: 0, regions: [BERN_KT], campaignStart: IN30 };

let prevReach = Infinity;
let ok = true;
for (const wirkungsfokus of ['breit', 'ausgewogen', 'verankerung'] as const) {
  const r = calculateImpactCustom({ ...FREQ_TEST_CONFIG, wirkungsfokus });
  const arrow = r.reach < prevReach ? '✓' : '✗ FAIL';
  console.log(`  ${wirkungsfokus.padEnd(12)}: reach=${fmt(r.reach).padStart(8)}  reachPct=${r.reachPercent.toFixed(1).padStart(5)}%  satRatio=${r.saturationRatio.toFixed(3)}  ${arrow}`);
  if (r.reach >= prevReach) ok = false;
  prevReach = r.reach;
}
console.log(`\n  Ergebnis: ${ok ? '✓ reach(breit) > reach(ausgewogen) > reach(verankerung)' : '✗ Erwartung NICHT erfüllt'}`);

// ─── Test Case (b): Sweet-Spot-Tabelle über 12 Cluster-Repräsentanten ────────

console.log('\n=== (b) Sweet-Spot-Tabelle — calculateSweetSpotCustom(ausgewogen, 28d, dooh=0.6) ===');
console.log(`  SWEET_SPOT_TARGET_SATURATION = ${SWEET_SPOT_TARGET_SATURATION}\n`);

const CLUSTERS: Array<{ label: string; region: Region }> = [
  { label: 'Muri b. Bern (9.5k)',  region: MURI       },
  { label: 'Adliswil (13k)',        region: ADLI       },
  { label: 'Wil SG (18k)',          region: WIL        },
  { label: 'Thun (31k)',            region: THUN       },
  { label: 'Biel/Bienne (39k)',     region: BIEL       },
  { label: 'Lugano (45k)',          region: LUGANO     },
  { label: 'Luzern Stadt (58k)',    region: LU_STADT   },
  { label: 'Winterthur (82k)',      region: WINTERTHUR },
  { label: 'Lausanne (105k)',       region: LAUSANNE   },
  { label: 'Stadt Zürich (310k)',   region: ZH_STADT   },
  { label: 'Kanton Aargau (470k)',  region: AG_KT      },
  { label: 'Kanton Bern (775k)',    region: BERN_KT    },
  { label: 'Kanton Zürich (1015k)', region: ZH_KT      },
];

const COL_LABEL = 22;
const COL_STIMM = 10;
const COL_BUDGET = 12;
const COL_REACH  = 12;
const COL_PCT    = 8;
console.log(
  '  ' + 'Region'.padEnd(COL_LABEL) +
  'Stimm'.padStart(COL_STIMM) +
  'SweetBudget'.padStart(COL_BUDGET) +
  'SweetReach'.padStart(COL_REACH) +
  'Reach%'.padStart(COL_PCT)
);
console.log('  ' + '-'.repeat(COL_LABEL + COL_STIMM + COL_BUDGET + COL_REACH + COL_PCT));

for (const { label, region } of CLUSTERS) {
  const ss = calculateSweetSpotCustom([region], 'ausgewogen', 28, 0.6);
  const reachPct = region.stimm > 0 ? (ss.reach / region.stimm) * 100 : 0;
  console.log(
    '  ' + label.padEnd(COL_LABEL) +
    fmt(region.stimm).padStart(COL_STIMM) +
    fmtChf(ss.budget).padStart(COL_BUDGET) +
    fmt(ss.reach).padStart(COL_REACH) +
    (reachPct.toFixed(1) + '%').padStart(COL_PCT)
  );
}

// ─── Test Case (c): DOOH-Verfügbarkeit Zwei-Zustand ──────────────────────────

console.log('\n=== (c) DOOH-Verfügbarkeit Zwei-Zustand ===\n');

const fruehesterStart = addBusinessDays(TODAY, SETUP_VORLAUF_WERKTAGE);
console.log(`  Heute: ${TODAY.toISOString().slice(0,10)} | Frühester DOOH-Start (${SETUP_VORLAUF_WERKTAGE} Werktage): ${fruehesterStart.toISOString().slice(0,10)}\n`);

const szenarien = [
  { label: 'Start in 30 Tagen → available:true',          region: BERN_KT,           start: IN30 },
  { label: 'Start in 5 Tagen  → setup_vorlauf',           region: BERN_KT,           start: IN5  },
  { label: '0-Screen-Region + 30 Tage → no_inventory',    region: NO_INVENTORY_REGION, start: IN30 },
];

let cOk = true;
for (const s of szenarien) {
  const avail = checkDoohAvailability([s.region], s.start, TODAY);
  const status = avail.available
    ? `available:true  channelMix=${avail.channelMix}`
    : `available:false reason=${avail.reason}`;
  const expected =
    s.label.includes('available:true')  ? (avail.available === true) :
    s.label.includes('setup_vorlauf')   ? (!avail.available && !avail.available && (avail as { reason: string }).reason === 'setup_vorlauf') :
    (!avail.available && (avail as { reason: string }).reason === 'no_inventory');
  const tick = expected ? '✓' : '✗ FAIL';
  console.log(`  ${tick} ${s.label}`);
  console.log(`      → ${status}`);
  if (!expected) cOk = false;
}
console.log(`\n  Ergebnis: ${cOk ? '✓ alle drei Szenarien korrekt' : '✗ Mindestens ein Szenario fehlgeschlagen'}`);

// ─── Test Case (d): Zeitachsen-Trennung ──────────────────────────────────────

console.log('\n=== (d) Zeitachsen-Trennung — Kalendertage vs. Werktage ===\n');
console.log('  Region: Kanton Bern | Budget: CHF 18\'000 | Wirkungsfokus: ausgewogen | campaignStart: +30 Tage\n');

const BASE = { budget: 18000, freqWeekly: 0, doohShare: 0, regions: [BERN_KT], wirkungsfokus: 'ausgewogen' as const, campaignStart: IN30 };
const r28 = calculateImpactCustom({ ...BASE, laufzeitDays: 28 });
const r30 = calculateImpactCustom({ ...BASE, laufzeitDays: 30 });
const lw28 = (28 / 7).toFixed(3);
const lw30 = (30 / 7).toFixed(3);
const reachDiff = r30.reach - r28.reach;

console.log(`  laufzeitDays=28: laufzeitWochen=${lw28}  reach=${fmt(r28.reach)}  reachPct=${r28.reachPercent.toFixed(1)}%`);
console.log(`  laufzeitDays=30: laufzeitWochen=${lw30}  reach=${fmt(r30.reach)}  reachPct=${r30.reachPercent.toFixed(1)}%`);
console.log(`  Differenz: laufzeitWochen +${(30/7 - 28/7).toFixed(3)}  reach ${reachDiff > 0 ? '+' : ''}${fmt(reachDiff)}`);

const dOk = (28 / 7) !== (30 / 7) && r30.reach !== r28.reach;
console.log(`\n  Ergebnis: ${dOk ? '✓ Kalendertage-Rechnung — Reach reagiert auf laufzeitWochen' : '✗ Erwartung nicht erfüllt'}`);

console.log('\n=== Ende Custom-Pfad v3.7 Smoke-Tests ===\n');
