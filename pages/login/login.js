// pages/login/login.js
import http from '../../utils/http'
import { getStorage, setStorage } from '../../utils/storage'
import { isValidPhone } from '../../utils/validators'

Page({
  data: {
    step: 1,
    loading: false,
    phone: '',
    phoneError: false,
    errMsg: ''
  },

  onLoad() {
    // 已有 token 且有手机号，直接进首页
    const token = getStorage('token')
    const isLogin = getStorage('isLogin')
    const userInfo = getStorage('userInfo') || {}
    if (token && isLogin && userInfo.phone) {
      wx.reLaunch({ url: '/pages/home/home' })
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

      const res = await http.post('/system/log', { code: loginRes.code })
      if (res.code !== 1 || !res.data) {
        this.setData({ loading: false, errMsg: res.msg || '登录失败' })
        return
      }

      const token = res.data
      const app = getApp()
      app.setToken(token)
      app.globalData.hasBaseLogin = true
      setStorage('isLogin', true)
      setStorage('loginToken', token)

      // 检查是否已有手机号
      const userInfo = getStorage('userInfo') || {}
      if (userInfo.phone) {
        wx.reLaunch({ url: '/pages/home/home' })
        return
      }

      this.setData({ step: 2, loading: false })
    } catch (err) {
      console.error('[login] 登录失败:', err)
      this.setData({ loading: false, errMsg: '网络异常，请重试' })
    }
  },

  onPhoneInput(e) {
    const phone = e.detail.value
    this.setData({ phone, phoneError: phone.length > 0 && !isValidPhone(phone) })
  },

  async confirmPhone() {
    const { phone, loading } = this.data
    if (loading) return

    if (!isValidPhone(phone)) {
      this.setData({ phoneError: true })
      wx.toast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    const token = getStorage('token')


      if (res.code !== 1) {
        this.setData({ loading: false })
        wx.toast({ title: res.msg || '保存失败', icon: 'none' })
        return
      }

      const userInfo = getStorage('userInfo') || {}
      userInfo.phone = phone
      setStorage('userInfo', userInfo)
      setStorage('phone', phone)

      wx.reLaunch({ url: '/pages/home/home' })
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('[login] confirmPhone 异常:', err)
      this.setData({ loading: false })
      wx.toast({ title: '网络异常，请重试', icon: 'none' })
    }
  }
})
