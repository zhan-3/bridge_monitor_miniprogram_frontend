// 设备数据加载公共服务，供 device-detail 和 setting 页共用
import http from './http';
import { DEVICE_STATUS_MAP } from './constants';
import { getStorage, setStorage } from './storage';

const { loadDeviceDetailsConcurrently } = require('./deviceDetailsLoader');

async function loadDeviceStatus(deviceId, authToken) {
  try {
    const bindRes = await http.get('/user/bind/status', { deviceSn: deviceId }, {
      Authorization: `Bearer ${authToken}`
    });
    return bindRes.code === 1 && bindRes.data ? bindRes.data.status : null;
  } catch (err) {
    console.error('[deviceService] 获取绑定状态失败：', err);
    return null;
  }
}

async function loadDeviceLocation(deviceId, authToken) {
  try {
    const locRes = await http.get('/user/getLocation', { deviceSn: deviceId }, {
      Authorization: `Bearer ${authToken}`
    });
    return locRes.code === 1 && locRes.data ? locRes.data : null;
  } catch (err) {
    console.error('[deviceService] 获取设备位置失败：', err);
    return null;
  }
}

function createDevice(deviceId) {
  return {
    id: deviceId,
    sn: deviceId,
    name: deviceId,
    status: 'normal',
    statusText: '正常',
    latitude: 39.9042,
    longitude: 116.4074,
    address: '设备位置',
    contacts: []
  };
}

function applyStoredName(device) {
  try {
    const app = getApp();
    const stored = app && app.getDevice ? app.getDevice(device.sn) : null;
    if (stored && stored.name && stored.name !== device.sn) {
      device.name = stored.name;
    }
  } catch (err) {
    // 页面预览或测试环境可能没有 app 实例，使用 SN 作为默认名称。
  }
}

export async function loadDeviceData(deviceId, authToken) {
  const device = createDevice(deviceId);
  applyStoredName(device);

  const [status, location] = await Promise.all([
    loadDeviceStatus(deviceId, authToken),
    loadDeviceLocation(deviceId, authToken)
  ]);

  if (status) {
    device.status = status;
    device.statusText = DEVICE_STATUS_MAP[status] || '正常';
  }
  if (location) {
    device.latitude = parseFloat(location.gpsLat) || 39.9042;
    device.longitude = parseFloat(location.gpsLng) || 116.4074;
    device.address = location.address || '设备位置';
  }

  return device;
}

export async function loadDeviceContacts(authToken, deviceId) {
  try {
    const phoneRes = await http.get('/user/userGetPhone', { deviceSn: deviceId }, {
      Authorization: `Bearer ${authToken}`
    });
    if (phoneRes.code === 1 && Array.isArray(phoneRes.data)) {
      const nameCache = getStorage('contactNameCache') || {};
      return phoneRes.data.map((item, index) => {
        const phone = item.phone || '';
        return {
          id: 'c' + index,
          name: item.name || nameCache[phone] || '',
          phone
        };
      });
    }
  } catch (err) {
    console.error('[deviceService] 获取联系人失败：', err);
  }
  return [];
}

export async function loadDeviceDetails(deviceId, authToken) {
  return loadDeviceDetailsConcurrently({
    deviceId,
    authToken,
    loadDeviceData,
    loadDeviceContacts,
    buildMarkers
  });
}

export function buildMarkers(device) {
  const lat = Number(device.latitude);
  const lng = Number(device.longitude);
  if (!lat || !lng) return [];
  return [{
    id: 1,
    latitude: lat,
    longitude: lng,
    snippet: device.address || '未知地址',
    iconPath: '/images/marker.png',
    width: 32,
    height: 42,
    callout: {
      content: [
        device.name,
        device.status === 'alarm' ? '警报中' : '正常',
        device.address || '未知地址'
      ].filter(Boolean).join('\n'),
      display: 'BYCLICK',
      fontSize: 12,
      bgColor: device.status === 'alarm' ? '#dc143c' : '#52c41a',
      color: '#fff',
      padding: 8,
      borderRadius: 4
    },
    animation: true
  }];
}
