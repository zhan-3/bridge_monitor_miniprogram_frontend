// pages/login/login.js
import http from '../../utils/http'
import { getStorage, setStorage } from '../../utils/storage'
import { isValidPhone } from '../../utils/validators'
import logger from '../../utils/logger'
const { resolvePostLoginUrl } = require('../../utils/navigation')

Page({
  data: {
    step: 1,
    loading: false,
    phone: '',
    phoneError: false,
    errMsg: '',
    postLoginUrl: '/pages/home/home'
  },

  onLoad(options = {}) {
    const app = getApp()
    const postLoginUrl = resolvePostLoginUrl(options.redirect, app.globalData.pendingSN)
    this.setData({ postLoginUrl })

    // 已有登录凭证且有手机号，直接进入原目标页面。
    const token = app.getLoginToken()
    const isLogin = getStorage('isLogin')
    const userInfo = getStorage('userInfo') || {}
    if (token && isLogin && userInfo.phone) {
      this.finishLogin()
    }
  },

  finishLogin() {
    const url = this.data.postLoginUrl || '/pages/home/home'
    wx.reLaunch({ url })
  },

  async doLogin() {
    if (this.data.loading) return
    this.setData({ loading: true, errMsg: '' })

    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ timeout: 5000, success: resolve, fail: reject })
      })
      if (!loginRes.code) {
        this.setData({ loading: false, errMsg: '获取登录凭证失败' })
        return
      }

      const res = await http.publicPost('/system/log', { code: loginRes.code })
      if (res.code !== 1 || !res.data) {
        this.setData({ loading: false, errMsg: res.msg || '登录失败' })
        return
      }

      const token = res.data
      const app = getApp()
      app.setLoginToken(token)
      setStorage('isLogin', true)

      // 检查是否已有手机号
      const userInfo = getStorage('userInfo') || {}
      if (userInfo.phone) {
        this.finishLogin()
        return
      }

      this.setData({ step: 2, loading: false })
    } catch (err) {
      logger.error('登录失败', { error: err })
      this.setData({ loading: false, errMsg: '网络异常，请重试' })
    }
  },

  onPhoneInput(e) {
    const phone = e.detail.value
    this.setData({
      phone,
      phoneError: phone.length > 0 && !isValidPhone(phone),
      errMsg: ''
    })
  },

  async confirmPhone() {
    const { phone, loading } = this.data
    if (loading) return

    if (!isValidPhone(phone)) {
      this.setData({ phoneError: true })
      wx.toast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ loading: true, errMsg: '' })

    const token = getApp().getLoginToken()
    if (!token) {
      this.setData({ loading: false, errMsg: '登录状态已失效，请重新登录' })
      return
    }

    try {
      const res = await http.post('/user/userBindPhone?phone=' + encodeURIComponent(phone), {}, {
        Authorization: `Bearer ${token}`
      }, true)

      if (res.code !== 1) {
        this.setData({ errMsg: res.msg || '手机号保存失败，请重试' })
        return
      }

      const userInfo = getStorage('userInfo') || {}
      userInfo.phone = phone
      setStorage('userInfo', userInfo)
      setStorage('phone', phone)

      this.finishLogin()
    } catch (err) {
      logger.error('确认手机号流程异常', { error: err })
      this.setData({ errMsg: err.msg || '网络异常，请重试' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
