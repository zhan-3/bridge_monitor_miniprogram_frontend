function classifyAuthResponse(statusCode, skipAuthCheck) {
  if (statusCode === 401) return { type: 'auth-expired' };
  if (statusCode === 403 && !skipAuthCheck) return { type: 'device-required' };
  return { type: 'continue' };
}

module.exports = { classifyAuthResponse };
