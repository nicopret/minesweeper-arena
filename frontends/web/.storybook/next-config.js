let runtimeConfig = {};

function setConfig(value = {}) {
  runtimeConfig = typeof value === "object" && value !== null ? value : {};
}

function getConfig() {
  return runtimeConfig;
}

module.exports = getConfig;
module.exports.default = getConfig;
module.exports.setConfig = setConfig;
