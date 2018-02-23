const async = require('async'),
      db = require('./db'),
      config = require('./config'),
      migrations = require('./migrations'),
      ddocExtraction = require('./ddoc-extraction'),
      translations = require('./translations'),
      serverUtils = require('./server-utils'),
      apiPort = process.env.API_PORT || 5988;

const app = require('./routing');

const nodeVersionCheck = callback => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    const environment = app.get('env');

    console.log(`Node Version: ${major}.${minor}.${patch} running in ${environment} mode`);

    if (major < 5) {
      // 5 seems to be where the majority of ES6 was added without flags.
      // Seems safeist to not allow api to run
      callback(new Error(`Node version ${major}.${minor}.${patch} is not supported`));
    }

    if (major < 6 || ( major === 6 && minor < 5)) {
      console.error('We recommend nodejs 6.5 or higher.');
    }

    callback();
  } catch (error) {
    callback(error);
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
  serverUtils.serverError(err, req, res);
});
