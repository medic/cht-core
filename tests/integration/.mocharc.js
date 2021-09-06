module.exports={
  allowUncaught: true,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly:false,
  spec: [
    'tests/e2e/api/controllers/monitoring.spec.js',
  ],

  timeout: 135*1000, //'API takes a litle long to start up'
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit:true,
};
