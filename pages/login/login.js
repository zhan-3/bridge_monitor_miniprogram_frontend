// pages/login/login.js
import { setStorage, getStorage } from '../../utils/storage'
import http from '../../utils/http'

Page({
  data: {
    step: 1,
  },

  onLoad() {
    this.checkLoginStatus();
  },

  async checkLoginStatus() {
    const token = getStorage('token');
    const isLogin = getStorage('isLogin');

    if (!isLogin || !token) return;

    // 已有token，尝试获取用户信息
    try {
      const userRes = await http.get('/user/getMainMessage');
      if (userRes.code === 1 && userRes.data) {
        const { nickName, avatarUrl, phone } = userRes.data;
        const userInfo = { nickName, avatarUrl, phone };
        setStorage('userInfo', userInfo);

        if (nickName && avatarUrl) {
          // 检查设备绑定状态
          const bindRes = await http.get('/user/bind/status');
          if (bindRes.code === 1 && bindRes.data && bindRes.data !== '') {
            // 已绑定设备，直接进入首页
            this.setData({ step: 4 });
            setTimeout(() => {
              wx.switchTab({ url: '/pages/home/home' });
            }, 500);
          } else {
            // 未绑定设备，进入第3步（引导绑定）
            this.setData({ step: 3 });
          }
        } else {
          // 未填写资料，进入第2步
          this.setData({ step: 2 });
        }
      }
    } catch (err) {
      console.log('获取用户状态失败，需重新登录');
    }
  },

  async doBaseLogin() {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          timeout: 5000,
          success: resolve,
          fail: reject
        });
      });

      if (!loginRes.code) {
        wx.showToast({ title: '获取登录凭证失败', icon: 'error' });
        return;
      }

      wx.showLoading({ title: '登录中...' });
      const res = await http.post('/system/log', {
        code: loginRes.code
      });

      if (res.code !== 1) {
        wx.hideLoading();
        wx.showToast({ title: res.msg || '登录失败', icon: 'error' });
        return;
      }

      if (!res.data || typeof res.data !== 'string') {
        wx.hideLoading();
        wx.showToast({ title: 'Token获取失败', icon: 'error' });
        return;
      }

      // 保存初始token（仅含userId，不含deviceId）
      const app = getApp();
      app.setToken(res.data);
      app.globalData.hasBaseLogin = true;
      setStorage('isLogin', true);

      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.setData({ step: 2 });

    } catch (err) {
      wx.hideLoading();
      console.error('登录失败：', err);
      wx.showToast({ title: '网络异常，请重试', icon: 'error' });
    }
  },

  getUserInfo() {
    const token = getStorage('token');
    if (!token) {
      wx.showToast({ title: '请先完成登录', icon: 'error' });
      return;
    }

    wx.getUserProfile({
      desc: '完善小程序个人资料',
      success: async (res) => {
        if (!res || !res.userInfo) {
          wx.showToast({ title: '获取信息失败', icon: 'error' });
          return;
        }

        const { avatarUrl, nickName } = res.userInfo;
        if (!avatarUrl || !nickName) {
          wx.showToast({ title: '信息不完整', icon: 'error' });
          return;
        }

        try {
          wx.showLoading({ title: '保存中...' });

          // 调用后端接口保存头像和昵称
          await http.post('/user/getMessage', {
            avatarUrl,
            nickName
          });

          const userInfo = getStorage('userInfo') || {};
          userInfo.avatarUrl = avatarUrl;
          userInfo.nickName = nickName;

          setStorage('avatarUrl', avatarUrl);
          setStorage('nickName', nickName);
          setStorage('userInfo', userInfo);

          wx.hideLoading();
          wx.showToast({ title: '授权成功', icon: 'success' });
          this.setData({ step: 3 });
        } catch (err) {
          wx.hideLoading();
          console.error('保存用户信息失败：', err);
          wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        }
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) {
          wx.showToast({ title: '已取消授权', icon: 'none' });
        } else {
          wx.showToast({ title: '授权失败', icon: 'error' });
        }
      }
    });
  },

  // 第3步：引导用户去绑定设备
  goBindDevice() {
    wx.navigateTo({
      url: '/pages/devicebinding/devicebinding'
    });
  },

  // 跳过绑定，直接进入首页（部分功能受限）
  skipBind() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
