import http from '../../utils/http';
import { getStorage } from '../../utils/storage';
import { loadDeviceData, loadDeviceContacts, buildMarkers } from '../../utils/deviceService';
import { DEVICE_STATUS_MAP } from '../../utils/constants';

Page({
  data: {
    device: null,
    markers: [],
    showEditNameModal: false,
    showAddContactModal: false,
    tempName: '',
    tempContactName: '',
    tempContactPhone: '',
    swipeId: null,
    swipeOffset: 0,
    touchStartX: 0,
    currentSn: '',
    currentDeviceToken: ''
  },

  onLoad(options) {
    if (options.id) {
      const app = getApp();
      const deviceEntry = (app.globalData.deviceTokens || []).find(d => d.sn === options.id);
      if (deviceEntry) {
        app.switchDevice(options.id);
      }
      const authToken = deviceEntry ? deviceEntry.token : '';
      console.log('[device-detail] onLoad - deviceEntry:', deviceEntry);
      console.log('[device-detail] onLoad - authToken:', authToken ? authToken.substring(0, 30) + '...' : 'empty');
      this.setData({
        currentSn: options.id,
        currentDeviceToken: authToken
      });
    }
    this.loadDeviceFromAPI();
  },

  onShow() {
    // 从子页面返回时刷新数据（如设置页修改了设备名）
    if (this.data.device) {
      this.loadDeviceFromAPI();
    }
  },

  // 从后端API加载设备数据（使用 deviceService 统一逻辑）
  async loadDeviceFromAPI() {
    const authToken = this.data.currentDeviceToken;
    const currentSn = this.data.currentSn;

    const device = await loadDeviceData(currentSn, authToken);
    device.contacts = await loadDeviceContacts(authToken, currentSn);
    const markers = buildMarkers(device);

    this.setData({ device, markers });
  },

  editName() {
    this.setData({
      showEditNameModal: true,
      tempName: this.data.device.name
    });
  },

  closeEditNameModal() {
    this.setData({ showEditNameModal: false, tempName: '' });
  },

  onNameInput(e) {
    this.setData({ tempName: e.detail.value.trim() });
  },

  saveName() {
    const { tempName, currentSn } = this.data;
    if (!tempName || !tempName.trim()) {
      wx.toast({ title: '请输入设备名称', icon: 'none' });
      return;
    }
    const newName = tempName.trim();
    this.setData({
      'device.name': newName,
      showEditNameModal: false,
      tempName: ''
    });
    // 同步到 globalData.deviceTokens 和本地存储
    const app = getApp();
    const deviceTokens = app.globalData.deviceTokens || [];
    const idx = deviceTokens.findIndex(d => d.sn === currentSn);
    if (idx >= 0) {
      deviceTokens[idx].name = newName;
      app.globalData.deviceTokens = deviceTokens;
      wx.setStorageSync('deviceTokens', deviceTokens);
    }
    wx.toast({ title: '保存成功', icon: 'success' });
  },

  showAddContact() {
    this.setData({
      showAddContactModal: true,
      tempContactName: '',
      tempContactPhone: ''
    });
  },

  closeAddContactModal() {
    this.setData({ showAddContactModal: false, tempContactName: '', tempContactPhone: '' });
  },

  onContactNameInput(e) {
    this.setData({ tempContactName: e.detail.value.trim() });
  },

  onContactPhoneInput(e) {
    this.setData({ tempContactPhone: e.detail.value.trim() });
  },

  async saveContact() {
    const { tempContactName, tempContactPhone, device } = this.data;
    if (!tempContactName) {
      wx.toast({ title: '请输入联系人姓名', icon: 'none' });
      return;
    }
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(tempContactPhone)) {
      wx.toast({ title: '请输入正确的11位手机号', icon: 'none' });
      return;
    }
    if (device.contacts.some(c => c.phone === tempContactPhone)) {
      wx.toast({ title: '该手机号已添加', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '添加中...' });
      const authToken = this.data.currentDeviceToken;
      
      const res = await http.post(
        `/user/addPhoneNumber?number=${encodeURIComponent(tempContactPhone)}&name=${encodeURIComponent(tempContactName)}`,
        {},
        { Authorization: `Bearer ${authToken}` }
      );

      wx.hideLoading();
      if (res.code === 1) {
        const newContact = {
          id: 'c' + Date.now(),
          name: tempContactName,
          phone: tempContactPhone
        };
        this.setData({
          'device.contacts': [...device.contacts, newContact],
          showAddContactModal: false,
          tempContactName: '',
          tempContactPhone: ''
        });
        wx.toast({ title: '添加成功', icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('添加联系人失败：', err);
    }
  },

  async deleteContact(e) {
    const contactId = e.currentTarget.dataset.id;
    const contact = this.data.device.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const confirmed = await wx.modal({ content: '确定要删除该联系人吗？' });
    if (!confirmed) return;

    try {
      wx.showLoading({ title: '删除中...' });
      const authToken = this.data.currentDeviceToken;

      const delRes = await http.delete(`/user/deletePhone?number=${encodeURIComponent(contact.phone)}`, {}, {
        Authorization: `Bearer ${authToken}`
      });

      wx.hideLoading();
      if (delRes.code === 1) {
        const contacts = this.data.device.contacts.filter(c => c.id !== contactId);
        this.setData({ 'device.contacts': contacts });
        wx.toast({ title: '删除成功', icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('删除联系人失败：', err);
    }
  },

  async confirmUnbind() {
    const confirmed = await wx.modal({
      title: '解除绑定',
      content: '确定要解除该设备的绑定吗？'
    });
    if (confirmed) {
      // TODO: 后端暂无解绑接口，仅做前端提示
      wx.toast({ title: '已解除绑定', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  startNavigation() {
    const { device } = this.data;
    const latitude = device.latitude || 39.9042;
    const longitude = device.longitude || 116.4074;

    if (latitude === 0 || longitude === 0 || !latitude || !longitude) {
      return wx.toast({ title: '坐标异常', icon: 'none' });
    }

    wx.openLocation({
      latitude: Number(latitude),
      longitude: Number(longitude),
      name: device.name || '设备位置',
      address: device.address || '未知地址',
      scale: 16
    });
  },

  goAudioPage() {
    wx.navigateTo({
      url: '/pages/audio/audio'
    });
  },

  goSetting() {
    const deviceId = this.data.device && this.data.device.id;
    if (!deviceId) {
      wx.toast({ title: '设备信息加载中', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/setting/setting?id=${encodeURIComponent(deviceId)}`
    });
  },

  touchStart(e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      swipeId: e.currentTarget.dataset.id,
      swipeOffset: 0
    });
  },

  touchMove(e) {
    const moveX = e.touches[0].clientX;
    const diff = this.data.touchStartX - moveX;
    if (diff > 0 && diff < 80) {
      this.setData({ swipeOffset: -diff });
    }
  },

  touchEnd(e) {
    const diff = this.data.touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) {
      this.setData({ swipeOffset: -60 });
    } else {
      this.setData({ swipeOffset: 0, swipeId: null });
    }
  }
});
