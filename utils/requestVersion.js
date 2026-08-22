function createRequestVersion() {
  let current = 0;

  return Object.freeze({
    begin() {
      current += 1;
      return current;
    },
    isCurrent(version) {
      return version === current;
    }
  });
}

module.exports = { createRequestVersion };
