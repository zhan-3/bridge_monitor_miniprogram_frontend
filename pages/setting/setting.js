import { loadDeviceData, buildMarkers } from '../../utils/deviceService';

Page({
  data: {
    autoRecord: true,
    recordQualityList: ['标准质量', '高清质量', '无损质量'],
    qualityIndex: 1,
    saveDayList: ['7天', '30天', '90天', '永久保存'],
    dayIndex: 1,
    alarmPush: true,
    alarmSound: true,
    disconnectWarn: true,
    isDeviceSetting: false,
    device: null,
    markers: [],
    showEditNameModal: false,
    tempName: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isDeviceSetting: true });
      this.loadDevice(options.id);
    }
    this.loadLocalSetting();
  },

  async loadDevice(deviceId) {
    const app = getApp();
    const deviceEntry = app.globalData.deviceTokens.find(d => d.sn === deviceId);
    const authToken = deviceEntry ? deviceEntry.token : '';

    const device = await loadDeviceData(deviceId, authToken);
    const markers = buildMarkers(device);

    this.setData({ device, markers });
  },

  loadLocalSetting() {
    const autoRecord = wx.getStorageSync('autoRecord') !== false ? true : wx.getStorageSync('autoRecord');
    const qualityIndex = wx.getStorageSync('recordQualityIndex') || 1;
    const dayIndex = wx.getStorageSync('recordSaveDayIndex') || 1;
    const alarmPush = wx.getStorageSync('alarmPush') !== false ? true : wx.getStorageSync('alarmPush');
    const alarmSound = wx.getStorageSync('alarmSound') !== false ? true : wx.getStorageSync('alarmSound');
    const disconnectWarn = wx.getStorageSync('disconnectWarn') !== false ? true : wx.getStorageSync('disconnectWarn');

    this.setData({
      autoRecord,
      qualityIndex,
      dayIndex,
      alarmPush,
      alarmSound,
      disconnectWarn
    });
  },

  switchAutoRecord(e) {
    this.setData({ autoRecord: e.detail.value });
  },

  changeRecordQuality(e) {
    this.setData({ qualityIndex: e.detail.value });
  },

  changeSaveDay(e) {
    this.setData({ dayIndex: e.detail.value });
  },

  switchAlarmPush(e) {
    this.setData({ alarmPush: e.detail.value });
  },

  switchAlarmSound(e) {
    this.setData({ alarmSound: e.detail.value });
  },

  switchDisconnectWarn(e) {
    this.setData({ disconnectWarn: e.detail.value });
  },

  editDeviceName() {
    const { device } = this.data;
    if (device) {
      this.setData({
        showEditNameModal: true,
        tempName: device.name
      });
    }
  },

  onNameInput(e) {
    this.setData({ tempName: e.detail.value });
  },

  closeEditNameModal() {
    this.setData({
      showEditNameModal: false,
      tempName: ''
    });
  },

  saveName() {
    const { device, tempName } = this.data;
    if (device && tempName.trim()) {
      this.setData({
        'device.name': tempName.trim(),
        showEditNameModal: false
      });
      wx.showToast({ title: '名称已修改', icon: 'success' });
    }
  },

  chooseLocation() {
    const { device } = this.data;
    
    wx.chooseLocation({
      success: (res) => {
        if (res && res.name) {
          const { latitude, longitude, address, name } = res;
          
          const markers = [{
            id: 1,
            latitude: latitude,
            longitude: longitude,
            iconPath: '/images/map.png',
            width: 32,
            height: 32
          }];
          
          this.setData({
            'device.latitude': latitude,
            'device.longitude': longitude,
            'device.address': address || name,
            markers: markers
          });
          
          wx.showToast({ title: '位置已选择', icon: 'success' });
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '选择位置失败', icon: 'none' });
      }
    });
  },

  saveSetting() {
    const { device, isDeviceSetting } = this.data;
    
    if (isDeviceSetting && device) {
      const devices = wx.getStorageSync('devices') || defaultDevices;
      const index = devices.findIndex(d => d.id === device.id);
      if (index >= 0) {
        devices[index] = { ...devices[index], ...device };
        wx.setStorageSync('devices', devices);
        console.log('Device saved:', devices[index]);
      } else {
        console.log('Device not found, adding new');
        devices.push(device);
        wx.setStorageSync('devices', devices);
      }
    }

    const { autoRecord, qualityIndex, dayIndex, alarmPush, alarmSound, disconnectWarn } = this.data;
    
    wx.setStorageSync('autoRecord', autoRecord);
    wx.setStorageSync('recordQualityIndex', qualityIndex);
    wx.setStorageSync('recordSaveDayIndex', dayIndex);
    wx.setStorageSync('alarmPush', alarmPush);
    wx.setStorageSync('alarmSound', alarmSound);
    wx.setStorageSync('disconnectWarn', disconnectWarn);

    wx.showToast({ title: '保存成功', icon: 'success' });
    
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
