function createWxStorageAdapter(wxApi) {
  return Object.freeze({
    get(key, fallback = '') {
      const value = wxApi.getStorageSync(key);
      return value === '' || typeof value === 'undefined' ? fallback : value;
    },
    set(key, value) {
      wxApi.setStorageSync(key, value);
    },
    remove(key) {
      wxApi.removeStorageSync(key);
    }
  });
}

function createWxNavigationAdapter(wxApi, getPages) {
  return Object.freeze({
    reLaunch(url) {
      const pages = typeof getPages === 'function' ? getPages() : [];
      const current = pages && pages.length ? `/${pages[pages.length - 1].route}` : '';
      if (current && current === String(url).split('?')[0]) return;
      wxApi.reLaunch({ url });
    }
  });
}

module.exports = { createWxStorageAdapter, createWxNavigationAdapter };
