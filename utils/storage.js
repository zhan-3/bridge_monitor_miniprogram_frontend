import logger from './logger'

/**
 * @description 存储数据
 * @param {*} key 本地缓存中指定的key
 * @param {*} data 需要缓存的数据
 */
export const setStorage = (key, data) => {
  try {
    wx.setStorageSync(key, data)
  } catch (error) {
    logger.error('本地存储写入失败', { key, error });
  }
}

/**
 * @description 从本地读取指定key的数据
 * @param {*} key
 * @param {*} defaultValue 默认值
 */
export const getStorage = (key, defaultValue = '') => {
  try {
    const data = wx.getStorageSync(key);
    return data !== '' ? data : defaultValue;
  } catch (error) {
    logger.error('本地存储读取失败', { key, error });
    return defaultValue;
  }
};

/**
 * @description 移除指定key的数据
 * @param {*} key
 */
export const removeStorage = (key) => {
  try {
    wx.removeStorageSync(key)
  } catch (error) {
    logger.error('本地存储移除失败', { key, error });
  }
}

/**
 * @description 从本地清空所有数据
 */
export const clearStorage = () => {
  try {
    wx.clearStorageSync()
  } catch (error) {
    logger.error('本地存储清空失败', { error })
  }
}
