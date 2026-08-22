const DEVICE_STORAGE_KEY = 'boundDevices';
const SELECTED_DEVICE_KEY = 'selectedDeviceSn';
const LEGACY_DEVICES_KEY = 'deviceTokens';
const LEGACY_SELECTED_KEY = 'currentSn';

function cloneDevice(device) {
  return {
    sn: device.sn,
    name: device.name || device.sn,
    deviceAccessToken: device.deviceAccessToken
  };
}

function normalizeDevice(device) {
  if (!device || !device.sn) return null;
  const deviceAccessToken = device.deviceAccessToken || device.token;
  if (!deviceAccessToken) return null;
  return cloneDevice({ ...device, deviceAccessToken });
}

function createBoundDeviceSet(storage) {
  let devices = [];
  let selectedSn = '';

  function persist() {
    storage.set(DEVICE_STORAGE_KEY, devices.map(cloneDevice));
    storage.set(SELECTED_DEVICE_KEY, selectedSn);
  }

  function restore() {
    const storedDevices = storage.get(DEVICE_STORAGE_KEY, null);
    const legacyDevices = storage.get(LEGACY_DEVICES_KEY, []);
    const source = Array.isArray(storedDevices) ? storedDevices : legacyDevices;
    devices = (Array.isArray(source) ? source : [])
      .map(normalizeDevice)
      .filter(Boolean);
    selectedSn = storage.get(SELECTED_DEVICE_KEY, null) || storage.get(LEGACY_SELECTED_KEY, '');

    if (Array.isArray(storedDevices)) {
      persist();
    } else if (devices.length > 0 || selectedSn) {
      persist();
    }
    return list();
  }

  function list() {
    return devices.map(cloneDevice);
  }

  function get(sn) {
    const device = devices.find(item => item.sn === sn);
    return device ? cloneDevice(device) : null;
  }

  function deviceAccessToken(sn) {
    const device = devices.find(item => item.sn === sn);
    return device ? device.deviceAccessToken : '';
  }

  function select(sn) {
    if (!devices.some(item => item.sn === sn)) return false;
    selectedSn = sn;
    persist();
    return true;
  }

  function bind(device) {
    const normalized = normalizeDevice(device);
    if (!normalized) throw new Error('设备必须包含 SN 和设备访问凭证');
    const index = devices.findIndex(item => item.sn === normalized.sn);
    if (index >= 0) devices[index] = normalized;
    else devices.push(normalized);
    selectedSn = normalized.sn;
    persist();
    return cloneDevice(normalized);
  }

  function rename(sn, name) {
    const device = devices.find(item => item.sn === sn);
    if (!device) return false;
    device.name = name || sn;
    persist();
    return true;
  }

  function clear() {
    devices = [];
    selectedSn = '';
    persist();
  }

  restore();

  return Object.freeze({
    list,
    get,
    deviceAccessToken,
    selectedDeviceSn: () => selectedSn,
    select,
    bind,
    rename,
    clear,
    restore
  });
}

module.exports = { createBoundDeviceSet };
