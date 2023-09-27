const SUITES = {
  core: [
    './admin/**/*.wdio-spec.js',
    './login/**/*.wdio-spec.js',
    './translations/**/*.wdio-spec.js',
    './more-options-menu/**/*.wdio-spec.js',
    './users/**/*.wdio-spec.js',
    './about/**/*.wdio-spec.js',
    './navigation/**/*.wdio-spec.js',
    './privacy-policy/**/*.wdio-spec.js',
  ],
  workflows: [
    './analytics/**/*.wdio-spec.js',
    './contacts/**/*.wdio-spec.js',
    './reports/**/*.wdio-spec.js',
    './targets/**/*.wdio-spec.js',
    './tasks/**/*.wdio-spec.js',
    './sms/**/*.wdio-spec.js',
  ],
  data: [
    './db/**/*.wdio-spec.js',
    './purge/**/*.wdio-spec.js',
    './telemetry/**/*.wdio-spec.js'
  ],
  lowLevel: [
    './pwa/**/*.wdio-spec.js',
    './service-worker/**/*.wdio-spec.js',
    './transitions/**/*.wdio-spec.js',
    './logging/**/*.wdio-spec.js'
  ],
  enketo: [
    './enketo/**/*.wdio-spec.js',
  ]};

exports.suites = SUITES;

