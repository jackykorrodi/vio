// WS2-Indikator Unit-Tests — Band (calculateImpactCustom) + Wahrzeichen-Anker
// Aufruf: npx tsx --test lib/__smoke__/ws2-band-landmark.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calculateImpactCustom } from '../preislogik';
import { resolveLandmarkAnchor } from '../landmark-anchor';
import { KANTONE } from '../regions';

const ZH = KANTONE.find(r => r.kanton === 'ZH')!;
const BE = KANTONE.find(r => r.kanton === 'BE')!;
const BS = KANTONE.find(r => r.kanton === 'BS')!;
const TG = KANTONE.find(r => r.kanton === 'TG')!;

// ─── calculateImpactCustom: Band vorhanden ────────────────────────────────────

test('calculateImpactCustom: reachUniqueLow/High vorhanden, /500 gerundet, Low < reach < High', () => {
  const result = calculateImpactCustom({
    budget: 5000,
    laufzeitDays: 14,
    freqWeekly: 3,
    doohShare: 0,
    regions: [ZH],
    wirkungsfokus: 'ausgewogen',
    campaignStart: new Date(),
  });

  assert.ok(result.reach > 0, 'reach > 0 erwartet');
  assert.ok(result.reachUniqueLow < result.reach, `reachUniqueLow (${result.reachUniqueLow}) < reach (${result.reach})`);
  assert.ok(result.reach < result.reachUniqueHigh, `reach (${result.reach}) < reachUniqueHigh (${result.reachUniqueHigh})`);
  assert.strictEqual(result.reachUniqueLow % 500, 0, 'reachUniqueLow ist /500 gerundet');
  assert.strictEqual(result.reachUniqueHigh % 500, 0, 'reachUniqueHigh ist /500 gerundet');
  assert.ok(result.reachUniqueHigh < ZH.stimm * 0.12, 'reachUniqueHigh deutlich unterhalb max poolCap');
});

// ─── resolveLandmarkAnchor: ZH ────────────────────────────────────────────────

test('ZH 8000 → Samsung Hall (grösstes cap ≤ 8000 = 5000)', () => {
  const r = resolveLandmarkAnchor(8000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('in die Samsung Hall'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('passen.'));
});

test('ZH 7000 → Samsung Hall (7000 ≥ cap 5000, kein generic)', () => {
  const r = resolveLandmarkAnchor(7000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('in die Samsung Hall'), `Text: "${r.text}"`);
});

test('ZH 4000 → generisch (unter kleinstem cap 5000)', () => {
  const r = resolveLandmarkAnchor(4000, [ZH]);
  assert.strictEqual(r.generic, true);
});

test('ZH 11000 → Hallenstadion', () => {
  const r = resolveLandmarkAnchor(11000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('ins Hallenstadion'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('passen.'));
});

test('ZH 12000 → Swiss Life Arena (cap 12000 ≤ 12000)', () => {
  const r = resolveLandmarkAnchor(12000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('in die Swiss Life Arena'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('passen.'));
});

test('ZH 26000 → Letzigrund (cap 26000 ≤ 26000)', () => {
  const r = resolveLandmarkAnchor(26000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('ins Letzigrund'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('passen.'));
});

test('ZH 34000 → Letzigrund Match (Grenzfall: 34000 < Schwelle 39000, kein Multiplikator, keine 1×)', () => {
  // Multiplikator feuert erst ab 26000 * 1.5 = 39000
  // 34000 < 39000 → normaler Match: Letzigrund (cap 26000 ≤ 34000)
  const r = resolveLandmarkAnchor(34000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.endsWith('passen.'), `Muss Match sein, kein Multiplikator: "${r.text}"`);
  assert.ok(r.text.includes('ins Letzigrund'), `Text: "${r.text}"`);
  assert.ok(!r.text.includes('×'), `Keine 1×-Ausgabe: "${r.text}"`);
});

test('ZH 40000 → Multiplikator 2× Letzigrund (40000 ≥ 39000, n=round(40000/26000)=2)', () => {
  const r = resolveLandmarkAnchor(40000, [ZH]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('2×'), `Text: "${r.text}"`);
  assert.ok(r.text.includes('das Letzigrund'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('fasst.'));
});

// ─── resolveLandmarkAnchor: BE ────────────────────────────────────────────────

test('BE 17000 → PostFinance Arena', () => {
  const r = resolveLandmarkAnchor(17000, [BE]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('in die PostFinance Arena'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('passen.'));
});

test('BE 30000 → Multiplikator 2× PostFinance Arena (30000 ≥ 25500, n=round(30000/17000)=2)', () => {
  const r = resolveLandmarkAnchor(30000, [BE]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('2×'), `Text: "${r.text}"`);
  assert.ok(r.text.includes('die PostFinance Arena'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('fasst.'));
});

// ─── resolveLandmarkAnchor: BS ────────────────────────────────────────────────

test('BS 12000 → St. Jakobshalle (St. Jakob-Park entfernt)', () => {
  const r = resolveLandmarkAnchor(12000, [BS]);
  assert.strictEqual(r.generic, false);
  assert.ok(r.text.includes('in die St. Jakobshalle'), `Text: "${r.text}"`);
  assert.ok(r.text.endsWith('passen.'));
});

// ─── resolveLandmarkAnchor: Kein Set ─────────────────────────────────────────

test('TG 8000 → generisch (kein LANDMARKS-Set für TG)', () => {
  const r = resolveLandmarkAnchor(8000, [TG]);
  assert.strictEqual(r.generic, true);
});
