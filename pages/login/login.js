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

  checkLoginStatus() {
    const userInfo = getStorage('userInfo');
    const isLogin = getStorage('isLogin');
    
    if (userInfo && userInfo.phone) {
      this.setData({ step: 4 });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/home/home' });
      }, 500);
    } else if (isLogin && userInfo && userInfo.nickName) {
      this.setData({ step: 3 });
    } else if (isLogin) {
      this.setData({ step: 2 });
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

      setStorage('token', res.data);
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
      success: (res) => {
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
          const userInfo = getStorage('userInfo') || {};
          userInfo.avatarUrl = avatarUrl;
          userInfo.nickName = nickName;
          
          setStorage('avatarUrl', avatarUrl);
          setStorage('nickName', nickName);
          setStorage('userInfo', userInfo);

          wx.showToast({ title: '授权成功', icon: 'success' });
          this.setData({ step: 3 });
        } catch (err) {
          console.error('存储失败：', err);
          wx.showToast({ title: '授权成功，存储失败', icon: 'none' });
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

  async onGetPhoneNumber(e) {
    const token = getStorage('token');
    if (!token) {
      wx.showToast({ title: '请先完成登录', icon: 'error' });
      return;
    }

    if (e.detail.errMsg === 'getPhoneNumber:fail user deny') {
      wx.showToast({ title: '已取消授权', icon: 'none' });
      return;
    }

    if (!e.detail.code) {
      wx.showToast({ title: '获取手机号失败', icon: 'error' });
      return;
    }

    try {
      wx.showLoading({ title: '验证中...' });
      
      const res = await http.post('/system/verifyPhone', { 
        code: e.detail.code
      });

      if (res.code === 1 && res.data && res.data.phoneNumber) {
        const phoneNumber = res.data.phoneNumber;
        
        let userInfo = getStorage('userInfo') || {};
        userInfo.phone = phoneNumber;
        setStorage('phone', phoneNumber);
        setStorage('userInfo', userInfo);

        wx.hideLoading();
        wx.showToast({ title: '验证成功', icon: 'success' });
        
        setTimeout(() => {
          this.setData({ step: 4 });
          wx.switchTab({ url: '/pages/home/home' });
        }, 1500);
      } else {
        wx.hideLoading();
        wx.showToast({ title: res.msg || '验证失败', icon: 'error' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('验证失败：', err);
      wx.showToast({ title: '验证失败，请重试', icon: 'error' });
    }
  }
});
