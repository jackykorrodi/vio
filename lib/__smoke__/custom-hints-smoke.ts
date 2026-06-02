// Custom-Hints Coach-Engine Smoke-Tests (Sprint 3)
// Aufruf: npx tsx lib/__smoke__/custom-hints-smoke.ts
//
// Referenz: Kanton Bern, Wirkungsfokus ausgewogen, 28d, doohAnteil ~0.7
// Sweet-Spot bei 28d ≈ CHF 59'307 (calculateSweetSpotCustom-Schätzung).

import { calculateImpactCustom, calculateSweetSpotCustom } from '../preislogik';
import { evaluateCustomConfig } from '../custom-hints';
import { KANTONE, STAEDTE } from '../regions';

const BERN = KANTONE.find(r => r.name === 'Bern')!;
const ADLI = STAEDTE.find(r => r.name === 'Adliswil')!;

// Sweet-Spot Referenzwert ausgeben
const ssRef = calculateSweetSpotCustom([BERN], 'ausgewogen', 28, 0.7);
console.log(`\nSweet-Spot Referenz (Bern, ausgewogen, 28d, dooh=0.7): CHF ${ssRef.budget.toLocaleString('de-CH')}`);
console.log(`  → LOW  (60%): CHF ${Math.round(ssRef.budget * 0.6).toLocaleString('de-CH')}`);
console.log(`  → HIGH (115%): CHF ${Math.round(ssRef.budget * 1.15).toLocaleString('de-CH')}`);
console.log();

const cases = [
  {
    id: 1,
    label: 'budget_niedrig (auch bei Referenz-Laufzeit zu tief)',
    cfg: { budget: 20_000, laufzeitDays: 28, freqWeekly: 3, doohShare: 0.6, wirkungsfokus: 'ausgewogen' as const },
    dtv: 35,
    expect: 'budget_niedrig',
    note: 'budget=20k < 60% × ss(28d)',
  },
  {
    id: 2,
    label: 'laufzeit (Verkürzen würde Budget in Sweet-Spot bringen)',
    cfg: { budget: 45_000, laufzeitDays: 56, freqWeekly: 3, doohShare: 0.6, wirkungsfokus: 'ausgewogen' as const },
    dtv: 70,
    expect: 'laufzeit',
    note: 'budget=45k < 60% × ss(56d), aber 45k >= 60% × ss(28d) && 56d > 28d',
  },
  {
    id: 3,
    label: 'null (Sweet-Spot-Zone, still)',
    cfg: { budget: 45_000, laufzeitDays: 28, freqWeekly: 3, doohShare: 0.6, wirkungsfokus: 'ausgewogen' as const },
    dtv: 35,
    expect: 'null',
    note: 'budget=45k zwischen 60%×ss und 115%×ss(28d)',
  },
  {
    id: 4,
    label: 'saettigung (> 115% Sweet-Spot)',
    cfg: { budget: 120_000, laufzeitDays: 28, freqWeekly: 3, doohShare: 0.6, wirkungsfokus: 'ausgewogen' as const },
    dtv: 35,
    expect: 'saettigung',
    note: 'budget=120k > 115% × ss(28d)',
  },
  {
    id: 5,
    label: 'presence: Bern (voll) vs. Adliswil (display-dominant)',
    cfg: { budget: 45_000, laufzeitDays: 28, freqWeekly: 3, doohShare: 0.6, wirkungsfokus: 'ausgewogen' as const },
    dtv: 35,
    expect: 'showScreenCount: Bern=true, Adliswil=false',
    note: 'Bern: Kanton → politScreens >= 30; Adliswil: display-dominant → screenCount < 30',
    multi: true,
  },
] as const;

console.log('=== Coach-Engine Smoke Tests ===\n');

for (const c of cases) {
  if ('multi' in c) {
    // Case 5: presence comparison
    const impactBern = calculateImpactCustom({ ...c.cfg, regions: [BERN] });
    const evalBern   = evaluateCustomConfig(c.cfg, [BERN], impactBern, c.dtv);
    const impactAdli = calculateImpactCustom({ ...c.cfg, regions: [ADLI] });
    const evalAdli   = evaluateCustomConfig(c.cfg, [ADLI], impactAdli, c.dtv);

    console.log(`Case ${c.id} — ${c.label}`);
    console.log(`  Bern:    doohAvailable=${evalBern.presence.doohAvailable} · showScreenCount=${evalBern.presence.showScreenCount} · screenCount=${evalBern.presence.screenCount}`);
    console.log(`  Adliswil: doohAvailable=${evalAdli.presence.doohAvailable} · showScreenCount=${evalAdli.presence.showScreenCount} · screenCount=${evalAdli.presence.screenCount}`);
    const bernOk = evalBern.presence.showScreenCount === true;
    const adliOk = evalAdli.presence.showScreenCount === false;
    console.log(`  Ergebnis: ${bernOk && adliOk ? '✓ PASS' : '✗ FAIL'} (erwartet: ${c.expect})`);
    console.log();
    continue;
  }

  const impact = calculateImpactCustom({ ...c.cfg, regions: [BERN] });
  const eval_  = evaluateCustomConfig(c.cfg, [BERN], impact, c.dtv);
  const actual = eval_.coachHint?.type ?? 'null';
  const pass   = actual === c.expect;

  console.log(`Case ${c.id} — ${c.label}`);
  console.log(`  Config : budget=${c.cfg.budget.toLocaleString('de-CH')} · laufzeit=${c.cfg.laufzeitDays}d`);
  console.log(`  Actual : coachHint=${actual}${eval_.coachHint ? ` — ${eval_.coachHint.text}` : ''}`);
  console.log(`  Erwartet: ${c.expect} · ${pass ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Note   : ${c.note}`);
  console.log();
}
