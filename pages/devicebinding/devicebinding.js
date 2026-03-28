import http from '../../utils/http';
// 正确解构导入缓存工具类
import { getStorage, setStorage } from '../../utils/storage';

const deviceTemplates = [
  { name: '烟雾报警器', prefix: 'YW' },
  { name: '燃气报警器', prefix: 'RQ' },
  { name: '漏水报警器', prefix: 'LS' },
  { name: '红外报警器', prefix: 'HW' }
];

Page({
  data: {
    showManualBind: false,
    inputSN: '',
    isLoading: false,
    deviceSN: '',
    isLogin: false // 页面初始登录态
  },

  onLoad(options) {
    // 1. 校验用户登录态（读取缓存中的isLogin）
    this.checkLoginStatus();

    // 2. 解析scene参数（扫码跳转进入时）
    if (options.scene) {
      const deviceSN = decodeURIComponent(options.scene);
      this.setData({ deviceSN });
      // 自动触发绑定流程（登录态校验通过后）
      if (this.data.isLogin && deviceSN) {
        this.autoBindDevice(deviceSN);
      }
    }
  },

  /**
   * 校验用户登录态（核心：优先读取缓存中的isLogin）
   */
  checkLoginStatus() {
    // 修复点1：正确读取缓存中的isLogin（key是字符串'isLogin'，默认值false）
    const cacheIsLogin = getStorage('isLogin', false);
    // // 兜底校验：同时检查userId（避免isLogin为true但无用户ID的异常）
    // const userId = getStorage('userId', '');

    // 登录态有效：isLogin为true 且 userId存在
    if (cacheIsLogin) {
      this.setData({ isLogin: true });
    } else {
      // 未登录：清空缓存中的isLogin（避免脏数据），并跳转登录页
      setStorage('isLogin', false);
      wx.showModal({
        title: '提示',
        content: '请先登录后再绑定设备',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/login/login?redirect=bind-device' // 登录后返回绑定页
          });
        }
      });
      this.setData({ isLogin: false });
    }
  },

  /**
   * 扫码绑定（主动点击扫码按钮）
   */
  scanBindDevice() {
    if (!this.data.isLogin) return; // 未登录不执行
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: (res) => {
        let sn = res.result;
        // 兼容小程序码scene参数格式（scene=XXX）
        if (sn.includes('scene=')) {
          sn = decodeURIComponent(sn.split('=')[1]);
        }
        sn ? this.bindDevice(sn) : wx.showToast({ title: '未识别到设备SN', icon: 'none' });
      },
      fail: () => wx.showToast({ title: '扫码已取消', icon: 'none' })
    });
  },

  /**
   * 打开手动绑定弹窗
   */
  openManualBind() {
    if (!this.data.isLogin) return;
    this.setData({
      showManualBind: true,
      inputSN: ''
    });
  },

  /**
   * 关闭手动绑定弹窗
   */
  closeManualBind() {
    const { inputSN } = this.data;
    if (inputSN) {
      wx.showModal({
        title: '提示',
        content: '你已输入SN码，确定要退出吗？',
        cancelText: '继续编辑',
        confirmText: '确认退出',
        success: (res) => {
          if (res.confirm) {
            this.setData({ showManualBind: false, inputSN: '' });
          }
        }
      });
    } else {
      this.setData({ showManualBind: false, inputSN: '' });
    }
  },

  /**
   * 输入SN码
   */
  onInputSN(e) {
    this.setData({ inputSN: e.detail.value.trim().toUpperCase() });
  },

  /**
   * 确认手动绑定
   */
  confirmBind() {
    const { inputSN } = this.data;
    if (!inputSN) {
      wx.showToast({ title: '请输入设备SN码', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认绑定',
      content: `你确定要绑定SN码为【${inputSN}】的设备吗？`,
      cancelText: '取消',
      confirmText: '确认绑定',
      success: (res) => {
        if (res.confirm) {
          this.bindDevice(inputSN);
          this.setData({ showManualBind: false, inputSN: '' });
        }
      }
    });
  },

  /**
   * 自动绑定（从二维码跳转进入时）
   */
  autoBindDevice(sn) {
    wx.showModal({
      title: '自动绑定',
      content: `检测到设备SN码：【${sn}】，是否直接绑定？`,
      cancelText: '取消',
      confirmText: '确认绑定',
      success: (res) => {
        if (res.confirm) {
          this.bindDevice(sn);
        }
      }
    });
  },

  /**
   * 核心绑定逻辑（统一处理扫码/手动/自动绑定）
   */
  async bindDevice(sn) {
    if (this.data.isLoading || !sn) return;
    this.setData({ isLoading: true });

    try {
      wx.showLoading({ title: '绑定设备中...', mask: true });

      // 调用后端绑定接口：POST /user/bind/device
      const bindRes = await http.post('/user/bind/device', {
        deviceId: sn
      });

      // 接口返回成功：code === 1，data为新token（包含deviceId）
      if (bindRes.code === 1) {
        // 追加到设备token列表（支持多设备）
        if (bindRes.data && typeof bindRes.data === 'string') {
          const app = getApp();
          app.addDeviceToken(sn, bindRes.data);
        }

        wx.showModal({
          title: '绑定成功',
          content: `设备 "${sn}" 绑定成功`,
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/home/home' });
          }
        });
      } else {
        // 接口返回错误（如设备已被其他用户绑定、设备ID无效）
        wx.showToast({ title: bindRes.msg || '绑定失败', icon: 'none' });
      }

    } catch (err) {
      console.error('设备绑定失败：', err);
      const errMsg = err?.msg || err?.message || '绑定失败，请检查网络或设备ID是否正确';
      wx.showToast({ title: errMsg, icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  },

  /**
   * 生成临时设备信息（接口返回空时兜底）
   */
  generateTempDevice(sn) {
    const template = deviceTemplates[Math.floor(Math.random() * deviceTemplates.length)];
    const userInfo = getStorage('userInfo', {});
    const userName = userInfo.nickName || userInfo.userName || '用户';
    const userPhone = userInfo.phone || '';
    
    return {
      id: String(Date.now()),
      name: `${template.name} ${template.prefix}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
      sn,
      latitude: 0,
      longitude: 0,
      address: '请设置安装位置',
      status: 'normal',
      statusText: '正常',
      contacts: userPhone ? [{ id: 'c' + Date.now(), name: userName, phone: userPhone }] : []
    };
  }
});