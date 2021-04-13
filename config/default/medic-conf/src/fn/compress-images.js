const compressPng = require('../lib/compress-png').execute;
const compressSvg = require('../lib/compress-svg').execute;

module.exports = {
  requiresInstance: false,
  execute: () => Promise.all(compressPng, compressSvg)
};
