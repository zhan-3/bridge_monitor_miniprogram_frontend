const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAlarmItems } = require('../utils/alarmInbox');

test('normalizes alarm ids and display timestamps without inventing status', () => {
  assert.deepEqual(normalizeAlarmItems([{
    alarmId: 9007199254740991,
    alarmTime: '2026-09-05T12:30:00',
    handledAt: null,
    status: 'pending'
  }]), [{
    alarmId: '9007199254740991',
    alarmTime: '2026-09-05T12:30:00',
    handledAt: null,
    status: 'pending',
    displayTime: '2026-09-05 12:30:00',
    displayHandledAt: ''
  }]);
});

test('treats a missing alarm collection as empty', () => {
  assert.deepEqual(normalizeAlarmItems(null), []);
});
