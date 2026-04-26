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
  // 体验�?
  case 'trial':
    env.baseURL = 'http://localhost:8080'
    break;
  // 正式�?
  case 'release':
    env.baseURL = 'http://localhost:8080'
    break;
  default:
    env.baseURL = 'http://localhost:8080'
    break;
}

export { env }
