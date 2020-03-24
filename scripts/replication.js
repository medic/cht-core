const PouchDB = require('pouchdb');

require('https').globalAgent.options.rejectUnauthorized = false;

const source = process.argv[2];
const target = process.argv[3];

if (!(source && target)) {
  console.log('Please provide an authenticated source and a target:');
  console.log('  node replicate.js https://admin:pass@localhost/foo https://admin:pass@localhost/bar');
  process.exit(-1);
}

console.log(`Beginning replication
  Source: ${source}
  Target: ${target}
`);

PouchDB.replicate(source, target, {
  retry: true
}).on('change', function (info) {
  console.debug(`Received ${info.docs_read} changes`);
}).on('paused', function (err) {
  console.log('paused', err);
}).on('active', function () {
  console.log('Replication active');
}).on('denied', function (err) {
  console.error('denied', err);
}).on('complete', function (info) {
  console.log(`Replication Complete: wrote ${info.docs_written} docs`);

  process.exit(0);
}).on('error', function (err) {
  console.error('error', err);

  process.exit(-1);
});

