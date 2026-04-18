// 设备状态文本映射（统一维护，避免多处重复定义）
export const DEVICE_STATUS_MAP = {
  normal: '正常',
  alarm: '警报中',
  offline: '设备离线'
};

// 设备SN码前缀与类型映射
export const DEVICE_TYPE_MAP = {
  YW: '烟雾报警器',
  RQ: '燃气报警器',
  LS: '漏水报警器',
  HW: '红外报警器'
};
