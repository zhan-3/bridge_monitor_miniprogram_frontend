// utils/http.js
import { getStorage, clearStorage } from './storage'
import { env } from './env'

function request({ url, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    const token = getStorage('token')

    wx.request({
      url: env.baseURL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header
      },
      timeout: 15000,
      success(res) {
        const { data } = res

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

        if (data.code === 208) {
          wx.showModal({
            content: '登录已失效，请重新登录',
            showCancel: false,
            success() {
              clearStorage()
              wx.reLaunch({
                url: '/pages/login/login'
              })
            }
          })
          reject(data)
          return
        }

        wx.toast({
          title: data.message || '请求失败',
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
  post(url, data, header) {
    return request({ url, method: 'POST', data, header })
  },
  // 新增 delete 方法
  delete(url, data, header) {
    return request({ url, method: 'DELETE', data, header });
  }
}