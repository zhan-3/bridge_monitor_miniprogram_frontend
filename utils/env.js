const { miniProgram } = wx.getAccountInfoSync()
const { envVersion } = miniProgram

let env = {
  baseURL: 'http://localhost:8080'
}
switch (envVersion) {
  // 开发版
  case 'develop':
    env.baseURL = 'http://localhost:8080'
    break;
  // 体验版
  case 'trial':
    env.baseURL = 'http://120.46.84.175:8080'
    break;
  // 正式版
  case 'release':
    env.baseURL = 'http://120.46.84.175:8080'
    break;
  default:
    env.baseURL = 'http://120.46.84.175:8080'
    break;
}

export { env }
