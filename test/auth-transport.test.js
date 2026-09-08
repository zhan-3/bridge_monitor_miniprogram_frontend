const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthTransport } = require('../utils/authTransport');

function recordingHttp() {
  const calls = [];
  return {
    calls,
    async get(...args) {
      calls.push(['get', ...args]);
      if (args[0] === '/user/getMainMessage') return { data: { phone: '13800000000' } };
      if (args[2] && args[2].credentialScope === 'device') return { data: { status: 'normal' } };
      return { data: ['A'] };
    },
    async post(...args) {
      calls.push(['post', ...args]);
      return { data: 'fresh-A' };
    }
  };
}

test('production authentication transport declares login and device credential scopes explicitly', async () => {
  const http = recordingHttp();
  const transport = createAuthTransport(http);

  assert.deepEqual(await transport.validateLogin('login-user'), { phone: '13800000000' });
  assert.deepEqual(await transport.listBoundDevices('login-user'), ['A']);
  assert.deepEqual(await transport.validateDevice({ sn: 'A', deviceAccessToken: 'access-A' }), { status: 'normal' });
  assert.equal(await transport.refreshDevice('login-user', 'A'), 'fresh-A');

  assert.deepEqual(http.calls, [
    ['get', '/user/getMainMessage', {}, {
      credentialScope: 'login', credential: 'login-user', invalidateOn401: false
    }],
    ['get', '/user/bind/status', {}, {
      credentialScope: 'login', credential: 'login-user', invalidateOn401: false
    }],
    ['get', '/user/bind/status', { deviceSn: 'A' }, {
      credentialScope: 'device', credential: 'access-A', deviceSn: 'A', invalidateOn401: false
    }],
    ['post', '/user/bind/userDeviceLogin', { deviceId: 'A', deviceSn: 'A' }, {
      credentialScope: 'login', credential: 'login-user', invalidateOn401: false
    }]
  ]);
});
