// utils/http.js
import { getStorage, clearStorage, setStorage } from './storage'
import { env } from './env'

function isValidToken(token) {
  if (!token || typeof token !== 'string') return false
  return !/[\u4e00-\u9fa5]/.test(token)
}

function request({ url, method = 'GET', data = {}, header = {}, skipAuthCheck = false }) {
  return new Promise((resolve, reject) => {
    let token = getStorage('token')
    
    if (token && !isValidToken(token)) {
      console.error('检测到无效token（包含非ASCII字符），清除并重新登录')
      clearStorage()
      const app = getApp()
      app.globalData.token = ''
      app.globalData.hasBaseLogin = false
      app.globalData.hasDeviceBound = false
      app.globalData.deviceTokens = []
      app.globalData.currentSn = ''
      wx.modal({
        content: '登录状态异常，请重新登录',
        showCancel: false
      }).then(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      })
      reject({ code: -1, msg: '无效token' })
      return
    }

    const authHeader = header.Authorization || (token ? `Bearer ${token}` : '');

    const fullUrl = env.baseURL + url;
    console.log('http request:', method, fullUrl, 'data:', data, 'header:', header, 'authHeader:', authHeader, 'token from storage:', token, 'skipAuthCheck:', skipAuthCheck);

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
        if (statusCode === 401) {
          wx.modal({
            content: '登录已失效，请重新登录',
            showCancel: false
          }).then(() => {
            clearStorage();
            const app = getApp();
            app.globalData.token = '';
            app.globalData.hasBaseLogin = false;
            app.globalData.hasDeviceBound = false;
            app.globalData.deviceTokens = [];
            app.globalData.currentSn = '';
            app.globalData.pendingSN = '';
            wx.reLaunch({ url: '/pages/login/login' });
          })
          reject({ code: 401, msg: '请提供有效的token' })
          return
        }

        if (statusCode === 403 && !skipAuthCheck) {
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