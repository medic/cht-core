const url = require('url'),
      request = require('request');

const MIN_MAJOR = 8;

const nodeVersionCheck = () => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    if (major < MIN_MAJOR) {
      throw new Error(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
    }
    console.log(`Node Environment Options: '${process.env.NODE_OPTIONS}'`);
    console.log(`Node Version: ${major}.${minor}.${patch} in ${process.env.NODE_ENV || 'development'} mode`);
  } catch (err) {
    console.error('Fatal error initialising');
    console.log(err);
    process.exit(1);
  }
};

const envVarsCheck = () => {
  const envValueAndExample = [
    ['COUCH_URL', 'http://admin:pass@localhost:5984/medic'],
    ['COUCH_NODE_NAME', 'couchdb@localhost']
  ];

  const failures = [];
  envValueAndExample.forEach(([envconst, example]) => {
    if (!process.env[envconst]) {
      failures.push(`${envconst} must be set. For example: ${envconst}=${example}`);
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

const couchDbVersionCheck = (serverUrl) => {
  return new Promise((resolve, reject) => {
    request.get({ url: serverUrl, json: true }, (err, response, body) => {
      if (err) {
        return reject(err);
      }
      console.log(`CouchDB Version: ${body.version}`);
      resolve();
    });
  });
};

const check = (serverUrl) => {
  return Promise.resolve()
    .then(nodeVersionCheck)
    .then(envVarsCheck)
    .then(couchDbNoAdminPartyModeCheck)
    .then(couchDbVersionCheck(serverUrl));
};

module.exports = {
  check: (serverUrl) => check(serverUrl),
  _nodeVersionCheck: () => nodeVersionCheck(),
  _envVarsCheck: () => envVarsCheck(),
  _couchDbNoAdminPartyModeCheck: () => couchDbNoAdminPartyModeCheck(),
  _couchDbVersionCheck: (serverUrl) => couchDbVersionCheck(serverUrl)
};
