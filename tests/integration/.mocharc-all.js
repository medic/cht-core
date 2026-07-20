const baseConfig = require('./.mocharc-base');
const specs = require('./specs');

module.exports = {
  ...baseConfig,
  spec: specs.all,
  ignore: specs.allIgnore,
};
