// Business-Day-Utility Smoke-Tests (Kanton Zürich)
// Aufruf: npx tsx lib/__smoke__/business-days-smoke.ts

import {
  isBusinessDay,
  addBusinessDays,
  calculateBusinessDays,
  getZurichHolidays,
} from '../business-days';

let pass = 0;
let fail = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`    expected: ${expected}`);
    console.error(`    actual:   ${actual}`);
    fail++;
  }
}

function d(str: string): Date {
  const [y, mo, day] = str.split('-').map(Number);
  return new Date(y, mo - 1, day);
}

function ds(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

// --- Computus-Zwischencheck 2026 ---
console.log('\nComputus 2026 (Ostersonntag = 2026-04-05):');
const h2026 = getZurichHolidays(2026);
assert('Karfreitag    2026-04-03 im Holiday-Set', h2026.has('2026-04-03'), true);
assert('Ostermontag   2026-04-06 im Holiday-Set', h2026.has('2026-04-06'), true);
assert('Auffahrt      2026-05-14 im Holiday-Set', h2026.has('2026-05-14'), true);
assert('Pfingstmontag 2026-05-25 im Holiday-Set', h2026.has('2026-05-25'), true);

// --- isBusinessDay ---
console.log('\nisBusinessDay:');
assert('Karfreitag    2026-04-03 → false', isBusinessDay(d('2026-04-03')), false);
assert('Ostermontag   2026-04-06 → false', isBusinessDay(d('2026-04-06')), false);
assert('Auffahrt      2026-05-14 → false', isBusinessDay(d('2026-05-14')), false);
assert('Pfingstmontag 2026-05-25 → false', isBusinessDay(d('2026-05-25')), false);
assert('Sechseläuten  2026-04-20 → false', isBusinessDay(d('2026-04-20')), false);
assert('Knabenschiessen 2026-09-14 → false', isBusinessDay(d('2026-09-14')), false);
assert('Neujahr       2026-01-01 → false', isBusinessDay(d('2026-01-01')), false);
assert('Bundesfeier   2026-08-01 (Sa) → false', isBusinessDay(d('2026-08-01')), false);
assert('Samstag       2026-05-30 → false', isBusinessDay(d('2026-05-30')), false);
assert('Donnerstag    2026-05-28 → true',  isBusinessDay(d('2026-05-28')), true);

// --- addBusinessDays ---
console.log('\naddBusinessDays:');
assert(
  'addBusinessDays(2026-05-28, 10) → 2026-06-11  (keine Feiertage)',
  ds(addBusinessDays(d('2026-05-28'), 10)),
  '2026-06-11',
);
assert(
  'addBusinessDays(2026-04-01,  5) → 2026-04-10  (Karfreitag + Ostermontag skip)',
  ds(addBusinessDays(d('2026-04-01'), 5)),
  '2026-04-10',
);
assert(
  'addBusinessDays(2026-12-29,  3) → 2027-01-04  (Neujahr 2027 skip — Jahreswechsel)',
  ds(addBusinessDays(d('2026-12-29'), 3)),
  '2027-01-04',
);

// --- calculateBusinessDays ---
console.log('\ncalculateBusinessDays:');
assert(
  'calculateBusinessDays(2026-05-28, 2026-06-11) → 10',
  calculateBusinessDays(d('2026-05-28'), d('2026-06-11')),
  10,
);

// --- Summary ---
const total = pass + fail;
console.log(`\n${total} Tests: ${pass} ✓  ${fail} ✗`);
if (fail > 0) process.exit(1);
