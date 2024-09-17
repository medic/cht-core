const wdioBaseConfig = require('../../wdio.conf');
const { suites } = require('./suites');

// Override specific properties from wdio base config
const defaultConfig = Object.assign(wdioBaseConfig.config, {
  suites,
  specs: [
    '**/old-navigation.wdio-spec.js',
  ],
  exclude: [
    '../default/analytics/analytics.wdio-spec.js',
    '../default/enketo/death-report.wdio-spec.js',
    '../default/enketo/pregnancy-complete-a-delivery.wdio-spec.js',
    '../default/enketo/training-cards.wdio-spec.js',
    '../default/navigation/navigation.wdio-spec.js',
    '../default/service-worker/service-worker.wdio-spec.js',
    '../default/sms/africas-talking.wdio-spec.js',
    '../default/sms/export.wdio-spec.js',
    '../default/sms/gateway.wdio-spec.js',
    '../default/sms/messages-sender-data.wdio-spec.js',
    '../default/sms/rapidpro.wdio-spec.js',
    '../default/sms/send-message.wdio-spec.js',
    '../default/targets/target-aggregates.wdio-spec.js',
    '../default/tasks/due-dates.wdio-spec.js',
    '../default/tasks/tasks.wdio-spec.js',
    '../default/translations/nepali-dates-and-numbers.wdio-spec.js',
    '../default/translations/new-language.wdio-spec.js',
  ],
});

exports.config = defaultConfig;
