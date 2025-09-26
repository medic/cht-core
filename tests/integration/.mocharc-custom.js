const baseConfig = require('./.mocharc-base');

module.exports = {
  ...baseConfig,
  spec: require('./specs').replication,
};
