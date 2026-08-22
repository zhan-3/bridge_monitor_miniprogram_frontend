const test = require('node:test');
const assert = require('node:assert/strict');
const { createBoundDeviceSet } = require('../utils/boundDeviceSet');
const { createLoginCredential } = require('../utils/loginCredential');

function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    get(key, fallback = null) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
    },
    set(key, value) {
      values[key] = value;
    },
    remove(key) {
      delete values[key];
    },
    snapshot() {
      return { ...values };
    }
  };
}

test('restores and migrates legacy device credentials without changing their meaning', () => {
  const storage = memoryStorage({
    deviceTokens: [{ sn: 'A', token: 'access-A', name: '桥 A' }],
    currentSn: 'A'
  });
  const devices = createBoundDeviceSet(storage);

  assert.deepEqual(devices.list(), [{ sn: 'A', name: '桥 A', deviceAccessToken: 'access-A' }]);
  assert.equal(devices.selectedDeviceSn(), 'A');
  assert.equal(devices.deviceAccessToken('A'), 'access-A');
  assert.deepEqual(storage.snapshot().boundDevices, [
    { sn: 'A', name: '桥 A', deviceAccessToken: 'access-A' }
  ]);
  assert.equal(storage.snapshot().selectedDeviceSn, 'A');
});

test('binding a device atomically stores its credential and selects it', () => {
  const storage = memoryStorage();
  const devices = createBoundDeviceSet(storage);

  devices.bind({ sn: 'B', name: '桥 B', deviceAccessToken: 'access-B' });

  assert.deepEqual(devices.list(), [{ sn: 'B', name: '桥 B', deviceAccessToken: 'access-B' }]);
  assert.equal(devices.selectedDeviceSn(), 'B');
  assert.equal(devices.deviceAccessToken('B'), 'access-B');
});

test('selecting a device never changes the login credential', () => {
  const storage = memoryStorage({ loginToken: 'login-user' });
  const login = createLoginCredential(storage);
  const devices = createBoundDeviceSet(storage);

  devices.bind({ sn: 'A', name: '桥 A', deviceAccessToken: 'access-A' });
  devices.bind({ sn: 'B', name: '桥 B', deviceAccessToken: 'access-B' });
  devices.select('A');

  assert.equal(login.get(), 'login-user');
  assert.equal(devices.deviceAccessToken('A'), 'access-A');
  assert.equal(devices.deviceAccessToken('B'), 'access-B');
});

test('renaming a device preserves its access credential', () => {
  const storage = memoryStorage({
    boundDevices: [{ sn: 'A', name: '旧名称', deviceAccessToken: 'access-A' }],
    selectedDeviceSn: 'A'
  });
  const devices = createBoundDeviceSet(storage);

  devices.rename('A', '新名称');

  assert.deepEqual(devices.get('A'), {
    sn: 'A', name: '新名称', deviceAccessToken: 'access-A'
  });
});

test('renamed devices keep their name after the app restores from storage', () => {
  const storage = memoryStorage({
    boundDevices: [{ sn: 'A', name: '旧名称', deviceAccessToken: 'access-A' }],
    selectedDeviceSn: 'A'
  });
  const firstSession = createBoundDeviceSet(storage);

  firstSession.rename('A', '桥梁 A');
  const restoredSession = createBoundDeviceSet(storage);

  assert.equal(restoredSession.get('A').name, '桥梁 A');
  assert.equal(restoredSession.get('A').deviceAccessToken, 'access-A');
});

test('login credential migrates from the legacy token key but new writes use loginToken', () => {
  const storage = memoryStorage({ token: 'login-user' });
  const login = createLoginCredential(storage);

  assert.equal(login.get(), 'login-user');
  login.set('new-login-user');

  assert.equal(storage.snapshot().loginToken, 'new-login-user');
  assert.equal(storage.snapshot().token, 'login-user');
});
