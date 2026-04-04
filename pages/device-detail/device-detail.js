import http from '../../utils/http';

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
    console.log('device-detail onLoad:', options);
    console.log('device-detail storage token at start:', getStorage('token'));
    
    if (options.id) {
      const app = getApp();
      console.log('device-detail onLoad options.id:', options.id);
      console.log('device-detail deviceTokens:', JSON.stringify(app.globalData.deviceTokens));
      console.log('device-detail currentSn before:', app.globalData.currentSn);
      
      app.switchDevice(options.id);
      
      console.log('device-detail currentSn after:', app.globalData.currentSn);
      console.log('device-detail storage token after switch:', getStorage('token'));
      
      const currentDeviceToken = app.globalData.deviceTokens.find(d => d.sn === options.id);
      console.log('device-detail currentDeviceToken:', currentDeviceToken);
      const authToken = currentDeviceToken ? currentDeviceToken.token : '';
      console.log('device-detail authToken:', authToken);
      
      this.setData({ 
        currentSn: options.id,
        currentDeviceToken: authToken
      });
    }
    setTimeout(() => {
      this.loadDeviceFromAPI();
    }, 100);
  },

  onShow() {
    if (this.data.device) {
      this.loadDeviceFromAPI();
    }
  },

  // 从后端API加载设备数据（位置+联系人）
  async loadDeviceFromAPI() {
    const app = getApp();
    const currentDeviceToken = this.data.currentDeviceToken || (app.globalData.deviceTokens.find(d => d.sn === app.globalData.currentSn) || {}).token || '';
    const authToken = currentDeviceToken;

    const device = {
      id: '1',
      name: '我的报警器',
      status: 'normal',
      latitude: 39.9042,
      longitude: 116.4074,
      address: '设备位置',
      contacts: []
    };

    // 获取绑定信息
    try {
      const bindRes = await http.get('/user/bind/status', {}, {
        Authorization: `Bearer ${authToken}`
      });
      if (bindRes.code === 1 && bindRes.data && bindRes.data !== '') {
        device.name = bindRes.data.deviceName || '我的报警器';
      }
    } catch (err) {
      console.error('获取绑定状态失败：', err);
    }

    // 获取设备GPS位置
    try {
      const locRes = await http.get('/user/getLocation', {}, {
        Authorization: `Bearer ${authToken}`
      });
      if (locRes.code === 1 && locRes.data) {
        device.latitude = parseFloat(locRes.data.gpsLat) || 39.9042;
        device.longitude = parseFloat(locRes.data.gpsLng) || 116.4074;
      }
    } catch (err) {
      console.error('获取设备位置失败：', err);
    }

    // 获取紧急联系人列表
    try {
      const phoneRes = await http.get('/user/userGetPhone', {}, {
        Authorization: `Bearer ${authToken}`
      });
      if (phoneRes.code === 1 && Array.isArray(phoneRes.data)) {
        device.contacts = phoneRes.data.map((item, index) => ({
          id: 'c' + index,
          name: item.name,
          phone: item.phone
        }));
      }
    } catch (err) {
      console.error('获取联系人失败：', err);
    }

    // 设置地图标记
    const lat = Number(device.latitude);
    const lng = Number(device.longitude);
    const markers = [{
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
    const { tempName } = this.data;
    if (!tempName) {
      wx.showToast({ title: '请输入设备名称', icon: 'none' });
      return;
    }
    this.setData({
      'device.name': tempName,
      showEditNameModal: false,
      tempName: ''
    });
    wx.showToast({ title: '保存成功', icon: 'success' });
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
      wx.showToast({ title: '请输入联系人姓名', icon: 'none' });
      return;
    }
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(tempContactPhone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' });
      return;
    }
    if (device.contacts.some(c => c.phone === tempContactPhone)) {
      wx.showToast({ title: '该手机号已添加', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '添加中...' });
      const authToken = this.data.currentDeviceToken;
      
      const res = await http.post('/user/addPhoneNumber', { number: tempContactPhone, name: tempContactName }, {
        Authorization: `Bearer ${authToken}`
      });

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
        wx.showToast({ title: '添加成功', icon: 'success' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('添加联系人失败：', err);
    }
  },

  deleteContact(e) {
    const contactId = e.currentTarget.dataset.id;
    const contact = this.data.device.contacts.find(c => c.id === contactId);
    if (!contact) return;

    wx.showModal({
      title: '提示',
      content: '确定要删除该联系人吗？',
      success: async (res) => {
        if (res.confirm) {
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
              wx.showToast({ title: '删除成功', icon: 'success' });
            }
          } catch (err) {
            wx.hideLoading();
            console.error('删除联系人失败：', err);
          }
        }
      }
    });
  },

  confirmUnbind() {
    wx.showModal({
      title: '解除绑定',
      content: '确定要解除该设备的绑定吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 后端暂无解绑接口，仅做前端提示
          wx.showToast({ title: '已解除绑定', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    });
  },

  startNavigation() {
    const { device } = this.data;
    const latitude = device.latitude || 39.9042;
    const longitude = device.longitude || 116.4074;

    if (latitude === 0 || longitude === 0 || !latitude || !longitude) {
      return wx.showToast({ title: '坐标异常', icon: 'none' });
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
    wx.navigateTo({
      url: `/pages/setting/setting?id=${this.data.device.id}`
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
