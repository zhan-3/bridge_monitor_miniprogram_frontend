function createAuthTransport(http) {
  const loginOptions = credential => ({
    credentialScope: 'login',
    credential,
    invalidateOn401: false
  });

  return Object.freeze({
    async validateLogin(credential) {
      const response = await http.get('/user/getMainMessage', {}, loginOptions(credential));
      return response.data || {};
    },

    async listBoundDevices(credential) {
      const response = await http.get('/user/bind/status', {}, loginOptions(credential));
      return Array.isArray(response.data) ? response.data : [];
    },

    async validateDevice(device) {
      const response = await http.get('/user/bind/status', { deviceSn: device.sn }, {
        credentialScope: 'device',
        credential: device.deviceAccessToken,
        deviceSn: device.sn,
        invalidateOn401: false
      });
      return response.data || {};
    },

    async refreshDevice(credential, sn) {
      const response = await http.post('/user/bind/userDeviceLogin', {
        deviceId: sn,
        deviceSn: sn
      }, loginOptions(credential));
      return response.data || '';
    }
  });
}

module.exports = { createAuthTransport };
