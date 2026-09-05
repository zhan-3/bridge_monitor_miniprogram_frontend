// utils/http.js
import { getStorage } from './storage'
import { env } from './env'
import logger from './logger'

const { classifyAuthResponse } = require('./httpPolicy')

let authExpiryFlow = null
let requestSequence = 0

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

function request({ url, method = 'GET', data = {}, header = {}, skipAuthCheck = false, withAuth = true, retryCount = 0 }) {
  return new Promise((resolve, reject) => {
    const requestId = ++requestSequence
    const startedAt = Date.now()
    // 日志只记录接口路径，避免查询参数中的手机号等隐私数据泄露。
    const requestPath = String(url).split('?')[0]
    const app = getApp()
    logger.info('请求开始', { requestId, method, url: requestPath })
    const loginToken = withAuth ? app.getLoginToken() : ''

    if (withAuth && loginToken && !isValidToken(loginToken)) {
      logger.error('登录凭证格式无效', { requestId, url: requestPath })
      handleAuthExpired('登录状态异常，请重新登录')
      reject({ code: -1, msg: '无效token', userNotified: true })
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
          logger.warn('登录凭证已失效', { requestId, url: requestPath, statusCode, durationMs: Date.now() - startedAt })
          handleAuthExpired()
          reject({ code: 401, msg: '请提供有效的token', userNotified: true })
          return
        }

        if (authResponse.type === 'device-required') {
          logger.warn('请求缺少设备权限', { requestId, url: requestPath, statusCode, durationMs: Date.now() - startedAt })
          reject({ code: 403, msg: '请先绑定设备' })
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          const message = (data && (data.msg || data.message)) || `服务异常（${statusCode}）`
          wx.toast({ title: message, icon: 'none' })
          logger.error('HTTP 请求失败', { requestId, url: requestPath, statusCode, durationMs: Date.now() - startedAt, message })
          reject({ code: statusCode, msg: message, data, userNotified: true })
          return
        }

        // === 业务码处理 ===
        if (!data || typeof data.code === 'undefined') {
          wx.toast({ title: '返回数据异常', icon: 'error' })
          logger.error('接口返回格式异常', { requestId, url: requestPath, statusCode, durationMs: Date.now() - startedAt })
          reject({ ...res, userNotified: true })
          return
        }

        if (data.code === 1) {
          logger.info('请求成功', { requestId, url: requestPath, statusCode, durationMs: Date.now() - startedAt })
          resolve(data)
          return
        }

        // 业务码 0 表示失败
        wx.toast({
          title: data.msg || data.message || '请求失败',
          icon: 'error'
        })
        logger.warn('业务请求失败', { requestId, url: requestPath, statusCode, durationMs: Date.now() - startedAt, code: data.code, message: data.msg || data.message })
        reject({ ...data, userNotified: true })
      },
      fail(err) {
        // 只重试幂等查询，绝不自动重试 POST/DELETE，避免重复写入。
        if (method === 'GET' && retryCount < 1) {
          logger.warn('GET 请求失败，准备重试', {
            requestId,
            url: requestPath,
            retryCount: retryCount + 1,
            error: err
          })
          setTimeout(() => {
            request({ url, method, data, header, skipAuthCheck, withAuth, retryCount: retryCount + 1 })
              .then(resolve)
              .catch(reject)
          }, 300)
          return
        }

        const isTimeout = err && err.errMsg && err.errMsg.includes('timeout')
        const message = isTimeout ? '请求超时，请重试' : '网络连接失败，请检查网络'
        wx.toast({
          title: message,
          icon: 'none'
        })
        logger.error('网络请求失败', {
          requestId,
          url: requestPath,
          durationMs: Date.now() - startedAt,
          retryCount,
          error: err,
          message
        })
        reject({ ...err, code: -1, msg: message, userNotified: true })
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