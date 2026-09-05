const HOME_URL = '/pages/alarms/alarms';
const POST_LOGIN_PATHS = new Set([
  HOME_URL,
  '/pages/home/home',
  '/pages/devicebinding/devicebinding'
]);

function decodeRedirect(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return '';
  }
}

function isSafeInternalPageUrl(value) {
  return /^\/pages\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+(?:\?[^#]*)?$/.test(value) &&
    !value.includes('..') &&
    !value.includes('://');
}

function resolvePostLoginUrl(redirect, pendingSN) {
  const target = decodeRedirect(redirect);
  const path = target.split('?')[0];
  if (isSafeInternalPageUrl(target) && POST_LOGIN_PATHS.has(path)) return target;
  if (pendingSN) {
    return `/pages/devicebinding/devicebinding?sn=${encodeURIComponent(pendingSN)}`;
  }
  return HOME_URL;
}

module.exports = { HOME_URL, isSafeInternalPageUrl, resolvePostLoginUrl };
