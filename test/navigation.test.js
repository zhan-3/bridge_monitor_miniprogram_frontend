const test = require('node:test');
const assert = require('node:assert/strict');
const { HOME_URL, resolvePostLoginUrl } = require('../utils/navigation');

test('returns to a safe internal page after login', () => {
  assert.equal(
    resolvePostLoginUrl(encodeURIComponent('/pages/devicebinding/devicebinding?sn=A001'), ''),
    '/pages/devicebinding/devicebinding?sn=A001'
  );
});

test('uses pending device SN when no explicit redirect exists', () => {
  assert.equal(
    resolvePostLoginUrl('', 'A 001'),
    '/pages/devicebinding/devicebinding?sn=A%20001'
  );
});

test('uses the alarm inbox as the default landing page', () => {
  assert.equal(HOME_URL, '/pages/alarms/alarms');
});

test('rejects external and traversal redirects', () => {
  assert.equal(resolvePostLoginUrl('https://evil.example', ''), HOME_URL);
  assert.equal(resolvePostLoginUrl('/pages/../admin', ''), HOME_URL);
  assert.equal(resolvePostLoginUrl('/pages/not-registered/not-registered', ''), HOME_URL);
});
