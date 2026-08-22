// utils/http.js
import { getStorage } from './storage'
import { env } from './env'

const { classifyAuthResponse } = require('./httpPolicy')

function isValidToken(token) {
  if (!token || typeof token !== 'string') return false
  return !/[\u4e00-\u9fa5]/.test(token)
}

function request({ url, method = 'GET', data = {}, header = {}, skipAuthCheck = false }) {
  return new Promise((resolve, reject) => {
    const app = getApp()
    const loginToken = app.getLoginToken()

    if (loginToken && !isValidToken(loginToken)) {
      console.error('检测到无效登录凭证（包含非ASCII字符），清除并重新登录')
      app.clearAuthState()
      wx.modal({
        content: '登录状态异常，请重新登录',
        showCancel: false
      }).then(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      })
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
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      timeout: 15000,
      success(res) {
        const { statusCode, data } = res

        // === HTTP状态码处理 ===
        if (classifyAuthResponse(statusCode, skipAuthCheck).type === 'auth-expired') {
          wx.modal({
            content: '登录已失效，请重新登录',
            showCancel: false
          }).then(() => {
            const app = getApp();
            app.clearAuthState();
            wx.reLaunch({ url: '/pages/login/login' });
          })
          reject({ code: 401, msg: '请提供有效的token' })
          return
        }

        if (classifyAuthResponse(statusCode, skipAuthCheck).type === 'device-required') {
          reject({ code: 403, msg: '请先绑定设备' })
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
        wx.toast({
          title: '网络异常，请重试',
          icon: 'error'
        })
        reject(err)
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
  delete(url, data, header) {
    return request({ url, method: 'DELETE', data, header })
  }
}