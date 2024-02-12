const wdioBaseConfig = require('../wdio.conf');

// Override specific properties from wdio base config
const defaultConfig = Object.assign(wdioBaseConfig.config, {
  specs: [],
});

exports.config = defaultConfig;
