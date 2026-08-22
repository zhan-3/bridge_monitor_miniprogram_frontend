function createAuthReset({ loginCredential, boundDeviceSet, removeStorage, clearStorage }) {
  return Object.freeze({
    clear() {
      loginCredential.clear();
      boundDeviceSet.clear();
      removeStorage('isLogin');
      removeStorage('userInfo');
      clearStorage();
    }
  });
}

module.exports = { createAuthReset };
