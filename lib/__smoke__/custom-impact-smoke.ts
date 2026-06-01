// Custom-Pfad Smoke-Tests (Sprint 2)
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
    spec: "satPos='sweet' · at_sweet_spot-Hint · kein einschraenkung",
    notes: "KALIBRIERUNG: reachPct ~3% (nicht 15–20%); at_sweet_spot feuert ab satRatio≥0.85; satRatio≈0.75 → knapp darunter",
  },
  {
    id: 2, label: 'Frequenz-Kollaps (Stadt Zürich)',
    r: ZURICH, cfg: { budget: 5000, laufzeitDays: 42, freqWeekly: 8, doohShare: 0.5 }, dtv: 50,
    spec: "satPos='unter' · reach_collapse-Hint · reachPct < 5%",
    notes: "Hofmans-Reach ≈ 4.6% (≥ 3%) → reach_collapse feuert nicht; satPos='unter' ✓",
  },
  {
    id: 3, label: 'DOOH-Cutoff (Kanton Aargau)',
    r: AARGAU, cfg: { budget: 12000, laufzeitDays: 14, freqWeekly: 4, doohShare: 0.8 }, dtv: 7,
    spec: "dooh_cutoff-Hint (level=einschraenkung) · kein Throw",
    notes: "daysToVote=7 < DOOH_CUTOFF_DAYS=10 → dooh_cutoff feuert ✓",
  },
  {
    id: 4, label: 'Über-Investment (Adliswil)',
    r: ADLI, cfg: { budget: 25000, laufzeitDays: 28, freqWeekly: 5, doohShare: 0.6 }, dtv: 35,
    spec: "satRatio > 1.1 · above_sweet_spot-Hint mit CHF-Wert",
    notes: "",
  },
] as const;

console.log('\n=== Custom-Pfad Smoke Tests (Sprint 2) ===\n');

for (const c of cases) {
  const impact = calculateImpactCustom({ ...c.cfg, regions: [c.r] });
  const hints  = evaluateCustomConfig(c.cfg, [c.r], impact, c.dtv);

  console.log(`Case ${c.id} — ${c.label}`);
  console.log(`  Region: ${c.r.name} (stimm=${c.r.stimm.toLocaleString()})`);
  console.log(`  Config: budget=${c.cfg.budget} · laufzeit=${c.cfg.laufzeitDays}d · freq=${c.cfg.freqWeekly}×/W · dooh=${c.cfg.doohShare * 100}%`);
  console.log(`  ---`);
  console.log(`  saturationPosition : ${impact.saturationPosition}`);
  console.log(`  saturationRatio    : ${impact.saturationRatio.toFixed(3)}`);
  console.log(`  reach              : ${impact.reach.toLocaleString()}`);
  console.log(`  reachPercent       : ${impact.reachPercent.toFixed(1)}%`);
  console.log(`  impressionsTotal   : ${impact.impressionsTotal.toLocaleString()}`);
  console.log(`  cpmEffective       : ${impact.cpmEffective}`);
  console.log(`  screens            : ${impact.screens}`);
  console.log(`  grps               : ${impact.grps}`);
  console.log(`  Hints (${hints.length}):`);
  for (const h of hints) {
    console.log(`    [${h.level}/${h.category}] ${h.code}: ${h.text}`);
  }
  if (hints.length === 0) console.log('    (keine)');
  console.log(`  Spec:  ${c.spec}`);
  if (c.notes) console.log(`  Notiz: ${c.notes}`);
  console.log();
}
