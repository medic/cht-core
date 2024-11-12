const wdioBaseConfig = require('../../wdio.conf');
// const { suites } = require('./suites');

// Override specific properties from wdio base config
const defaultConfig = Object.assign(wdioBaseConfig.config, {
  // suites,
  specs: ['training-materials/training-materials.wdio-spec.js'],
});

exports.config = defaultConfig;
