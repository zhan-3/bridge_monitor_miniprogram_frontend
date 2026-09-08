function classifyAuthResponse(statusCode, credentialScope, allowDeviceRequired = false) {
  if (statusCode === 401 && credentialScope !== 'none') {
    return { type: 'credential-invalid', scope: credentialScope };
  }
  if (statusCode === 403 && !allowDeviceRequired) return { type: 'device-required' };
  return { type: 'continue' };
}

module.exports = { classifyAuthResponse };
