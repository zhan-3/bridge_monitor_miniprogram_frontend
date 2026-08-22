// app.js
import './utils/extendApi'
import { setStorage, getStorage, removeStorage, clearStorage } from './utils/storage'

const { createBoundDeviceSet } = require('./utils/boundDeviceSet')
const { createLoginCredential } = require('./utils/loginCredential')

function wxStorageAdapter() {
  return {
    get: getStorage,
    set: setStorage,
    remove: removeStorage
  }
}

App({
  globalData: {
    userInfo: null,
    loginToken: '',
    hasBaseLogin: false,
    boundDevices: [],
    selectedDeviceSn: '',
    alarmTemplateId: 'LmNsyQCK_araAosSu9UKOyQKnjNMIB1xLU0qGxqIx4o',
    pendingSN: ''
  },

  onLaunch(options) {
    const storage = wxStorageAdapter()
    this.loginCredential = createLoginCredential(storage)
    this.boundDeviceSet = createBoundDeviceSet(storage)

    const loginToken = this.loginCredential.get()
    if (loginToken && getStorage('isLogin')) {
      this.globalData.loginToken = loginToken
      this.globalData.hasBaseLogin = true
    }
    this.syncBoundDeviceState()

    if (options && options.scene) {
      const sn = decodeURIComponent(options.scene)
      if (sn) this.globalData.pendingSN = sn
    }
  },

  syncBoundDeviceState() {
    const devices = this.boundDeviceSet.list()
    this.globalData.boundDevices = devices
    this.globalData.selectedDeviceSn = this.boundDeviceSet.selectedDeviceSn()
  },

  setLoginToken(loginToken) {
    this.loginCredential.set(loginToken)
    this.globalData.loginToken = loginToken
    this.globalData.hasBaseLogin = true
  },

  getLoginToken() {
    return this.loginCredential ? this.loginCredential.get() : getStorage('loginToken') || getStorage('token')
  },

  listBoundDevices() {
    return this.boundDeviceSet.list()
  },

  bindDevice(sn, deviceAccessToken, name = '') {
    const device = this.boundDeviceSet.bind({ sn, deviceAccessToken, name })
    this.syncBoundDeviceState()
    return device
  },

  selectDevice(sn) {
    const selected = this.boundDeviceSet.select(sn)
    if (selected) this.syncBoundDeviceState()
    return selected
  },

  getDevice(sn) {
    return this.boundDeviceSet.get(sn)
  },

  getDeviceAccessToken(sn = this.globalData.selectedDeviceSn) {
    return this.boundDeviceSet.deviceAccessToken(sn)
  },

  renameDevice(sn, name) {
    const renamed = this.boundDeviceSet.rename(sn, name)
    if (renamed) this.syncBoundDeviceState()
    return renamed
  },

  clearAuthState() {
    if (this.loginCredential) this.loginCredential.clear()
    if (this.boundDeviceSet) this.boundDeviceSet.clear()
    removeStorage('isLogin')
    removeStorage('userInfo')
    clearStorage()
    this.globalData.loginToken = ''
    this.globalData.hasBaseLogin = false
    this.globalData.boundDevices = []
    this.globalData.selectedDeviceSn = ''
    this.globalData.pendingSN = ''
  }
})
