/**
 * @description 存储数据
 * @param {*} key 本地缓存中指定的key
 * @param {*} data 需要缓存的数据
 */
export const setStorage = (key, data) => {
  try {
    wx.setStorageSync(key, data)
  } catch (error) {
    console.error(`存储指定 ${key} 数据发生了异常`, error);
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
    console.error(`读取指定 ${key} 数据发生了异常`, error);
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
    console.error(`移除指定 ${key} 数据发生了异常`, error);
  }
}

/**
 * @description 从本地清空所有数据
 */
export const clearStorage = () => {
  try {
    wx.clearStorageSync()
  } catch (error) {
    console.error('清空数据发生异常', error)
  }
}
