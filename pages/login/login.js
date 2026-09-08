// pages/login/login.js
import http from '../../utils/http'
import { getStorage, setStorage } from '../../utils/storage'
import logger from '../../utils/logger'
const { createPhoneVerificationWorkflow } = require('../../utils/phoneVerification')

Page({
  data: {
    step: 1,
    loading: false,
    phone: '',
    verificationCode: '',
    phoneError: false,
    sendingCode: false,
    confirmingPhone: false,
    countdown: 0,
    errMsg: '',
    postLoginUrl: '/pages/alarms/alarms'
  },

  async onLoad(options = {}) {
    this.phoneVerification = createPhoneVerificationWorkflow({
      transport: {
        send: phone => http.post('/user/phone-verification/send', { phone }, {
          credentialScope: 'login'
        }),
        confirm: (phone, code) => http.post('/user/phone-verification/confirm', { phone, code }, {
          credentialScope: 'login'
        })
      },
      storage: { get: getStorage, set: setStorage },
      logger,
      onChange: state => this.setData({
        phone: state.phone,
        verificationCode: state.code,
        phoneError: state.phoneInvalid,
        sendingCode: state.sending,
        confirmingPhone: state.confirming,
        countdown: state.retryAfterSeconds,
        errMsg: state.message
      })
    })


    const app = getApp()
    this.authIntent = {
      target: options.redirect || '',
      pendingDevice: app.globalData.pendingSN || ''
    }
    this.setData({ loading: true, errMsg: '' })
    const outcome = await app.authNavigation.restore(this.authIntent)
    this.renderAuthOutcome(outcome)
  },

  renderAuthOutcome(outcome) {
    if (outcome.type === 'phone-required') {
      this.setData({ step: 2, loading: false, postLoginUrl: outcome.target })
      return
    }
    if (outcome.type === 'retryable-error') {
      this.setData({ loading: false, errMsg: '暂时无法验证登录状态，请重试' })
      return
    }
    this.setData({ loading: false, postLoginUrl: outcome.target || this.data.postLoginUrl })
  },

  onUnload() {
    if (this.phoneVerification) this.phoneVerification.dispose()
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

      const outcome = await getApp().authNavigation.establish(res.data, this.authIntent)
      this.renderAuthOutcome(outcome)
    } catch (err) {
      logger.error('登录失败', { error: err })
      this.setData({ loading: false, errMsg: '网络异常，请重试' })
    }
  },

  onPhoneInput(e) {
    this.phoneVerification.changePhone(e.detail.value)
  },

  onVerificationCodeInput(e) {
    this.phoneVerification.changeCode(e.detail.value)
  },

  sendVerificationCode() {
    return this.phoneVerification.send()
  },

  async confirmPhone() {
    if (this.data.loading) return
    const outcome = await this.phoneVerification.confirm()
    if (outcome.status !== 'verified') return

    this.setData({ loading: true })
    try {
      const app = getApp()
      const authOutcome = await app.authNavigation.establish(app.getLoginToken(), this.authIntent)
      this.renderAuthOutcome(authOutcome)
    } finally {
      this.setData({ loading: false })
    }
  }
})
