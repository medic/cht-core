const url = require('url'),
      request = require('request'),
      db = require('./src/db-pouch'),
      config = require('./src/config'),
      migrations = require('./src/migrations'),
      ddocExtraction = require('./src/ddoc-extraction'),
      translations = require('./src/translations'),
      serverUtils = require('./src/server-utils'),
      apiPort = process.env.API_PORT || 5988;

const app = require('./src/routing');

const MIN_MAJOR = 8;

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:');
  console.error(reason);
});

const nodeVersionCheck = () => {
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  if (major < MIN_MAJOR) {
    throw new Error(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
  }
  console.log(`Node Version: ${major}.${minor}.${patch}`);
};

const envVarsCheck = () => {
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
    return Promise.reject('At least one required environment variable was not set:\n' + failures.join('\n'));
  }
};

const couchDbNoAdminPartyModeCheck = () => {
  const noAuthUrl = url.parse(process.env.COUCH_URL),
        protocol = noAuthUrl.protocol.replace(':', ''),
        net = require(protocol);

  delete noAuthUrl.auth;

  return new Promise((resolve, reject) => {
    net.get(url.format(noAuthUrl), ({statusCode}) => {
      // We expect to be rejected because we didn't provide auth
      if (statusCode === 401) {
        resolve();
      } else {
        console.error('Expected a 401 when accessing db without authentication.');
        console.error(`Instead we got a ${statusCode}`);
        reject(new Error('CouchDB security seems to be misconfigured, see: https://github.com/medic/medic-webapp#enabling-a-secure-couchdb'));
      }
    });
  });

};

const couchDbVersionCheck = () => {
  return new Promise((resolve, reject) => {
    request.get({ url: db.serverUrl, json: true }, (err, response, body) => {
      if (err) {
        return reject(err);
      }
      console.log(`CouchDB Version: ${body.version}`);
      resolve();
    });
  });
};

Promise.resolve()
  .then(nodeVersionCheck)
  .then(envVarsCheck)
  .then(couchDbNoAdminPartyModeCheck)
  .then(couchDbVersionCheck)

  .then(() => console.log('Extracting ddoc…'))
  .then(ddocExtraction.run)
  .then(() => console.log('DDoc extraction completed successfully'))

  .then(() => console.log('Loading configuration…'))
  .then(config.load)
  .then(() => console.log('Configuration loaded successfully'))
  .then(config.listen)

  .then(() => console.log('Merging translations…'))
  .then(translations.run)
  .then(() => console.log('Translations merged successfully'))

  .then(() => console.log('Running db migrations…'))
  .then(migrations.run)
  .then(() => console.log('Database migrations completed successfully'))

  .catch(err => {
    console.error('Fatal error initialising medic-api');
    console.error(err);
    process.exit(1);
  })

  .then(() => app.listen(apiPort, () => {
    console.log('Medic API listening on port ' + apiPort);
  }));

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
