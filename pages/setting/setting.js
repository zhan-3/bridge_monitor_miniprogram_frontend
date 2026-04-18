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
    if (!device || !tempName.trim()) return;
    const newName = tempName.trim();
    this.setData({
      'device.name': newName,
      showEditNameModal: false,
      tempName: ''
    });
    // 同步到 globalData.deviceTokens 和本地存储
    const app = getApp();
    const deviceTokens = app.globalData.deviceTokens || [];
    const idx = deviceTokens.findIndex(d => d.sn === device.sn);
    if (idx >= 0) {
      deviceTokens[idx].name = newName;
      app.globalData.deviceTokens = deviceTokens;
      wx.setStorageSync('deviceTokens', deviceTokens);
    }
    wx.toast({ title: '名称已修改', icon: 'success' });
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
          
          wx.toast({ title: '位置已选择', icon: 'success' });
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.toast({ title: '选择位置失败', icon: 'none' });
      }
    });
  },

  saveSetting() {
    const { device, isDeviceSetting } = this.data;

    if (isDeviceSetting && device) {
      // 将设备名称同步到 deviceTokens
      const app = getApp();
      const deviceTokens = app.globalData.deviceTokens || [];
      const idx = deviceTokens.findIndex(d => d.sn === device.sn);
      if (idx >= 0) {
        deviceTokens[idx].name = device.name;
        app.globalData.deviceTokens = deviceTokens;
        wx.setStorageSync('deviceTokens', deviceTokens);
      }
    }

    const { autoRecord, qualityIndex, dayIndex, alarmPush, alarmSound, disconnectWarn } = this.data;
    
    wx.setStorageSync('autoRecord', autoRecord);
    wx.setStorageSync('recordQualityIndex', qualityIndex);
    wx.setStorageSync('recordSaveDayIndex', dayIndex);
    wx.setStorageSync('alarmPush', alarmPush);
    wx.setStorageSync('alarmSound', alarmSound);
    wx.setStorageSync('disconnectWarn', disconnectWarn);

    wx.toast({ title: '保存成功', icon: 'success' });
    
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
