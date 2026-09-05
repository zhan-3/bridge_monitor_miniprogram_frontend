function normalizeVerificationCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function isValidVerificationCode(value) {
  return /^\d{6}$/.test(String(value || ''));
}

module.exports = { normalizeVerificationCode, isValidVerificationCode };
