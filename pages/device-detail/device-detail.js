const defaultDevices = [
  {
    id: '1',
    name: '智能烟雾报警器 A1',
    latitude: 39.9042,
    longitude: 116.4074,
    address: '北京市朝阳区建国路88号',
    status: 'normal',
    contacts: [
      { id: 'c1', name: '张明辉', phone: '13812345678' },
      { id: 'c2', name: '李晓芳', phone: '13923456789' }
    ]
  },
  {
    id: '2',
    name: '智能燃气探测器 G2',
    latitude: 39.9088,
    longitude: 116.3975,
    address: '北京市东城区王府井大街138号',
    status: 'alarm',
    contacts: [
      { id: 'c3', name: '王建国', phone: '13698765432' },
      { id: 'c4', name: '赵丽华', phone: '13567890123' }
    ]
  },
  {
    id: '3',
    name: '智能门磁感应器 M3',
    latitude: 39.9140,
    longitude: 116.4040,
    address: '北京市西城区西单北大街120号',
    status: 'offline',
    contacts: [
      { id: 'c5', name: '周文杰', phone: '15811112222' }
    ]
  }
];

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
    touchStartX: 0
  },

  onLoad(options) {
    const deviceId = options.id;
    this.loadDevice(deviceId);
  },

  onShow() {
    const { device } = this.data;
    if (device) {
      this.loadDevice(device.id);
    }
  },

  
  loadDevice(deviceId) {
    const devices = wx.getStorageSync('devices') || defaultDevices;
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      const lat = Number(device.latitude) || 39.9042;
      const lng = Number(device.longitude) || 116.4074;
      const deviceName = device.name || '未知设备';
      const alarmType = device.alarmType || device.statusText || '正常';
      
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
            deviceName,
            alarmType,
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
      this.setData({ device, markers: markers });
    } else {
      wx.showToast({ title: '设备不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  saveDevices() {
    const devices = wx.getStorageSync('devices') || defaultDevices;
    const index = devices.findIndex(d => d.id === this.data.device.id);
    if (index >= 0) {
      devices[index] = this.data.device;
    }
    wx.setStorageSync('devices', devices);
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
    this.saveDevices();
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

  saveContact() {
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
    this.saveDevices();
    wx.showToast({ title: '添加成功', icon: 'success' });
  },

  deleteContact(e) {
    const contactId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除该联系人吗？',
      success: (res) => {
        if (res.confirm) {
          const contacts = this.data.device.contacts.filter(c => c.id !== contactId);
          this.setData({ 'device.contacts': contacts });
          this.saveDevices();
          wx.showToast({ title: '删除成功', icon: 'success' });
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
          const deviceId = this.data.device.id;
          const devices = wx.getStorageSync('devices') || defaultDevices;
          const filtered = devices.filter(d => d.id !== deviceId);
          wx.setStorageSync('devices', filtered);
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
