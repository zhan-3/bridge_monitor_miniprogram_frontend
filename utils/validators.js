// 手机号：1开头，第二位3-9，共11位
export const PHONE_REGEX = /^1[3-9]\d{9}$/;

// 设备SN码：大写字母和数字，1-20位
export const SN_REGEX = /^[A-Z0-9]{1,20}$/;

export function isValidPhone(phone) {
  return PHONE_REGEX.test(phone);
}

export function isValidSN(sn) {
  return SN_REGEX.test(sn);
}
