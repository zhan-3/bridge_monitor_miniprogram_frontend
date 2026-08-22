const test = require('node:test');
const assert = require('node:assert/strict');
const { loadDeviceDetailsConcurrently } = require('../utils/deviceDetailsLoader');
const { createRequestVersion } = require('../utils/requestVersion');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('starts device data and contacts together and combines both results', async () => {
  const device = deferred();
  const contacts = deferred();
  const calls = [];

  const resultPromise = loadDeviceDetailsConcurrently({
    deviceId: 'A',
    authToken: 'access-A',
    loadDeviceData: async (id, token) => {
      calls.push(['device', id, token]);
      return device.promise;
    },
    loadDeviceContacts: async (token, id) => {
      calls.push(['contacts', id, token]);
      return contacts.promise;
    },
    buildMarkers: value => ({ markerFor: value.sn })
  });

  assert.deepEqual(calls, [
    ['device', 'A', 'access-A'],
    ['contacts', 'A', 'access-A']
  ]);

  device.resolve({ sn: 'A', name: '桥 A' });
  contacts.resolve([{ id: 'c1', phone: '13800000000' }]);

  assert.deepEqual(await resultPromise, {
    device: {
      sn: 'A',
      name: '桥 A',
      contacts: [{ id: 'c1', phone: '13800000000' }]
    },
    markers: { markerFor: 'A' }
  });
});

test('only the latest detail request remains current', () => {
  const requests = createRequestVersion();
  const first = requests.begin();
  const second = requests.begin();

  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
});
