const test = require('node:test');
const assert = require('node:assert/strict');
const { body, validationResult, matchedData } = require('express-validator');
const { canonicalEmail } = require('../src/utils/emailIdentity');

// Sign-up saves the email through express-validator's normalizeEmail(). Anything else that saves an
// email (the admin's Edit details) must produce exactly the same string, or sign-in can't find it.
async function signupForm(email) {
  const req = { body: { email } };
  await body('email').isEmail().normalizeEmail().run(req);
  assert.ok(validationResult(req).isEmpty());
  return matchedData(req).email;
}

test('canonicalEmail matches how sign-up saves an email', async () => {
  for (const email of [
    'John.Doe@Gmail.com',
    'john.doe+dwp@gmail.com',
    'Someone@GoogleMail.com',
    '  Client@Example.COM ',
    'first.last@company.co.uk',
    'user+tag@outlook.com',
  ]) {
    assert.equal(canonicalEmail(email), await signupForm(email.trim()), email);
  }
});

test('canonicalEmail drops Gmail dots and tags but keeps other domains as typed', () => {
  assert.equal(canonicalEmail('Pure.Blood.TX@gmail.com'), 'purebloodtx@gmail.com');
  assert.equal(canonicalEmail('first.last@company.com'), 'first.last@company.com');
  assert.equal(canonicalEmail(''), '');
});
