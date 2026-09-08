const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyAuthResponse } = require('../utils/httpPolicy');

test('401 classification preserves the explicitly declared credential scope', () => {
  assert.deepEqual(classifyAuthResponse(401, 'login'), {
    type: 'credential-invalid', scope: 'login'
  });
  assert.deepEqual(classifyAuthResponse(401, 'device'), {
    type: 'credential-invalid', scope: 'device'
  });
  assert.deepEqual(classifyAuthResponse(401, 'none'), { type: 'continue' });
});

test('403 policy remains independent from credential invalidation', () => {
  assert.deepEqual(classifyAuthResponse(403, 'login'), { type: 'device-required' });
  assert.deepEqual(classifyAuthResponse(403, 'login', true), { type: 'continue' });
});
