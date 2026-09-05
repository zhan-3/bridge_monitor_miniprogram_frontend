function formatDateTime(value) {
  return value ? String(value).replace('T', ' ') : '';
}

function normalizeAlarmItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    ...item,
    alarmId: String(item.alarmId || ''),
    displayTime: formatDateTime(item.alarmTime) || '时间未知',
    displayHandledAt: formatDateTime(item.handledAt)
  }));
}

module.exports = { formatDateTime, normalizeAlarmItems };
