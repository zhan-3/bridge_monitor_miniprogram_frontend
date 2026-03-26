import {getStorage, setStorage} from '../../utils/storage';

Page({
  data: {
    isLogin: false,
    userInfo: {},
    devices: []
  },

  // 把状态映射表定义为页面私有常量（避免data读取延迟问题）
  statusTextMap: {
    normal: '正常',
    alarm: '警报中',
    offline: '设备离线'
  },

  onShow() {
    // const userInfo = getStorage('userInfo');
    // const isLogin = getStorage('isLogin');
    const userInfo = {
      avatarUrl: "https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132",
      city: "",
      country: "",
      gender: 0,
      is_demote: true,
      language: "",
      nickName: "微信用户",
      province: ""
    };
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
    // 临时清空本地缓存的旧数据（仅调试用，后续可删除）
    //wx.removeStorageSync('devices');
    
    // 读取设备数据（优先缓存，无则用默认）
    const devices = wx.getStorageSync('devices') || [
      {
        id: '1',
        name: '智能烟雾报警器 A1',
        status: 'normal',
        contacts: [
          { id: 'c1', name: '张明辉', phone: '13812345678' },
          { id: 'c2', name: '李晓芳', phone: '13923456789' }
        ]
      },
      {
        id: '2',
        name: '智能燃气探测器 G2',
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
        status: 'offline',
        contacts: [
          { id: 'c5', name: '周文杰', phone: '15811112222' }
        ]
      }
    ];

    // 调试：打印原始设备数据，确认status值
    console.log('原始设备数据：', devices);

    const fixedDevices = devices.map(d => {
      // 先确保status有默认值，避免undefined
      const currentStatus = d.status || 'normal';
      return {
        ...d,
        status: currentStatus,
        statusText: this.statusTextMap[currentStatus] || '未知状态',
        latitude: d.latitude || 39.9042,
        longitude: d.longitude || 116.4074,
        address: d.address || '地址未知'
      };
    });

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