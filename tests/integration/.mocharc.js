module.exports={
  'allow-uncaught': false,
  'async-only': false,
  color: true,
  spec: [
    'tests/integration/**/*.js',
  ],

  timeout: 135*1000, //'API takes a litle long to start up'
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt'
};
