// app.js

// 全局先挂载封装方法
import './utils/extendApi'
import { setStorage, getStorage, removeStorage, clearStorage } from './utils/storage'

App({
  globalData: {
    userInfo: null,
    token: '',
    hasBaseLogin: false,    // 是否已完成基础登录（获取初始token）
    hasDeviceBound: false,  // 是否已绑定设备（获取完整token）
    alarmTemplateId: 'LmNsyQCK_araAosSu9UKOyQKnjNMIB1xLU0qGxqIx4o',
    deviceTokens: [],       // [{ sn, token, name }] 所有已绑定设备
    currentSn: ''           // 当前激活的设备SN
  },

  setToken(token) {
    this.globalData.token = token
    setStorage('token', token)
  },

  // 添加或更新设备token，并切换为当前设备
  addDeviceToken(sn, token, name = '') {
    const deviceTokens = this.globalData.deviceTokens
    const index = deviceTokens.findIndex(d => d.sn === sn)
    if (index >= 0) {
      deviceTokens[index] = { sn, token, name }
    } else {
      deviceTokens.push({ sn, token, name })
    }
    this.globalData.deviceTokens = deviceTokens
    setStorage('deviceTokens', deviceTokens)
    this.switchDevice(sn)
  },

  // 切换当前激活设备
  switchDevice(sn) {
    const device = this.globalData.deviceTokens.find(d => d.sn === sn)
    if (!device) return
    this.globalData.currentSn = sn
    this.globalData.hasDeviceBound = true
    setStorage('currentSn', sn)
    this.setToken(device.token)
  },

  onLaunch() {
    // 读取本地缓存，恢复登录状态
    const token = getStorage('token')
    const isLogin = getStorage('isLogin')
    const deviceTokens = getStorage('deviceTokens') || []
    const currentSn = getStorage('currentSn') || ''

    if (token && isLogin) {
      this.globalData.token = token
      this.globalData.hasBaseLogin = true
    }

    this.globalData.deviceTokens = deviceTokens
    this.globalData.currentSn = currentSn
    if (deviceTokens.length > 0) {
      this.globalData.hasDeviceBound = true
    }
  },

  onShow() {
    console.log('App onShow')
  },

  onHide() {
    console.log('App onHide')
  }
})