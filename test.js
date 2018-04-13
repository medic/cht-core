const PouchDB = require('pouchdb');

const LOG_CHANGES = false;
let previous = Date.now();

const args = process.argv.slice(2);

const DB_NAME = 'medic'; // 'medic-user-admin-meta';

let serverUrl;
if(args.includes('--local-couch')) {
  serverUrl = 'http://admin:pass@localhost:5984';
} else if(args.includes('--local-api')) {
  serverUrl = 'http://admin:pass@localhost:5988';
} else if(args.includes('--remote')) {
  const serverPass = args[args.indexOf('--remote') + 1];
  serverUrl = 'https://admin:${serverPass}@beta.dev.medicmobile.org';
} else exit('Please specify server: --local-api, --local-couch or --remote');
log('server:', serverUrl);

let timeout;
if(args.includes('--timeout-false')) {
  timeout = false;
} else if(args.includes('--timeout-big')) {
  timeout = 134217728; // Erlang's max integer on 32 bit arch (#4199)
} else exit('Please specify timeout: --timeout-false or --timeout-big');
log('timeout:', timeout);

var options = {
  live: true,
  retry: true,
  timeout,
  heartbeat: 10000,
  back_off_function: backOffFunction
};

log('Starting...');

const db = new PouchDB(`local-test-${Math.random()}`);

db.replicate
  .from(`${serverUrl}/${DB_NAME}`, options)
    .on('change', () => LOG_CHANGES && log('change'))
    .on('active', () => log('active'))
    .on('denied', err => log('denied', err))
    .on('error', err => log('error', err))
    .on('paused', err => log('paused', err))
    .on('complete', info => log('complete', info));


//> HELPERS

function log(...args) {
  const now = Date.now();
  console.log(`${(now-previous)}ms`, 'INFO', ...args);
  previous = now;
}

function backOffFunction(prev) {
  if (prev <= 0) {
    // first run, backoff 1 second
    return 1000;
  }
  // double the backoff, maxing out at 1 minute
  return Math.min(prev * 2, 60000);
};

function exit(...message) {
  console.log('ERROR', ...message);
  process.exit(1);
}
