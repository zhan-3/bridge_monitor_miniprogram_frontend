// pages/login/login.js
import http from '../../utils/http'
import { getStorage, setStorage } from '../../utils/storage'
import { isValidPhone } from '../../utils/validators'
import logger from '../../utils/logger'
const { resolvePostLoginUrl } = require('../../utils/navigation')
const { normalizeVerificationCode, isValidVerificationCode } = require('../../utils/phoneVerification')

Page({
  data: {
    step: 1,
    loading: false,
    phone: '',
    verificationCode: '',
    phoneError: false,
    sendingCode: false,
    countdown: 0,
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
    if (token && isLogin) {
      this.restoreCachedSession(userInfo)
    }
  },

  async restoreCachedSession(cachedUserInfo) {
    this.setData({ loading: true, errMsg: '' })
    try {
      const profileRes = await http.get('/user/getMainMessage')
      const profile = profileRes.data || {}
      const userInfo = {
        nickName: profile.nickName || cachedUserInfo.nickName || '',
        avatarUrl: profile.avatarUrl || cachedUserInfo.avatarUrl || '',
        phone: profile.phone || ''
      }
      setStorage('userInfo', userInfo)
      if (userInfo.phone) {
        setStorage('phone', userInfo.phone)
        await this.restoreBoundDevices()
        this.finishLogin()
      } else {
        this.setData({ step: 2, loading: false })
      }
    } catch (error) {
      logger.error('恢复登录状态失败', { error })
      if (!error.userNotified) {
        this.setData({ loading: false, errMsg: '暂时无法验证登录状态，请重试' })
      }
    }
  },

  finishLogin() {
    const url = this.data.postLoginUrl || '/pages/alarms/alarms'
    wx.reLaunch({ url })
  },

  onUnload() {
    if (this.countdownTimer) clearInterval(this.countdownTimer)
  },

  async restoreBoundDevices() {
    try {
      const statusRes = await http.get('/user/bind/status')
      const deviceIds = Array.isArray(statusRes.data) ? statusRes.data : []
      const app = getApp()
      await Promise.allSettled(deviceIds.map(async deviceId => {
        const tokenRes = await http.post('/user/bind/userDeviceLogin', { deviceId })
        if (tokenRes.data) app.bindDevice(deviceId, tokenRes.data, deviceId)
      }))
    } catch (err) {
      logger.error('恢复设备访问凭证失败', { error: err })
    }
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

      // 从后端恢复账号资料；手机号已经验证过时无需再次验证。
      const profileRes = await http.get('/user/getMainMessage')
      const userInfo = profileRes.data || {}
      setStorage('userInfo', userInfo)
      if (userInfo.phone) {
        setStorage('phone', userInfo.phone)
        await this.restoreBoundDevices()
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

  onVerificationCodeInput(e) {
    this.setData({ verificationCode: normalizeVerificationCode(e.detail.value), errMsg: '' })
  },

  async sendVerificationCode() {
    const { phone, phoneError, sendingCode, countdown } = this.data
    if (sendingCode || countdown > 0) return
    if (!isValidPhone(phone) || phoneError) {
      this.setData({ phoneError: true })
      wx.toast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ sendingCode: true, errMsg: '' })
    try {
      await http.post('/user/phone-verification/send', { phone })
      this.setData({ countdown: 60 })
      this.countdownTimer = setInterval(() => {
        const next = this.data.countdown - 1
        this.setData({ countdown: Math.max(next, 0) })
        if (next <= 0) {
          clearInterval(this.countdownTimer)
          this.countdownTimer = null
        }
      }, 1000)
    } catch (err) {
      logger.error('发送手机验证码失败', { error: err })
      if (!err.userNotified) this.setData({ errMsg: err.msg || '验证码发送失败，请重试' })
    } finally {
      this.setData({ sendingCode: false })
    }
  },

  async confirmPhone() {
    const { phone, verificationCode, loading } = this.data
    if (loading) return
    if (!isValidPhone(phone)) {
      this.setData({ phoneError: true })
      wx.toast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!isValidVerificationCode(verificationCode)) {
      this.setData({ errMsg: '请输入6位验证码' })
      return
    }

    this.setData({ loading: true, errMsg: '' })
    try {
      await http.post('/user/phone-verification/confirm', { phone, code: verificationCode })
      const userInfo = getStorage('userInfo') || {}
      userInfo.phone = phone
      setStorage('userInfo', userInfo)
      setStorage('phone', phone)
      await this.restoreBoundDevices()
      this.finishLogin()
    } catch (err) {
      logger.error('验证手机号失败', { error: err })
      if (!err.userNotified) this.setData({ errMsg: err.msg || '验证失败，请重试' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
