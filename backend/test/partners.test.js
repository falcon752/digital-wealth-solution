const test = require('node:test');
const assert = require('node:assert/strict');
const { CODE_ALPHABET, randomPartnerCode, normalizeCode, firstNameLastInitial, partnerShareUrl } = require('../src/utils/partners');

test('partner codes are DWP- plus 6 characters from the unambiguous alphabet', () => {
  for (let i = 0; i < 500; i += 1) {
    const code = randomPartnerCode();
    assert.match(code, /^DWP-[A-Z0-9]{6}$/);
    for (const ch of code.slice(4)) assert.ok(CODE_ALPHABET.includes(ch), `${ch} is not in the alphabet`);
  }
  for (const ambiguous of ['0', 'O', '1', 'I', 'L']) assert.ok(!CODE_ALPHABET.includes(ambiguous));
});

test('codes are normalized before lookup', () => {
  assert.equal(normalizeCode('  dwp-7k2m9q '), 'DWP-7K2M9Q');
  assert.equal(normalizeCode('DWP 7K2 M9Q'), 'DWP7K2M9Q');
  assert.equal(normalizeCode(null), '');
});

test('partners see only the first name and last initial of who they referred', () => {
  assert.equal(firstNameLastInitial({ firstName: 'Ada', lastName: 'lovelace' }), 'Ada L.');
  assert.equal(firstNameLastInitial({ firstName: 'Ada' }), 'Ada');
  assert.equal(firstNameLastInitial(null), 'Client');
});

test('the share link opens sign-up with the code filled in', () => {
  const previous = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = 'https://example.test/';
  assert.equal(partnerShareUrl('DWP-7K2M9Q'), 'https://example.test/register?partner=DWP-7K2M9Q');
  if (previous === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = previous;
});
