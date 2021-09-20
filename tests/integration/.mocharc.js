module.exports={
  allowUncaught: true,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly:true,
  spec: [
    'tests/e2e/api/**/*.js',
    'tests/integration/**/*.js',
    'tests/e2e/sentinel/**/*.js',
    'tests/e2e/transitions/**/*.js',
  ],

  timeout: 135*1000, //'API takes a litle long to start up'
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit:true,
};
