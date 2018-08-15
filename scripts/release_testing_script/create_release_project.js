const minimist = require('minimist'),
  issues = require('./issues'),
  projects = require('./projects');


var args = minimist(process.argv.slice(2), {
  string: ['version'],     // --version
  alias: { v: 'version' }
});

if (typeof (args.version) !== 'string') {
  console.log('Version is required but was not provided. Please Specify --version');
  process.exit(1);
}

console.log(args.v);

issues()
  .then(function (ids) {
    projects(args.v, ids);
  });