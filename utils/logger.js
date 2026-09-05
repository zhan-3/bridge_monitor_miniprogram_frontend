// 统一前端日志：开发期输出到控制台，禁止记录凭证等敏感信息。
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const SENSITIVE_KEYS = /token|authorization|password|secret|phone|number|credential/i

function redactString(value) {
  return value
    // URL 查询参数中的敏感值。
    .replace(/([?&](?:phone|number|token|authorization|password|secret|credential)=)[^&#\s]*/gi, '$1[REDACTED]')
    // Authorization 文本和项目当前使用的凭证格式。
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:mock_user|device_token)_[^\s,;"']+/gi, '[REDACTED]')
    // 中国大陆手机号；防止其出现在普通 message/error 字符串中。
    .replace(/\b1[3-9]\d{9}\b/g, '[REDACTED]')
}

let config = {
  enabled: true,
  minLevel: 'debug'
}

function safeValue(value, key = '') {
  if (SENSITIVE_KEYS.test(key)) return '[REDACTED]'
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack }
  if (typeof value === 'string') return redactString(value)
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.slice(0, 20).map(item => safeValue(item))

  const result = {}
  Object.keys(value).slice(0, 30).forEach(itemKey => {
    result[itemKey] = safeValue(value[itemKey], itemKey)
  })
  return result
}

function write(level, message, context = {}) {
  if (!config.enabled || LEVELS[level] < LEVELS[config.minLevel]) return

  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    context: safeValue(context)
  }

  const output = `[BridgeMonitor][${level}] ${message}`
  const method = level === 'debug' ? 'log' : level
  try {
    console[method](output, entry.context)
  } catch (error) {
    // 日志不能影响业务流程。
  }
}

export const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
  configure(options = {}) {
    config = {
      ...config,
      ...options,
      minLevel: LEVELS[options.minLevel] ? options.minLevel : config.minLevel
    }
  }
}

export default logger
