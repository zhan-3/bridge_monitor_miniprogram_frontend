import { loadDeviceData, buildMarkers } from '../../utils/deviceService';
import http from '../../utils/http';
import { getStorage, setStorage } from '../../utils/storage';
import { isValidPhone } from '../../utils/validators';

Page({
  data: {
    userInfo: {},
    showPhoneModal: false,
    phone: '',
    phoneError: false,
    autoRecord: true,
    recordQualityList: ['标准质量', '高清质量', '无损质量'],
    qualityIndex: 1,
    saveDayList: ['7天', '30天', '90天', '永久保存'],
    dayIndex: 1,
    alarmPush: true,
    alarmSound: true,
    disconnectWarn: true,
    isDeviceSetting: false,
    isSaving: false,
    device: null,
    markers: [],
    showEditNameModal: false,
    tempName: ''
  },

  onLoad(options) {
    this.loadUserInfo();
    if (options.id) {
      this.setData({ isDeviceSetting: true });
      this.loadDevice(options.id);
    }
    this.loadLocalSetting();
  },

  loadUserInfo() {
    const userInfo = getStorage('userInfo') || {};
    this.setData({ userInfo });
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    const userInfo = { ...this.data.userInfo, avatarUrl };
    setStorage('userInfo', userInfo);
    this.setData({ userInfo });
    this.saveUserProfile({ avatarUrl });
  },

  onNicknameInput(e) {
    const nickName = e.detail.value;
    if (!nickName) return;
    const userInfo = { ...this.data.userInfo, nickName };
    setStorage('userInfo', userInfo);
    this.setData({ userInfo });
    this.saveUserProfile({ nickName });
  },

  async saveUserProfile(fields) {
    try {
      await http.post('/user/getMessage', fields)
    } catch (err) {
      console.log('[setting] 保存用户信息失败（已缓存本地）:', err)
    }
  },

  async loadDevice(deviceId) {
    const app = getApp();
    const deviceEntry = app.getDevice(deviceId);
    const authToken = deviceEntry ? deviceEntry.deviceAccessToken : '';

    const device = await loadDeviceData(deviceId, authToken);
    const markers = buildMarkers(device);

    this.setData({ device, markers });
  },

  loadLocalSetting() {
    let settings = getStorage('localSettings');
    if (!settings || typeof settings !== 'object') {
      // 向后兼容：从旧版独立 key 迁移
      settings = {
        autoRecord: wx.getStorageSync('autoRecord'),
        qualityIndex: wx.getStorageSync('recordQualityIndex') || 1,
        dayIndex: wx.getStorageSync('recordSaveDayIndex') || 1,
        alarmPush: wx.getStorageSync('alarmPush'),
        alarmSound: wx.getStorageSync('alarmSound'),
        disconnectWarn: wx.getStorageSync('disconnectWarn')
      };
      setStorage('localSettings', settings);
    }

    this.setData({
      autoRecord: settings.autoRecord !== false,
      qualityIndex: settings.qualityIndex || 1,
      dayIndex: settings.dayIndex || 1,
      alarmPush: settings.alarmPush !== false,
      alarmSound: settings.alarmSound !== false,
      disconnectWarn: settings.disconnectWarn !== false
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

  showPhoneModal() {
    this.setData({ showPhoneModal: true, phone: '', phoneError: false });
  },

  hidePhoneModal() {
    this.setData({ showPhoneModal: false, phone: '', phoneError: false });
  },

  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ phone, phoneError: phone.length > 0 && !isValidPhone(phone) });
  },

  async confirmPhone() {
    const { phone } = this.data;
    if (!isValidPhone(phone)) {
      wx.toast({ title: '请输入正确的手机号', icon: 'none' });
      this.setData({ phoneError: true });
      return;
    }

    const token = getApp().getLoginToken();
    if (!token) {
      wx.toast({ title: '请先完成登录', icon: 'error' });
      return;
    }

    // 超时保护：8 秒后自动隐藏 loading
    wx.showLoading({ title: '保存中...' });
    const timeoutId = setTimeout(() => {
      wx.hideLoading();
      wx.toast({ title: '请求超时，请重试', icon: 'none' });
    }, 8000);

    try {
      const res = await http.post('/user/userBindPhone?phone=' + phone, {}, {
        Authorization: `Bearer ${token}`
      }, true);
      clearTimeout(timeoutId);
      wx.hideLoading();

      if (res.code !== 1) {
        wx.toast({ title: res.msg || '保存失败', icon: 'none' });
        return;
      }

      const userInfo = { ...this.data.userInfo, phone };
      setStorage('userInfo', userInfo);
      setStorage('phone', phone);
      this.setData({ userInfo, showPhoneModal: false });
      wx.toast({ title: '手机号绑定成功', icon: 'success' });
    } catch (err) {
      clearTimeout(timeoutId);
      wx.hideLoading();
      console.error('[setting] confirmPhone 异常:', err);
      wx.toast({ title: '网络异常，请重试', icon: 'none' });
    }
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
    getApp().renameDevice(device.sn, newName);
    wx.toast({ title: '名称已修改', icon: 'success' });
  },

  chooseLocation() {
    const { device } = this.data;
    const initialLatitude = Number(device?.latitude) || 39.9042;
    const initialLongitude = Number(device?.longitude) || 116.4074;

    const openPicker = () => {
      wx.chooseLocation({
        latitude: initialLatitude,
        longitude: initialLongitude,
        success: async (res) => {
          if (!res) return;

          const latitude = Number(res.latitude) || initialLatitude;
          const longitude = Number(res.longitude) || initialLongitude;
          const address = res.address || res.name || '设备位置';

          const markers = [{
            id: 1,
            latitude,
            longitude,
            iconPath: '/images/map.png',
            width: 32,
            height: 32
          }];

          this.setData({
            'device.latitude': latitude,
            'device.longitude': longitude,
            'device.address': address,
            markers
          });

          try {
            const app = getApp();
            const authToken = app.getDeviceAccessToken(device.sn);
            await http.post('/device/updateLocation', {
              deviceSn: device.sn,
              latitude,
              longitude,
              address
            }, {
              Authorization: `Bearer ${authToken}`
            });
          } catch (err) {
            console.error('[setting] 保存设备位置失败：', err);
          }

          wx.toast({ title: '位置已选择', icon: 'success' });
        },
        fail: (err) => {
          console.error('[setting] chooseLocation fail:', err);
          if (err.errMsg && err.errMsg.includes('cancel')) return;
          wx.toast({ title: '选择位置失败', icon: 'none' });
        }
      });
    };

    wx.getSetting({
      success: (res) => {
        if (res.authSetting && res.authSetting['scope.userLocation']) {
          openPicker();
          return;
        }

        wx.authorize({
          scope: 'scope.userLocation',
          success: openPicker,
          fail: () => {
            wx.toast({ title: '请先开启定位权限', icon: 'none' });
          }
        });
      },
      fail: openPicker
    });
  },

  saveSetting() {
    if (this.data.isSaving) return;
    this.setData({ isSaving: true });
    const { device, isDeviceSetting } = this.data;

    if (isDeviceSetting && device) {
      getApp().renameDevice(device.sn, device.name);
    }

    const { autoRecord, qualityIndex, dayIndex, alarmPush, alarmSound, disconnectWarn } = this.data;
    setStorage('localSettings', { autoRecord, qualityIndex, dayIndex, alarmPush, alarmSound, disconnectWarn });

    wx.toast({ title: '保存成功', icon: 'success' });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
