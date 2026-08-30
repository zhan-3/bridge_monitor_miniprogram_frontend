const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettingIndex } = require('../utils/localSettings');

test('preserves the first picker option instead of replacing index zero', () => {
  assert.equal(normalizeSettingIndex(0, 1, 3), 0);
  assert.equal(normalizeSettingIndex('0', 1, 3), 0);
});

test('falls back for missing and out-of-range picker indexes', () => {
  assert.equal(normalizeSettingIndex('', 1, 3), 1);
  assert.equal(normalizeSettingIndex(9, 1, 3), 1);
  assert.equal(normalizeSettingIndex('broken', 1, 3), 1);
});
