// utils/http.js
import { getStorage } from './storage'
import { env } from './env'

const { classifyAuthResponse } = require('./httpPolicy')

let authExpiryFlow = null

function handleAuthExpired(content = '登录已失效，请重新登录') {
  if (!authExpiryFlow) {
    authExpiryFlow = Promise.resolve(wx.modal({
      content,
      showCancel: false
    }))
      .catch(() => undefined)
      .then(() => {
        const app = getApp()
        app.clearAuthState()
        wx.reLaunch({ url: '/pages/login/login' })
      })
      .finally(() => {
        authExpiryFlow = null
      })
  }
  return authExpiryFlow
}

function isValidToken(token) {
  if (!token || typeof token !== 'string') return false
  return !/[\u4e00-\u9fa5]/.test(token)
}

function request({ url, method = 'GET', data = {}, header = {}, skipAuthCheck = false, withAuth = true }) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const loginToken = withAuth ? app.getLoginToken() : ''

    if (withAuth && loginToken && !isValidToken(loginToken)) {
      console.error('检测到无效登录凭证（包含非ASCII字符），清除并重新登录')
      handleAuthExpired('登录状态异常，请重新登录')
      reject({ code: -1, msg: '无效token' })
      return
    }

    const authHeader = header.Authorization || (loginToken ? `Bearer ${loginToken}` : '');

    const fullUrl = env.baseURL + url;

    wx.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      timeout: 15000,
      success(res) {
        const { statusCode, data } = res

        // === HTTP状态码处理 ===
        const authResponse = classifyAuthResponse(statusCode, skipAuthCheck)
        if (authResponse.type === 'auth-expired' && withAuth) {
          handleAuthExpired()
          reject({ code: 401, msg: '请提供有效的token' })
          return
        }

        if (authResponse.type === 'device-required') {
          reject({ code: 403, msg: '请先绑定设备' })
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          const message = (data && (data.msg || data.message)) || `服务异常（${statusCode}）`
          wx.toast({ title: message, icon: 'none' })
          reject({ code: statusCode, msg: message, data })
          return
        }

        // === 业务码处理 ===
        if (!data || typeof data.code === 'undefined') {
          wx.toast({ title: '返回数据异常', icon: 'error' })
          reject(res)
          return
        }

        if (data.code === 1) {
          resolve(data)
          return
        }

        // 业务码 0 表示失败
        wx.toast({
          title: data.msg || data.message || '请求失败',
          icon: 'error'
        })
        reject(data)
      },
      fail(err) {
        const isTimeout = err && err.errMsg && err.errMsg.includes('timeout')
        const message = isTimeout ? '请求超时，请重试' : '网络连接失败，请检查网络'
        wx.toast({
          title: message,
          icon: 'none'
        })
        reject({ ...err, code: -1, msg: message })
      }
    })
  })
}

// === 保持你原来的调用方式 ===
export default {
  get(url, data, header) {
    return request({ url, method: 'GET', data, header })
  },
  post(url, data, header, skipAuthCheck = false) {
    return request({ url, method: 'POST', data, header, skipAuthCheck })
  },
  publicPost(url, data, header) {
    return request({ url, method: 'POST', data, header, withAuth: false })
  },
  delete(url, data, header) {
    return request({ url, method: 'DELETE', data, header })
  }
}