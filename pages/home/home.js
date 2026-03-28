import {getStorage, setStorage} from '../../utils/storage';
import http from '../../utils/http';

Page({
  data: {
    isLogin: false,
    userInfo: {},
    devices: [],
    currentSn: ''   // 当前激活的设备SN
  },

  // 把状态映射表定义为页面私有常量（避免data读取延迟问题）
  statusTextMap: {
    normal: '正常',
    alarm: '警报中',
    offline: '设备离线'
  },

  onShow() {
    const isLogin = getStorage('isLogin');
    const token = getStorage('token');

    if (!isLogin || !token) {
      this.setData({ isLogin: false, userInfo: {} });
      return;
    }

    const app = getApp();
    this.setData({ isLogin: true, currentSn: app.globalData.currentSn });
    this.loadUserInfo();
    this.loadAllDevices();

    // 定时轮询，实时感知报警状态变化
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.loadAllDevices(), 7000);
  },

  onHide() {
    clearInterval(this.pollTimer);
  },

  onUnload() {
    clearInterval(this.pollTimer);
  },

  // 从后端获取用户信息
  async loadUserInfo() {
    try {
      const res = await http.get('/user/getMainMessage');
      if (res.code === 1 && res.data) {
        const { nickName, avatarUrl, phone } = res.data;
        const userInfo = { nickName, avatarUrl, phone };
        setStorage('userInfo', userInfo);
        this.setData({ userInfo });
      }
    } catch (err) {
      console.error('获取用户信息失败：', err);
      const userInfo = getStorage('userInfo') || {};
      this.setData({ userInfo });
    }
  },

  // 遍历所有已绑定设备的token，构建设备列表
  async loadAllDevices() {
    const app = getApp();
    const deviceTokens = app.globalData.deviceTokens;

    if (!deviceTokens || deviceTokens.length === 0) {
      this.setData({ devices: [] });
      return;
    }

    const devices = [];
    for (const dt of deviceTokens) {
      try {
        // 用各自的token请求，避免切换全局token
        const bindRes = await http.get('/user/bind/status', {}, {
          Authorization: `Bearer ${dt.token}`
        });
        if (bindRes.code === 1 && bindRes.data && bindRes.data !== '') {
          const { deviceName, status = 'normal' } = bindRes.data;
          const name = deviceName || dt.sn;
          const statusTextMap = { normal: '正常', alarm: '警报中', offline: '设备离线' };
          dt.name = name;
          devices.push({
            id: dt.sn,
            sn: dt.sn,
            name,
            status,
            statusText: statusTextMap[status] || '正常'
          });
        }
      } catch (err) {
        console.error('获取设备状态失败：', dt.sn, err);
      }
    }

    // 更新本地存储的设备名称
    setStorage('deviceTokens', deviceTokens);
    app.globalData.deviceTokens = deviceTokens;

    this.setData({ devices });
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
    const sn = e.currentTarget.dataset.id;
    // 切换到该设备的token，后续所有请求自动使用对应设备数据
    getApp().switchDevice(sn);
    this.setData({ currentSn: sn });
    wx.navigateTo({
      url: `/pages/device-detail/device-detail?id=${sn}`
    });
  }
});