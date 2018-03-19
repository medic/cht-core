const async = require('async'),
      db = require('./db'),
      config = require('./config'),
      migrations = require('./migrations'),
      ddocExtraction = require('./ddoc-extraction'),
      translations = require('./translations'),
      serverUtils = require('./server-utils'),
      apiPort = process.env.API_PORT || 5988;

const app = require('./routing');

const MIN_MAJOR = 8;
const nodeVersionCheck = (cb) => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    if (major < MIN_MAJOR) {
      // TODO: re-enable this before releasing 3.0
      // throw new Error(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
      console.warn(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
    }
    console.log(`Node Version: ${major}.${minor}.${patch}`);
    cb();
  } catch (err) {
    cb(err);
  }
};

const envVarsCheck = callback => {
  const envValueAndExample = [
    ['COUCH_URL', 'http://admin:pass@localhost:5984/medic'],
    ['COUCH_NODE_NAME', 'couchdb@localhost']
  ];

  const failures = [];
  envValueAndExample.forEach(([envVar, example]) => {
    if (!process.env[envVar]) {
      failures.push(`${envVar} must be set. For example: ${envVar}=${example}`);
    }
  });

  if (failures.length) {
    callback('At least one required environment variable was not set:\n' + failures.join('\n'));
  } else {
    callback();
  }
};

const couchDbNoAdminPartyModeCheck = callback => {
  const url = require('url'),
        noAuthUrl = url.parse(process.env.COUCH_URL),
        protocol = noAuthUrl.protocol.replace(':', ''),
        net = require(protocol);

  delete noAuthUrl.auth;

  net.get(url.format(noAuthUrl), ({statusCode}) => {
    // We expect to be rejected because we didn't provide auth
    if (statusCode === 401) {
      callback();
    } else {
      console.error('Expected a 401 when accessing db without authentication.');
      console.error(`Instead we got a ${statusCode}`);
      callback(new Error('CouchDB security seems to be misconfigured, see: https://github.com/medic/medic-webapp#enabling-a-secure-couchdb'));
    }
  });
};

const couchDbVersionCheck = callback =>
  db.getCouchDbVersion((err, version) => {
    if (err) {
      return callback(err);
    }

    console.log(`CouchDB Version: ${version.major}.${version.minor}.${version.patch}`);
    callback();
  });

const asyncLog = message => async.asyncify(() => console.log(message));

async.series([
  nodeVersionCheck,
  envVarsCheck,
  couchDbNoAdminPartyModeCheck,
  couchDbVersionCheck,

  asyncLog('Extracting ddoc…'),
  ddocExtraction.run,
  asyncLog('DDoc extraction completed successfully'),

  asyncLog('Loading configuration…'),
  config.load,
  asyncLog('Configuration loaded successfully'),

  async.asyncify(config.listen),

  asyncLog('Merging translations…'),
  translations.run,
  asyncLog('Translations merged successfully'),

  asyncLog('Running db migrations…'),
  migrations.run,
  asyncLog('Database migrations completed successfully'),
], err => {
  if (err) {
    console.error('Fatal error initialising medic-api');
    console.error(err);
    process.exit(1);
  }

  app.listen(apiPort, () =>
    console.log('Medic API listening on port ' + apiPort));
});

// Define error-handling middleware last.
// http://expressjs.com/guide/error-handling.html
app.use((err, req, res, next) => { // jshint ignore:line
  if (res.headersSent) {
    // If we've already started a response (eg streaming), pass on to express to abort it
    // rather than attempt to resend headers for a 5xx response
    return next(err);
  }
  serverUtils.serverError(err, req, res);
});
