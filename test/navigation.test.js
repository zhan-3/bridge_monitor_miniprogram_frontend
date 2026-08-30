const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePostLoginUrl } = require('../utils/navigation');

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

test('rejects external and traversal redirects', () => {
  assert.equal(resolvePostLoginUrl('https://evil.example', ''), '/pages/home/home');
  assert.equal(resolvePostLoginUrl('/pages/../admin', ''), '/pages/home/home');
  assert.equal(resolvePostLoginUrl('/pages/not-registered/not-registered', ''), '/pages/home/home');
});
