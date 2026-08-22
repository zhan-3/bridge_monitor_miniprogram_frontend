const LOGIN_TOKEN_KEY = 'loginToken';
const LEGACY_TOKEN_KEY = 'token';

function createLoginCredential(storage) {
  function get() {
    return storage.get(LOGIN_TOKEN_KEY, '') || storage.get(LEGACY_TOKEN_KEY, '');
  }

  function set(loginToken) {
    if (!loginToken) throw new Error('登录凭证不能为空');
    storage.set(LOGIN_TOKEN_KEY, loginToken);
  }

  function clear() {
    storage.remove(LOGIN_TOKEN_KEY);
    storage.remove(LEGACY_TOKEN_KEY);
  }

  return Object.freeze({ get, set, clear });
}

module.exports = { createLoginCredential };
