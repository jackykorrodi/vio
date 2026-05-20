/**
 * Sandbox: Partnercode CPM_LIST-Verifikation
 * Ausführung: npx tsx lib/test-internal/partnercode-sandbox.ts
 */
import { calculateImpact } from '../preislogik';
import { ALL_REGIONS } from '../regions';

const clusters = [
  { label: 'Zürich Stadt (gross)',    name: 'Zürich' },
  { label: 'Kanton Thurgau (mittel)', name: 'Thurgau' },
  { label: 'Appenzell IR (cap)',      name: 'Appenzell Innerrhoden' },
];

const budgets = [4000, 6000, 8000, 12000];
const codes: Array<{ label: string; boost: number }> = [
  { label: 'kein Code  ', boost: 0  },
  { label: 'direct 10% ', boost: 10 },
  { label: 'agentur 5% ', boost: 5  },
  { label: 'vermittler ', boost: 0  }, // same as kein Code — provision only
];

// Echter Misch-CPM (Soll-Netto VIO): 39.50 bei 70/30 split
const NETTO_CPM = 39.50;

for (const cluster of clusters) {
  const region = ALL_REGIONS.find(r => r.name === cluster.name);
  if (!region) { console.log(`Region nicht gefunden: ${cluster.name}`); continue; }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Cluster: ${cluster.label}  (stimm=${region.stimm.toLocaleString('de-CH')})`);
  console.log(`${'='.repeat(80)}`);
  console.log(`${'Budget'.padEnd(8)} | ${'Code'.padEnd(13)} | ${'Reach-Abs'.padStart(10)} | ${'Reach-Low'.padStart(10)} | ${'Reach-High'.padStart(11)} | ${'Capped'.padStart(6)} | ${'eff.CPM*'.padStart(9)}`);
  console.log('-'.repeat(80));

  for (const budget of budgets) {
    for (const code of codes) {
      const result = calculateImpact({
        budget,
        regions: [region],
        partnerCodeBoostPct: code.boost,
      });

      // Eff. CPM: Budget / reachUniqueAbs * 1000 (approximation)
      // Soll-Netto: ~39.50 in allen Szenarien (VIO behält gleiche Marge)
      const effCpm = result.reachUniqueAbs > 0
        ? (budget / result.reachUniqueAbs * 1000).toFixed(2)
        : '—';

      console.log(
        `${String(budget).padEnd(8)} | ${code.label} | ${String(result.reachUniqueAbs).padStart(10)} | ${String(result.reachUniqueLow).padStart(10)} | ${String(result.reachUniqueHigh).padStart(11)} | ${String(result.cappedByRegion).padStart(6)} | ${effCpm.padStart(9)}`
      );
    }
    console.log('-'.repeat(80));
  }
}

console.log('\n* eff.CPM = Budget/reachUniqueAbs×1000 — Annäherung an VIO-Netto-CPM.');
console.log('  Soll-Netto in allen Szenarien: ~39.50 CHF (Marge-Konstanz).');
console.log('  Hinweis: Durch Saturation-Kurve ist eff.CPM nicht linear — klein. Regionen weichen ab.');
