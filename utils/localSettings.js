function normalizeSettingIndex(value, fallback, maxIndex) {
  if (value === '' || value === null || typeof value === 'undefined') return fallback;
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index <= maxIndex ? index : fallback;
}

module.exports = { normalizeSettingIndex };
