const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('./suites');

// Override specific properties from wdio base config
const defaultConfig = Object.assign(wdioBaseConfig.config, {
  suites,
  specs: [
    '**/death-report.wdio-spec.js',
    '**/submit-z-score-form.wdio-spec.js',
    /*'**!/submit-default-delivery-form.wdio-spec.js',
    '**!/pregnancy-danger-sign-follow-up.wdio-spec.js',
    '**!/submit-photo-upload-form.wdio-spec.js',
    '**!/edit-report-with-attachment.wdio-spec.js',*/
  ],
});

exports.config = defaultConfig;
