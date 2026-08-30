// 封装接口API

// toast方法 不传参或传入对象
//const toast = {options = {}} => {} 

// toast 和 showmodual封装板
// 若传参 结构并设置默认值
/**
 * @description 消息提示框
 * @param { Object } options 参数和wx.showToast一致
 */
const toast = ({ title = "数据加载中...", icon = "none", duration = 1500, mask = true } = {})=> {
  return wx.showToast({
    title,
    icon,
    duration,
    mask
  })
} 

// 传参为对象
const modal = (options = {}) => {
  // Promise 返回用户的操作
  // resolve返回true false
  return new Promise((resolve) => {
    
    // 默认参数
    const defaultOpt = {
      title: '提示',
      content: '确定执行该操作？',
      confirmColor: '#f3514f'
    }
    // Object.asign 合并参数 赋值给空对象， 不影响默认参数
    const opts = Object.assign({}, defaultOpt, options)
    wx.showModal({
      // 将合并后的参数通过展开运算符赋值给 wx.showModal 对象。
      ...opts,
      success({ confirm }) {
        resolve(Boolean(confirm))
      },
      fail() {
        // 系统弹窗调用失败时按取消处理，避免 await 永久挂起。
        resolve(false)
      }
    })
  })
}

// 两种调用方式
// 1.其他.js文件使用需先import导入 
//export { toast }
// 2. 挂载在wx全局对象身上就不用多次导入toast 只需import 此文件
wx.toast = toast
wx.modal = modal