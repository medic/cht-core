const wdioBaseConfig = require('../../wdio.conf');
const { suites } = require('./suites');

// Override specific properties from wdio base config
const defaultConfig = Object.assign(wdioBaseConfig.config, {
  // suites,
  // specs: ['**/old-navigation.wdio-spec.js'],



  // specs: ['../default/**/*.wdio-spec.js']
  specs: ['../default/transitions/create-user-for-contacts.replace-user.wdio-spec.js'],
});

exports.config = defaultConfig;
