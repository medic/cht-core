var url = require('url'),
    request = require('request');

var MIN_MAJOR = 8;

var nodeVersionCheck = (medicModule) => {
  try {
    var [major, minor, patch] = process.versions.node.split('.').map(Number);
    if (major < MIN_MAJOR) {
      throw new Error(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
    }
    console.log(`Node Environment Options: '${process.env.NODE_OPTIONS}'`);
    console.log(`Node Version: ${major}.${minor}.${patch} in ${process.env.NODE_ENV || 'development'} mode`);
  } catch (err) {
    console.error(`Fatal error initialising medic-${medicModule}`);
    console.log(err);
    process.exit(1);
  }
};

var envVarsCheck = () => {
  var envValueAndExample = [
    ['COUCH_URL', 'http://admin:pass@localhost:5984/medic'],
    ['COUCH_NODE_NAME', 'couchdb@localhost']
  ];

  var failures = [];
  envValueAndExample.forEach(([envVar, example]) => {
    if (!process.env[envVar]) {
      failures.push(`${envVar} must be set. For example: ${envVar}=${example}`);
    }
  });

  if (failures.length) {
    return Promise.reject('At least one required environment variable was not set:\n' + failures.join('\n'));
  }
};

var couchDbNoAdminPartyModeCheck = () => {
  var noAuthUrl = url.parse(process.env.COUCH_URL),
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

var couchDbVersionCheck = (db) => {
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

module.exports = {
  nodeVersionCheck: (medicModule) => nodeVersionCheck(medicModule),
  envVarsCheck: () => envVarsCheck(),
  couchDbNoAdminPartyModeCheck: () => couchDbNoAdminPartyModeCheck(),
  couchDbVersionCheck: (db) => couchDbVersionCheck(db)
};
