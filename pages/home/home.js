Page({
  data: {
    isLogin: false,
    userInfo: {},
    devices: []
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    const isLogin = wx.getStorageSync('isLogin');
    if (userInfo && Object.keys(userInfo).length > 0 || isLogin) {
      this.setData({
        isLogin: true,
        userInfo: userInfo || { userName: '默认用户名' }
      });
    } else {
      this.setData({
        isLogin: false,
        userInfo: {}
      });
    }
    this.loadDevices();
  },

  loadDevices() {
    const devices = wx.getStorageSync('devices') || [
      {
        id: '1',
        name: '智能烟雾报警器 A1',
        sn: 'SA100-2024-A7B3C9D1',
        status: 'normal',
        contacts: [
          { id: 'c1', name: '张明辉', phone: '13812345678' },
          { id: 'c2', name: '李晓芳', phone: '13923456789' }
        ]
      },
      {
        id: '2',
        name: '智能燃气探测器 G2',
        sn: 'GD200-2024-X8Y2Z6W5',
        status: 'alarm',
        contacts: [
          { id: 'c3', name: '王建国', phone: '13698765432' },
          { id: 'c4', name: '赵丽华', phone: '13567890123' }
        ]
      },
      {
        id: '3',
        name: '智能门磁感应器 M3',
        owner: '周文杰',
        sn: 'MD300-2025-K1L3M5N7',
        status: 'offline',
        statusText: '离线',
        contacts: [
          { id: 'c5', name: '周文杰', phone: '15811112222' }
        ]
      }
    ];
    const fixedDevices = devices.map(d => ({
      ...d,
      status: d.status || 'normal',
      statusText: d.statusText || '正常',
      latitude: d.latitude || 39.9042,
      longitude: d.longitude || 116.4074,
      address: d.address || '地址未知'
    }));
    this.setData({ devices: fixedDevices });
  },

  goLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  goBindDevice() {
    wx.navigateTo({
      url: '/pages/devicebinding/devicebinding'
    });
  },

  goDeviceDetail(e) {
    const deviceId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/device-detail/device-detail?id=${deviceId}`
    });
  }
});
