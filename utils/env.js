const { miniProgram } = wx.getAccountInfoSync()
const { envVersion } = miniProgram

let env = { baseURL: 'http://localhost:8080' }
switch (envVersion) {
  case 'develop': env.baseURL = 'http://localhost:8080'; break;
  case 'trial':   env.baseURL = 'http://localhost:8080'; break;
  case 'release': env.baseURL = 'http://localhost:8080'; break;
  default:       env.baseURL = 'http://localhost:8080'; break;
}

export { env }
