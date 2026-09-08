const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDateTime, normalizeAlarmItems, mergeAlarmItems } = require('../utils/alarmInbox');

test('formats recent alarm times in a human-friendly way', () => {
  const now = new Date('2026-09-05T18:00:00');
  assert.equal(formatDateTime('2026-09-05T12:30:00', now), '今天 12:30');
  assert.equal(formatDateTime('2026-09-04T22:10:00', now), '昨天 22:10');
  assert.equal(formatDateTime('2026-08-30T08:05:00', now), '8月30日 08:05');
  assert.equal(formatDateTime('2025-12-31T23:00:00', now), '2025年12月31日 23:00');
});

test('normalizes alarm ids without inventing status', () => {
  const item = normalizeAlarmItems([{
    alarmId: 9007199254740991,
    alarmTime: null,
    handledAt: null,
    status: 'pending'
  }])[0];

  assert.equal(item.alarmId, '9007199254740991');
  assert.equal(item.status, 'pending');
  assert.equal(item.displayTime, '时间未知');
  assert.equal(item.displayHandledAt, '');
});

test('adds the local device name without replacing the event device SN', () => {
  const item = normalizeAlarmItems([{
    alarmId: '42',
    deviceSn: 'SN-001',
    status: 'pending'
  }], [{ sn: 'SN-001', name: '东桥烟感' }])[0];

  assert.equal(item.deviceName, '东桥烟感');
  assert.equal(item.deviceSn, 'SN-001');
  assert.equal(item.canHandle, true);
});

test('marks an alarm without an id as unavailable for handling', () => {
  const item = normalizeAlarmItems([{ status: 'pending' }])[0];
  assert.equal(item.canHandle, false);
});

test('sorts pending and handled alarms by alarm time from newest to oldest', () => {
  for (const status of ['pending', 'handled']) {
    const items = normalizeAlarmItems([
      { alarmId: `${status}-old`, status, alarmTime: '2026-09-05T08:00:00' },
      { alarmId: `${status}-new`, status, alarmTime: '2026-09-07T08:00:00' },
      { alarmId: `${status}-middle`, status, alarmTime: '2026-09-06T08:00:00' }
    ]);

    assert.deepEqual(items.map(item => item.alarmId), [
      `${status}-new`,
      `${status}-middle`,
      `${status}-old`
    ]);
  }
});

test('treats a missing alarm collection as empty', () => {
  assert.deepEqual(normalizeAlarmItems(null), []);
});

test('appends alarm pages without duplicating stable alarm ids', () => {
  const firstPage = [{ alarmId: '3' }, { alarmId: '2' }];
  const secondPage = [{ alarmId: '2' }, { alarmId: '1' }];

  assert.deepEqual(mergeAlarmItems(firstPage, secondPage), [
    { alarmId: '3' },
    { alarmId: '2' },
    { alarmId: '1' }
  ]);
});

test('keeps alarm items without ids instead of silently dropping data', () => {
  assert.deepEqual(mergeAlarmItems(null, [{ alarmId: '' }, { alarmId: '' }]), [
    { alarmId: '' },
    { alarmId: '' }
  ]);
});
