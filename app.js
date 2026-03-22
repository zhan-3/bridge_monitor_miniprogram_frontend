// app.js

// 全局先挂载封装方法
import './utils/extendApi'
import { setStorage, getStorage, removeStorage, clearStorage } from './utils/storage'

App({
  globalData: {
    userInfo: null,
    token: '',
    hasBaseLogin: false,
    alarmTemplateId: 'LmNsyQCK_araAosSu9UKOyQKnjNMIB1xLU0qGxqIx4o',
  },

  setToken(token) {
    this.globalData.token = token
  },

  onLaunch() {
    // 读取本地缓存
    const token = getStorage('token')
    const openid = getStorage('openid')
    const hasAlarmSubscribe = getStorage('hasAlarmSubscribe')
  },

  onShow() {
    console.log('App onShow')
  },

  onHide() {
    console.log('App onHide')
  }
})