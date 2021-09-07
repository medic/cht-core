module.exports={
  allowUncaught: true,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly:true,
  spec: [
    'tests/e2e/api/controllers/monitoring.spec.js',
    'tests/e2e/api/routing.js',
    'tests/e2e/api/controllers/_changes.spec.js',
    'tests/e2e/api/controllers/_db-doc.spec.js ',
    'tests/e2e/api/controllers/users.js',
    'tests/e2e/api/controllers/bulk-docs.spec.js',

  ],

  timeout: 135*1000, //'API takes a litle long to start up'
  reporter: 'spec',
  require: [ 'tests/integration/hooks.js' ],
  captureFile: 'tests/results/results.txt',
  exit:true,
};
