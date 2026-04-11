// 设备数据加载公共服务，供 device-detail 和 setting 页共用
import http from './http';

/**
 * 加载设备基本信息（名称、状态、GPS位置）
 * @param {string} deviceId - 设备SN码
 * @param {string} authToken - 该设备对应的 Bearer token
 * @returns {Object} device 对象
 */
export async function loadDeviceData(deviceId, authToken) {
  const device = {
    id: deviceId,
    name: '我的报警器',
    status: 'normal',
    latitude: 39.9042,
    longitude: 116.4074,
    address: '设备位置',
    contacts: []
  };

  // 获取绑定信息（设备名称、状态）
  try {
    const bindRes = await http.get('/user/bind/status', {}, {
      Authorization: `Bearer ${authToken}`
    });
    if (bindRes.code === 1 && bindRes.data && bindRes.data !== '') {
      device.name = bindRes.data.deviceName || '我的报警器';
      if (bindRes.data.status) device.status = bindRes.data.status;
    }
  } catch (err) {
    console.error('[deviceService] 获取绑定状态失败：', err);
  }

  // 获取GPS位置
  try {
    const locRes = await http.get('/user/getLocation', {}, {
      Authorization: `Bearer ${authToken}`
    });
    if (locRes.code === 1 && locRes.data) {
      device.latitude = parseFloat(locRes.data.gpsLat) || 39.9042;
      device.longitude = parseFloat(locRes.data.gpsLng) || 116.4074;
      device.address = locRes.data.address || '设备位置';
    }
  } catch (err) {
    console.error('[deviceService] 获取设备位置失败：', err);
  }

  return device;
}

/**
 * 加载设备紧急联系人列表
 * @param {string} authToken - 该设备对应的 Bearer token
 * @returns {Array} contacts 数组
 */
export async function loadDeviceContacts(authToken) {
  try {
    const phoneRes = await http.get('/user/userGetPhone', {}, {
      Authorization: `Bearer ${authToken}`
    });
    if (phoneRes.code === 1 && Array.isArray(phoneRes.data)) {
      return phoneRes.data.map((item, index) => ({
        id: 'c' + index,
        name: item.name,
        phone: item.phone
      }));
    }
  } catch (err) {
    console.error('[deviceService] 获取联系人失败：', err);
  }
  return [];
}

/**
 * 根据设备数据构建地图标记
 * @param {Object} device
 * @returns {Array} markers
 */
export function buildMarkers(device) {
  const lat = Number(device.latitude);
  const lng = Number(device.longitude);
  if (!lat || !lng) return [];
  return [{
    id: 1,
    latitude: lat,
    longitude: lng,
    snippet: device.address || '未知地址',
    iconPath: '/images/marker-emergency.png',
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
