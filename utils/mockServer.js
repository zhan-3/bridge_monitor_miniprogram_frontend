const MockConfig = { enabled: false, delay: 0, scenario: 'normal' }

const mockDevice = {
  id: 'SA100-2024-A7B3C9D1',
  sn: 'SA100-2024-A7B3C9D1',
  name: '智能烟雾报警器 A1',
  status: 'normal',
  statusText: '正常',
  latitude: 39.9042,
  longitude: 116.4074,
  address: '北京市朝阳区建国路88号'
}

const mockBindStatus = { status: 'normal', bindTime: '2024-03-15 10:30:00' }

const mockLocation = { gpsLat: '39.9042', gpsLng: '116.4074', address: '北京市朝阳区建国路88号' }

const mockContacts = [
  { '名称': '张三', '手机号': '13812345678' },
  { '名称': '李四', '手机号': '13988776655' },
  { '名称': '王五', '手机号': '13755667788' }
]

const mockUserInfo = {
  nickName: '测试用户',
  avatarUrl: 'https://wx.qlogo.cn/mmopen/vi_32/avatar.png',
  phone: ''
}

const mockAudioUrls = [
  'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-04.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-03.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-02.mp3',
  'https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3'
]

const mockUserToken = 'mock_user_token_' + Date.now()
const debugLogs = []

function mockResponse(data, msg = 'success') { return { code: 1, data, msg } }
function errorResponse(msg = 'error') { return { code: 0, msg } }

function logRequest(url, method, data, response, success) {
  const entry = { t: new Date().toISOString().slice(11, 19), method, url, success, data: JSON.stringify(data).slice(0, 50) }
  debugLogs.unshift(entry)
  if (debugLogs.length > 50) debugLogs.pop()
}

function getScenarioData(scenario) {
  switch (scenario) {
    case 'alarm':
      return { status: 'alarm', statusText: '警报中' }
    case 'offline':
      return { status: 'offline', statusText: '设备离线' }
    case 'error':
      return null
    case 'empty':
      return []
    default:
      return null
  }
}

async function handleMockRequest(url, method, data, header) {
  if (MockConfig.delay > 0) await new Promise(r => setTimeout(r, MockConfig.delay))

  const sc = MockConfig.scenario
  let res = { code: 0, msg: 'unmatched' }

  if (url === '/system/log' && method === 'POST') res = mockResponse(mockUserToken)
  else if (url === '/user/getMainMessage' && method === 'GET') res = mockResponse(mockUserInfo)
  else if (url === '/user/getMessage' && method === 'POST') res = mockResponse({ success: true })
  else if (url === '/user/bind/status' && method === 'GET') {
    const sd = getScenarioData(sc === 'bindError' ? 'error' : sc)
    if (sd === null) res = errorResponse('绑定失败')
    else res = data?.deviceSn ? mockResponse({ status: sc === 'alarm' ? 'alarm' : sc === 'offline' ? 'offline' : 'normal' }) : mockResponse([mockDevice.sn])
  } else if (url.includes('/user/userBindPhone') && method === 'POST') {
    res = sc === 'bindError' ? errorResponse('绑定失败') : mockResponse({ success: true })
  } else if (url === '/user/getLocation' && method === 'GET') {
    res = sc === 'error' ? errorResponse('获取位置失败') : mockResponse(mockLocation)
  } else if (url.includes('/user/addPhoneNumber') && method === 'POST') {
    res = sc === 'error' ? errorResponse('添加失败') : mockResponse({ success: true })
  } else if (url.includes('/user/deletePhone') && method === 'DELETE') {
    res = sc === 'error' ? errorResponse('删除失败') : mockResponse({ success: true })
  } else if (url === '/user/userGetPhone' && method === 'GET') {
    res = sc === 'empty' ? mockResponse([]) : mockResponse(mockContacts)
  } else if (url === '/user/getRecord' && method === 'GET') {
    res = sc === 'empty' ? mockResponse([]) : mockResponse(mockAudioUrls)
  } else {
    res = mockResponse({})
  }

  logRequest(url, method, data, res, res.code === 1)
  return res
}

function clearLogs() { debugLogs.length = 0 }
function getLogs() { return debugLogs }
function setScenario(s) { 
  MockConfig.scenario = s
  console.log('=== Mock Debug === scenario:', s, '| logs:', debugLogs.length)
}
function getScenario() { return MockConfig.scenario }

function debugInfo() {
  return { 
    scenario: MockConfig.scenario, 
    delay: MockConfig.delay, 
    enabled: MockConfig.enabled,
    logCount: debugLogs.length,
    recentLogs: debugLogs.slice(0, 5)
  }
}

wx.mockDebug = debugInfo
wx.mockSetScenario = setScenario
wx.mockGetLogs = getLogs

export { MockConfig, mockDevice, mockUserInfo, mockContacts, handleMockRequest, clearLogs, getLogs, setScenario, getScenario, debugInfo }
export default { handleMockRequest, getLogs, setScenario, getScenario, debugInfo }