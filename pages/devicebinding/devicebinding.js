import http from '../../utils/http';

const deviceTemplates = [
  { name: '智能烟雾报警器', model: 'SA100-Pro', prefix: 'SA' },
  { name: '智能燃气探测器', model: 'GD200-WiFi', prefix: 'GD' },
  { name: '智能门磁感应器', model: 'MD300-BLE', prefix: 'MD' },
  { name: '智能水浸传感器', model: 'WL400-Cellular', prefix: 'WL' },
  { name: '智能温湿度传感器', model: 'TH500-Zigbee', prefix: 'TH' }
];

Page({
  data: {
    showManualBind: false,
    inputSN: '',
    isLoading: false
  },

  onLoad(options) {
    if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      const sn = scene.split('=')[1];
      sn && this.bindDevice(sn);
    }
  },

  scanBindDevice() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: (res) => {
        let sn = res.result;
        if (sn.includes('scene=')) sn = decodeURIComponent(sn.split('=')[1]);
        sn ? this.bindDevice(sn) : wx.showToast({ title: '未识别到设备SN', icon: 'none' });
      },
      fail: () => wx.showToast({ title: '扫码已取消', icon: 'none' })
    });
  },

  openManualBind() {
    this.setData({
      showManualBind: true,
      inputSN: ''
    });
  },

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

  onInputSN(e) {
    this.setData({ inputSN: e.detail.value.trim().toUpperCase() });
  },

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

  async bindDevice(sn) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      wx.showLoading({ title: '绑定设备中...', mask: true });

      const bindRes = await http.post('/device/bind', {
        sn,
        userId: wx.getStorageSync('userId'),
        userName: wx.getStorageSync('userInfo')?.nickName || '机主'
      });

      const newDevice = bindRes.data || this.generateTempDevice(sn);
      const devices = wx.getStorageSync('devices') || [];
      devices.push(newDevice);
      wx.setStorageSync('devices', devices);

      wx.showModal({
        title: '绑定成功',
        content: `设备 "${newDevice.name}" 绑定成功，请到详情页设置安装位置`,
        showCancel: false,
        success: () => wx.navigateBack()
      });

    } catch (err) {
      console.error('设备绑定失败：', err);
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  },

  generateTempDevice(sn) {
    const template = deviceTemplates[Math.floor(Math.random() * deviceTemplates.length)];
    const userInfo = wx.getStorageSync('userInfo') || {};
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