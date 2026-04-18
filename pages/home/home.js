import { getStorage, setStorage } from '../../utils/storage';
import http from '../../utils/http';
import { DEVICE_STATUS_MAP } from '../../utils/constants';

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

  onLoad() {
    // 用户信息只需加载一次，放在 onLoad 避免每次切换页面重复请求
    const isLogin = getStorage('isLogin');
    const token = getStorage('token');
    if (isLogin && token) {
      this.loadUserInfo();
    }
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
    this.loadAllDevices();

    // 定时轮询，实时感知报警状态变化
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.loadAllDevices(), 7000);
  },

  onHide() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  onUnload() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
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
    if (this.isLoadingDevices) return;
    this.isLoadingDevices = true;
    try {
      const app = getApp();
      const deviceTokens = app.globalData.deviceTokens;

      if (!deviceTokens || deviceTokens.length === 0) {
        this.setData({ devices: [] });
        return;
      }

      const devices = [];
      for (const dt of deviceTokens) {
        try {
          const bindRes = await http.get('/user/bind/status', { deviceSn: dt.sn }, {
            Authorization: `Bearer ${dt.token}`
          });
          console.log('[home] /user/bind/status response for', dt.sn, ':', JSON.stringify(bindRes));
          if (bindRes.code === 1 && bindRes.data) {
            // bind/status 返回的是 SN 数组，不是自定义名称
            // 优先使用本地 deviceTokens 中保存的自定义名称，没有才用 SN
            const displayName = (dt.name && dt.name !== dt.sn) ? dt.name : dt.sn;
            devices.push({
              id: dt.sn,
              sn: dt.sn,
              name: displayName,
              status: 'normal',
              statusText: '正常'
            });
          }
        } catch (err) {
          console.error('获取设备状态失败：', dt.sn, err);
        }
      }

      // 仅在数据有变化时才 setData，避免无意义的渲染
      if (JSON.stringify(devices) !== JSON.stringify(this.data.devices)) {
        this.setData({ devices });
      }
    } finally {
      this.isLoadingDevices = false;
    }
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