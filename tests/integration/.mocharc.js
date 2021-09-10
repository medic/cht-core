module.exports={
  allowUncaught: true,
  'async-only': false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly:true,
  spec: [
    'tests/integration/**/*.js',
    'tests/e2e/sentinel/**/*.js',
  ],

  timeout: 135*1000, //'API takes a litle long to start up'
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit:true,
};
