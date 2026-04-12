import http from '../../utils/http';
import { getStorage, setStorage } from '../../utils/storage';
import { isValidSN } from '../../utils/validators';

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
    snError: false,    // SN码格式错误提示
    isLoading: false,
    deviceSN: '',
    isLogin: false
  },

  onLoad(options) {
    let deviceSN = '';

    if (options.scene) {
      // 从小程序码扫码进入（scene参数）
      deviceSN = decodeURIComponent(options.scene);
    } else if (options.sn) {
      // 从登录页跳转回来（sn参数）
      deviceSN = decodeURIComponent(options.sn);
    }

    if (deviceSN) {
      this.setData({ deviceSN });
      // 在可能跳转登录前先保存SN，防止页面跳转后丢失
      getApp().globalData.pendingSN = deviceSN;
    }

    // 校验用户登录态
    this.checkLoginStatus();

    // 已登录且有SN码时自动触发绑定流程
    if (this.data.isLogin && deviceSN) {
      this.autoBindDevice(deviceSN);
    }
  },

  /**
   * 校验用户登录态（核心：优先读取缓存中的isLogin）
   */
  async checkLoginStatus() {
    const cacheIsLogin = getStorage('isLogin', false);

    if (cacheIsLogin) {
      this.setData({ isLogin: true });
    } else {
      setStorage('isLogin', false);
      this.setData({ isLogin: false });
      await wx.modal({
        content: '请先登录后再绑定设备',
        showCancel: false
      });
      wx.redirectTo({
        url: '/pages/login/login?redirect=bind-device'
      });
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
        sn ? this.bindDevice(sn) : wx.toast({ title: '未识别到设备SN', icon: 'none' });
      },
      fail: () => wx.toast({ title: '扫码已取消', icon: 'none' })
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
  async closeManualBind() {
    const { inputSN } = this.data;
    if (inputSN) {
      const confirmed = await wx.modal({
        content: '你已输入SN码，确定要退出吗？',
        cancelText: '继续编辑',
        confirmText: '确认退出'
      });
      if (confirmed) {
        this.setData({ showManualBind: false, inputSN: '' });
      }
    } else {
      this.setData({ showManualBind: false, inputSN: '' });
    }
  },

  /**
   * 输入SN码（实时格式验证）
   */
  onInputSN(e) {
    const sn = e.detail.value.trim().toUpperCase();
    this.setData({
      inputSN: sn,
      snError: sn.length > 0 && !isValidSN(sn)
    });
  },

  /**
   * 确认手动绑定
   */
  async confirmBind() {
    const { inputSN, snError } = this.data;
    if (!inputSN) {
      wx.toast({ title: '请输入设备SN码' });
      return;
    }
    if (snError || !isValidSN(inputSN)) {
      wx.toast({ title: 'SN码格式错误' });
      return;
    }

    const confirmed = await wx.modal({
      title: '确认绑定',
      content: `你确定要绑定SN码为【${inputSN}】的设备吗？`,
      cancelText: '取消',
      confirmText: '确认绑定'
    });
    if (confirmed) {
      this.bindDevice(inputSN);
      this.setData({ showManualBind: false, inputSN: '' });
    }
  },

  /**
   * 自动绑定（从二维码跳转进入时）
   */
  async autoBindDevice(sn) {
    const confirmed = await wx.modal({
      title: '自动绑定',
      content: `检测到设备SN码：【${sn}】，是否直接绑定？`,
      cancelText: '取消',
      confirmText: '确认绑定'
    });
    if (confirmed) {
      this.bindDevice(sn);
    }
  },

  /**
   * 核心绑定逻辑（统一处理扫码/手动/自动绑定）
   */
  async bindDevice(sn) {
    if (this.data.isLoading || !sn) return;
    this.setData({ isLoading: true });

    try {
      wx.showLoading({ title: '绑定设备中...', mask: true });

      const currentToken = getStorage('token');
      console.log('[bindDevice] 当前初始token:', currentToken);
      console.log('[bindDevice] 请求绑定设备, SN:', sn);

      // 后端使用 @RequestParam，deviceSn 需通过 URL 查询参数传递
      let bindRes = await http.post(`/user/bind/device?deviceSn=${encodeURIComponent(sn)}`, {}, {
        Authorization: `Bearer ${currentToken}`
      }, true);

      console.log('[bindDevice] /user/bind/device 响应:', JSON.stringify(bindRes));

      if (bindRes.code === 1 && bindRes.data === '绑定成功') {
        console.log('[bindDevice] 设备已绑定，尝试获取设备token...');
        bindRes = await http.post(`/user/bind/userDeviceLogin?deviceSn=${encodeURIComponent(sn)}`, {}, {
          Authorization: `Bearer ${currentToken}`
        }, true);
        console.log('[bindDevice] /user/bind/userDeviceLogin 响应:', JSON.stringify(bindRes));
      }

      if (bindRes.code === 1 && bindRes.data && typeof bindRes.data === 'string' && !/[\u4e00-\u9fa5]/.test(bindRes.data)) {
        const app = getApp();
        console.log('[bindDevice] 获取到设备token:', bindRes.data.substring(0, 30) + '...');
        
        app.globalData.deviceTokens = app.globalData.deviceTokens || [];
        const index = app.globalData.deviceTokens.findIndex(d => d.sn === sn);
        if (index >= 0) {
          app.globalData.deviceTokens[index] = { sn, token: bindRes.data, name: sn };
        } else {
          app.globalData.deviceTokens.push({ sn, token: bindRes.data, name: sn });
        }
        setStorage('deviceTokens', app.globalData.deviceTokens);
        app.globalData.currentSn = sn;
        app.globalData.hasDeviceBound = true;
        setStorage('currentSn', sn);
        
        console.log('[bindDevice] 设备token已保存到deviceTokens');
        
        await wx.modal({
          title: '绑定成功',
          content: `设备 "${sn}" 绑定成功`,
          showCancel: false
        });
        wx.switchTab({ url: '/pages/home/home' });
      } else {
        console.error('[bindDevice] 绑定失败:', bindRes);
        wx.toast({ title: bindRes.msg || '绑定失败', icon: 'none' });
      }

    } catch (err) {
      console.error('设备绑定失败：', err);
      const errMsg = err?.msg || err?.message || '绑定失败，请检查网络或设备ID是否正确';
      wx.toast({ title: errMsg, icon: 'none' });
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