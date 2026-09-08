const test = require('node:test');
const assert = require('node:assert/strict');
const { createWxStorageAdapter, createWxNavigationAdapter } = require('../utils/authAdapters');

test('production storage adapter maps synchronous WeChat storage operations', () => {
  const values = { token: 'legacy' };
  const wxApi = {
    getStorageSync: key => values[key] === undefined ? '' : values[key],
    setStorageSync: (key, value) => { values[key] = value; },
    removeStorageSync: key => { delete values[key]; }
  };
  const storage = createWxStorageAdapter(wxApi);

  assert.equal(storage.get('token', 'fallback'), 'legacy');
  assert.equal(storage.get('missing', 'fallback'), 'fallback');
  storage.set('loginToken', 'login-user');
  storage.remove('token');
  assert.deepEqual(values, { loginToken: 'login-user' });
});

test('production navigation adapter reLaunches only when the route path changes', () => {
  const calls = [];
  const wxApi = { reLaunch: options => calls.push(options) };
  const currentPages = [{ route: 'pages/login/login' }];
  const navigation = createWxNavigationAdapter(wxApi, () => currentPages);

  navigation.reLaunch('/pages/login/login?redirect=%2Fpages%2Fhome%2Fhome');
  navigation.reLaunch('/pages/home/home?from=login');

  assert.deepEqual(calls, [{ url: '/pages/home/home?from=login' }]);
});
