const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthReset } = require('../utils/authReset');
const { classifyAuthResponse } = require('../utils/httpPolicy');

test('auth reset clears login credential, bound devices, selection, and user markers together', () => {
  const calls = [];
  const reset = createAuthReset({
    loginCredential: { clear: () => calls.push('login') },
    boundDeviceSet: { clear: () => calls.push('devices') },
    removeStorage: key => calls.push(`remove:${key}`),
    clearStorage: () => calls.push('storage')
  });

  reset.clear();

  assert.deepEqual(calls, [
    'login',
    'devices',
    'remove:isLogin',
    'remove:userInfo',
    'storage'
  ]);
});

test('401 requests require auth reset while 403 preserves the current session', () => {
  assert.deepEqual(classifyAuthResponse(401, false), { type: 'auth-expired' });
  assert.deepEqual(classifyAuthResponse(403, false), { type: 'device-required' });
  assert.deepEqual(classifyAuthResponse(403, true), { type: 'continue' });
  assert.deepEqual(classifyAuthResponse(200, false), { type: 'continue' });
});
