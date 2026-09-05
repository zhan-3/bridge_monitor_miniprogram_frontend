const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeVerificationCode,
  isValidVerificationCode
} = require('../utils/phoneVerification');

test('keeps only the first six verification-code digits', () => {
  assert.equal(normalizeVerificationCode('12a34 567'), '123456');
  assert.equal(normalizeVerificationCode(null), '');
});

test('accepts exactly six verification-code digits', () => {
  assert.equal(isValidVerificationCode('012345'), true);
  assert.equal(isValidVerificationCode('12345'), false);
  assert.equal(isValidVerificationCode('12345a'), false);
});
