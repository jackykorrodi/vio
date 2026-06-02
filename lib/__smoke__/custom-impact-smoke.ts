// Custom-Pfad Smoke-Tests (Sprint 3 — evaluateCustomConfig → CustomEvaluation)
// Aufruf: npx tsx lib/__smoke__/custom-impact-smoke.ts

import { calculateImpactCustom } from '../preislogik';
import { evaluateCustomConfig } from '../custom-hints';
import { KANTONE, STAEDTE } from '../regions';

const BERN   = KANTONE.find(r => r.name === 'Bern')!;
const ZURICH = STAEDTE.find(r => r.name === 'Zürich')!;
const AARGAU = KANTONE.find(r => r.name === 'Aargau')!;
const ADLI   = STAEDTE.find(r => r.name === 'Adliswil')!;

const cases = [
  {
    id: 1, label: 'Sweet Spot (Kanton Bern)',
    r: BERN, cfg: { budget: 18000, laufzeitDays: 28, freqWeekly: 5, doohShare: 0.6 }, dtv: 35,
    spec: "satPos='sweet' · coachHint=null",
  },
  {
    id: 2, label: 'Frequenz-Kollaps (Stadt Zürich)',
    r: ZURICH, cfg: { budget: 5000, laufzeitDays: 42, freqWeekly: 8, doohShare: 0.5 }, dtv: 50,
    spec: "satPos='unter' · coachHint=budget_niedrig",
  },
  {
    id: 3, label: 'DOOH-Cutoff (Kanton Aargau)',
    r: AARGAU, cfg: { budget: 12000, laufzeitDays: 14, freqWeekly: 4, doohShare: 0.8 }, dtv: 7,
    spec: "presence.doohAvailable erwartet (no_inventory-Check), coachHint=budget_niedrig",
  },
  {
    id: 4, label: 'Über-Investment (Adliswil)',
    r: ADLI, cfg: { budget: 25000, laufzeitDays: 28, freqWeekly: 5, doohShare: 0.6 }, dtv: 35,
    spec: "coachHint=saettigung oder null (abhängig von Sweet-Spot Adliswil)",
  },
] as const;

console.log('\n=== Custom-Pfad Smoke Tests (Sprint 3) ===\n');

for (const c of cases) {
  const impact = calculateImpactCustom({ ...c.cfg, regions: [c.r] });
  const eval_  = evaluateCustomConfig(c.cfg, [c.r], impact, c.dtv);

  console.log(`Case ${c.id} — ${c.label}`);
  console.log(`  Region: ${c.r.name} (stimm=${c.r.stimm.toLocaleString()})`);
  console.log(`  Config: budget=${c.cfg.budget} · laufzeit=${c.cfg.laufzeitDays}d`);
  console.log(`  ---`);
  console.log(`  saturationPosition : ${impact.saturationPosition}`);
  console.log(`  saturationRatio    : ${impact.saturationRatio.toFixed(3)}`);
  console.log(`  coachHint          : ${eval_.coachHint ? `${eval_.coachHint.type} — ${eval_.coachHint.text}` : 'null (still)'}`);
  console.log(`  presence           : doohAvailable=${eval_.presence.doohAvailable} · showScreenCount=${eval_.presence.showScreenCount} · screenCount=${eval_.presence.screenCount}`);
  console.log(`  Spec: ${c.spec}`);
  console.log();
}
