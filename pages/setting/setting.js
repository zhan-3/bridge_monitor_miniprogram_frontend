import { loadDeviceData, loadDeviceInstallationLocation, buildMarkers } from '../../utils/deviceService';
import http from '../../utils/http';
import { getStorage, setStorage } from '../../utils/storage';
import { isValidPhone } from '../../utils/validators';
import logger from '../../utils/logger';
const { normalizeSettingIndex } = require('../../utils/localSettings');

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
    deviceLoading: false,
    deviceLoadError: false,
    isSaving: false,
    isBindingPhone: false,
    phoneErrorMessage: '',
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

  onUnload() {
    if (this.profileSaveTimer) clearTimeout(this.profileSaveTimer);
    if (this.navigateTimer) clearTimeout(this.navigateTimer);
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
    const userInfo = { ...this.data.userInfo, nickName };
    setStorage('userInfo', userInfo);
    this.setData({ userInfo });

    if (this.profileSaveTimer) clearTimeout(this.profileSaveTimer);
    this.profileSaveTimer = setTimeout(() => {
      this.saveUserProfile({ nickName: nickName.trim() });
      this.profileSaveTimer = null;
    }, 500);
  },

  async saveUserProfile(fields) {
    try {
      await http.post('/user/getMessage', fields)
    } catch (err) {
      logger.warn('保存用户信息失败，已缓存本地', { error: err })
    }
  },

  async loadDevice(deviceId) {
    this.setData({ deviceLoading: true, deviceLoadError: false });
    try {
      const app = getApp();
      const deviceEntry = app.getDevice(deviceId);
      const authToken = deviceEntry ? deviceEntry.deviceAccessToken : '';
      const device = await loadDeviceData(deviceId, authToken);
      const installLocation = await loadDeviceInstallationLocation(deviceId, authToken);
      if (installLocation) {
        const latitude = Number(installLocation.gpsLat);
        const longitude = Number(installLocation.gpsLng);
        device.latitude = Number.isFinite(latitude) ? latitude : device.latitude;
        device.longitude = Number.isFinite(longitude) ? longitude : device.longitude;
        device.address = installLocation.address || device.address;
      }
      const markers = buildMarkers(device);
      const deviceLoadError = device.status === 'unknown' && !device.address && markers.length === 0;
      this.setData({ device, markers, deviceLoadError });
    } catch (err) {
      logger.error('设置页加载设备信息失败', { deviceId, error: err });
      this.setData({ deviceLoadError: true });
    } finally {
      this.setData({ deviceLoading: false });
    }
  },

  retryLoadDevice() {
    const deviceId = this.data.device && this.data.device.id;
    if (deviceId) this.loadDevice(deviceId);
  },

  loadLocalSetting() {
    let settings = getStorage('localSettings');
    if (!settings || typeof settings !== 'object') {
      // 向后兼容：从旧版独立 key 迁移
      settings = {
        autoRecord: wx.getStorageSync('autoRecord'),
        qualityIndex: normalizeSettingIndex(wx.getStorageSync('recordQualityIndex'), 1, 2),
        dayIndex: normalizeSettingIndex(wx.getStorageSync('recordSaveDayIndex'), 1, 3),
        alarmPush: wx.getStorageSync('alarmPush'),
        alarmSound: wx.getStorageSync('alarmSound'),
        disconnectWarn: wx.getStorageSync('disconnectWarn')
      };
      setStorage('localSettings', settings);
    }

    this.setData({
      autoRecord: settings.autoRecord !== false,
      qualityIndex: normalizeSettingIndex(settings.qualityIndex, 1, 2),
      dayIndex: normalizeSettingIndex(settings.dayIndex, 1, 3),
      alarmPush: settings.alarmPush !== false,
      alarmSound: settings.alarmSound !== false,
      disconnectWarn: settings.disconnectWarn !== false
    });
  },

  switchAutoRecord(e) {
    this.setData({ autoRecord: e.detail.value });
  },

  changeRecordQuality(e) {
    this.setData({ qualityIndex: normalizeSettingIndex(e.detail.value, 1, 2) });
  },

  changeSaveDay(e) {
    this.setData({ dayIndex: normalizeSettingIndex(e.detail.value, 1, 3) });
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
    this.setData({ showPhoneModal: true, phone: '', phoneError: false, phoneErrorMessage: '' });
  },

  hidePhoneModal() {
    if (this.data.isBindingPhone) return;
    this.setData({ showPhoneModal: false, phone: '', phoneError: false, phoneErrorMessage: '' });
  },

  onPhoneInput(e) {
    const phone = e.detail.value;
    const phoneError = phone.length > 0 && !isValidPhone(phone);
    this.setData({
      phone,
      phoneError,
      phoneErrorMessage: phoneError ? '请输入正确的11位手机号' : ''
    });
  },

  async confirmPhone() {
    const { phone, isBindingPhone } = this.data;
    if (isBindingPhone) return;
    if (!isValidPhone(phone)) {
      this.setData({ phoneError: true, phoneErrorMessage: '请输入正确的11位手机号' });
      return;
    }

    const token = getApp().getLoginToken();
    if (!token) {
      this.setData({ phoneError: true, phoneErrorMessage: '登录状态已失效，请重新登录' });
      return;
    }

    this.setData({ isBindingPhone: true, phoneErrorMessage: '' });
    wx.showLoading({ title: '保存中...' });

    try {
      const res = await http.post('/user/userBindPhone?phone=' + encodeURIComponent(phone), {}, {
        Authorization: `Bearer ${token}`
      }, true);
      if (res.code !== 1) {
        this.setData({ phoneError: true, phoneErrorMessage: res.msg || '手机号保存失败，请重试' });
        return;
      }

      const userInfo = { ...this.data.userInfo, phone };
      setStorage('userInfo', userInfo);
      setStorage('phone', phone);
      this.setData({ userInfo, showPhoneModal: false });
      wx.toast({ title: '手机号绑定成功', icon: 'success' });
    } catch (err) {
      logger.error('设置页确认手机号流程异常', { error: err });
      this.setData({ phoneError: true, phoneErrorMessage: err.msg || '网络异常，请重试' });
    } finally {
      wx.hideLoading();
      this.setData({ isBindingPhone: false });
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
            logger.error('保存设备位置失败', { error: err });
          }

          wx.toast({ title: '位置已选择', icon: 'success' });
        },
        fail: (err) => {
          logger.error('选择设备位置失败', { error: err });
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

    this.navigateTimer = setTimeout(() => {
      wx.navigateBack();
      this.navigateTimer = null;
    }, 800);
  }
});
