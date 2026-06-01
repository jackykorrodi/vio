// Resolver Smoke-Tests — resolveCampaign + assertRequiredFields
// Aufruf: npx tsx lib/__smoke__/resolve-campaign-smoke.ts

import { resolveCampaign, assertRequiredFields } from '../resolve-campaign';
import type { BriefingData } from '../types';

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// ─── Basis-Briefing-Fixtures ─────────────────────────────────────────────────

const REGION_BERN = { name: 'Bern', type: 'kanton' as const, stimm: 450_000, kanton: 'BE' };
const REGION_ZH   = { name: 'Zürich', type: 'kanton' as const, stimm: 800_000, kanton: 'ZH' };

function basePaket(): Partial<BriefingData> {
  return {
    pfad: 'paket',
    selectedPackage: 'praesenz',
    budget: 6000,
    laufzeit: 4,
    selectedRegions: [REGION_BERN],
  };
}

function baseCustom(overrides: Partial<NonNullable<BriefingData['customConfig']>> = {}): Partial<BriefingData> {
  return {
    pfad: 'custom',
    customConfig: {
      budget: 12_000,
      laufzeitDays: 28,
      freqWeekly: 0,
      doohShare: 0,
      wirkungsfokus: 'ausgewogen',
      ...overrides,
    },
    selectedRegions: [REGION_ZH],
  };
}

// ─── Case 1: Paket-Pfad ──────────────────────────────────────────────────────

console.log('\nCase 1: Paket-Briefing');
{
  const rc = resolveCampaign(basePaket() as BriefingData);
  assert('pfad=paket',          rc.pfad === 'paket');
  assert('budget=6000',         rc.budget === 6000);
  assert('laufzeitDays=28',     rc.laufzeitDays === 28);
  assert('laufzeitWeeks=4',     rc.laufzeitWeeks === 4);
  assert('impact.reach>0',      rc.impact.reach > 0, `reach=${rc.impact.reach}`);
}

// ─── Case 2: Custom-Pfad ─────────────────────────────────────────────────────

console.log('\nCase 2: Custom-Briefing (ausgewogen)');
{
  const rc = resolveCampaign(baseCustom() as BriefingData);
  assert('pfad=custom',         rc.pfad === 'custom');
  assert('budget=12000',        rc.budget === 12_000);
  assert('laufzeitDays=28',     rc.laufzeitDays === 28);
  assert('laufzeitWeeks=4',     rc.laufzeitWeeks === 4);
  assert('impact.reach>0',      rc.impact.reach > 0, `reach=${rc.impact.reach}`);
}

// ─── Case 3: Wirkungsfokus-Inversion (breit > verankerung) ──────────────────

console.log('\nCase 3: Wirkungsfokus breit vs verankerung');
{
  const rcBreit      = resolveCampaign(baseCustom({ wirkungsfokus: 'breit' }) as BriefingData);
  const rcVerankerung = resolveCampaign(baseCustom({ wirkungsfokus: 'verankerung' }) as BriefingData);
  assert('breit.reach>0',             rcBreit.impact.reach > 0,       `reach=${rcBreit.impact.reach}`);
  assert('verankerung.reach>0',       rcVerankerung.impact.reach > 0, `reach=${rcVerankerung.impact.reach}`);
  assert('breit.reach > verankerung', rcBreit.impact.reach > rcVerankerung.impact.reach,
    `breit=${rcBreit.impact.reach} verankerung=${rcVerankerung.impact.reach}`);
}

// ─── Case 4: assertRequiredFields wirft bei kaputtem Custom ─────────────────

console.log('\nCase 4: assertRequiredFields — budget=0 wirft');
{
  const broken = resolveCampaign(baseCustom({ budget: 0 }) as BriefingData);
  let threw = false;
  try {
    assertRequiredFields(broken);
  } catch (e) {
    threw = true;
    assert('error message enthält "budget"', (e as Error).message.includes('budget'));
  }
  assert('assert wirft bei budget=0', threw);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} Tests — ${passed} ✓  ${failed} ✗\n`);
if (failed > 0) process.exit(1);
