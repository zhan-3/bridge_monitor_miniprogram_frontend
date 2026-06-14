import { getStorage, setStorage } from '../../utils/storage';
import http from '../../utils/http';
import { DEVICE_STATUS_MAP } from '../../utils/constants';

Page({
  data: {
    isLogin: false,
    userInfo: {},
    devices: [],
    currentSn: '',   // 当前激活的设备SN
    hasPhone: false,
    pageLoading: true
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
      this.setData({ isLogin: false, userInfo: {}, pageLoading: false });
      return
    }

    const userInfo = getStorage('userInfo') || {};

    if (!userInfo.phone) {
      this.setData({ isLogin: true, userInfo, pageLoading: false });
      wx.showModal({
        title: '请绑定手机号',
        content: '绑定手机号后才能正常使用报警服务',
        showCancel: false,
        confirmText: '去绑定'
      }).then(() => {
        wx.navigateTo({ url: '/pages/setting/setting' });
      });
      return;
    }

    const app = getApp();
    this.setData({
      isLogin: true,
      hasPhone: true,
      userInfo,
      currentSn: app.globalData.currentSn
    });
    Promise.all([
      this.loadUserInfo(),
      this.loadAllDevices()
    ]).finally(() => {
      this.setData({ pageLoading: false });
    });
    this.startPolling();
  },

  goBindPhone() {
    wx.navigateTo({ url: '/pages/setting/setting' });
  },

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.loadAllDevices(), 15000);
  },

  onHide() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  onUnload() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  async loadUserInfo() {
    try {
      const res = await http.get('/user/getMainMessage');
      if (res.code === 1 && res.data) {
        const cached = getStorage('userInfo') || {};
        const userInfo = {
          nickName: res.data.nickName || cached.nickName || '',
          avatarUrl: res.data.avatarUrl || cached.avatarUrl || '',
          phone: res.data.phone || cached.phone || ''
        };
        setStorage('userInfo', userInfo);
        this.setData({ userInfo });
        return;
      }
    } catch (err) {
      console.error('获取用户信息失败：', err);
    }
    const userInfo = getStorage('userInfo') || {};
    this.setData({ userInfo });
  },

  // 遍历所有已绑定设备的token，构建设备列表（并行请求）
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

      // 并行请求所有设备状态
      const results = await Promise.allSettled(
        deviceTokens.map(dt =>
          http.get('/user/bind/status', { deviceSn: dt.sn }, {
            Authorization: `Bearer ${dt.token}`
          }).then(bindRes => {
            if (bindRes.code === 1 && bindRes.data) {
              const displayName = (dt.name && dt.name !== dt.sn) ? dt.name : dt.sn;
              return {
                id: dt.sn,
                sn: dt.sn,
                name: displayName,
                status: bindRes.data.status || 'normal',
                statusText: DEVICE_STATUS_MAP[bindRes.data.status] || '正常'
              };
            }
            return null;
          }).catch(err => {
            console.error('获取设备状态失败：', dt.sn, err);
            return null;
          })
        )
      );

      const devices = results
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);

      // 仅在数据有变化时才 setData，避免无意义的渲染
      if (JSON.stringify(devices) !== JSON.stringify(this.data.devices)) {
        this.setData({ devices });
      }
    } finally {
      this.isLoadingDevices = false;
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadAllDevices()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  goLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  goSetting() {
    wx.navigateTo({ url: '/pages/setting/setting' });
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