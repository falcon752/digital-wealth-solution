const test = require('node:test');
const assert = require('node:assert/strict');
const { toUnits, fromUnits } = require('../src/utils/reversals');

test('reversal amounts are exact decimals, not floating point', () => {
  assert.equal(toUnits('12.5'), 1250000000n);
  assert.equal(fromUnits(toUnits('1040.7') - toUnits('1028.2')), '12.5');
  // 0.1 + 0.2 is 0.30000000000000004 in floating point; here it stays 0.3.
  assert.equal(fromUnits(toUnits('0.1') + toUnits('0.2')), '0.3');
  assert.equal(fromUnits(toUnits('1028.2')), '1028.2');
  assert.equal(fromUnits(0n), '0');
});

test('reversal amounts reject anything that is not a plain positive decimal', () => {
  for (const bad of ['-1', 'abc', '1e3', '', null, undefined, '1.2.3']) assert.equal(toUnits(bad), null, String(bad));
  assert.equal(toUnits('0.000000019'), 1n, 'more than 8 decimals is truncated');
});
