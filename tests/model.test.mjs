import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, minimumStock, parseDemand, sample, simulate, toCsv } from '../model.mjs';

test('demand accepts separators, zero waves and maximum-sized counts', () => {
  assert.deepEqual(parseDemand('0, 280\n10000'), [0, 280, 10000]);
  for (const invalid of ['1', '0 0', '-1 2', '3.2 2', '10001 1', '1,2,', '1 '.repeat(13)]) {
    assert.throws(() => parseDemand(invalid));
  }
});

test('campus sample quantifies fallback and proves both minimums', () => {
  const { expected, stress } = compare(sample);
  assert.deepEqual(expected.waves.map(wave => wave.fallback), [0, 0, 2, 40, 0, 0]);
  assert.equal(expected.reusable, 508);
  assert.equal(stress.fallback, 149);
  assert.equal(expected.minimum, 282);
  assert.equal(stress.minimum, 389);
  for (const plan of [expected, stress]) {
    assert.equal(simulate({ ...plan.settings, stock: plan.minimum }).fallback, 0);
    assert.ok(simulate({ ...plan.settings, stock: plan.minimum - 1 }).fallback > 0);
  }
});

test('wash capacity throttles arrivals and a wash queue carries over', () => {
  const plan = simulate({ stock: 8, demand: [8, 0, 2, 4], rate: 100, delay: 1, wash: 3 });
  assert.deepEqual(plan.waves.map(wave => wave.washed), [0, 3, 3, 3]);
  assert.deepEqual(plan.waves.map(wave => wave.queue), [0, 5, 2, 1]);
  assert.equal(plan.fallback, 0);
});

test('with no returns or no washing, minimum equals total demand', () => {
  const settings = { stock: 4, demand: [4, 4], rate: 0, delay: 1, wash: 100 };
  assert.equal(minimumStock(settings), 8);
  assert.equal(minimumStock({ ...settings, rate: 100, wash: 0 }), 8);
});

test('CSV retains both scenarios and all assumptions', () => {
  const lines = toCsv(compare(sample)).trim().split('\r\n');
  assert.equal(lines.length, 13);
  assert.equal(lines[0].split(',').length, 15);
  assert.equal(lines[1], 'expected,1,70,240,90,2,80,0,0,240,70,0,170,0,282');
  assert.equal(lines[7], 'stress,1,70,240,80,3,60,0,0,240,70,0,170,0,389');
});
