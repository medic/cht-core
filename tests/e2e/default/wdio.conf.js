const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('./suites');

// Override specific properties from wdio base config
const defaultConfig = Object.assign(wdioBaseConfig.config, {
  suites: {
    all: ['**/*.wdio-spec.js'],
    ...suites
  },
});

exports.config = defaultConfig;
