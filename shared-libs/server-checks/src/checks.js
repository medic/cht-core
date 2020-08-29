const url = require('url');
const request = require('request');
const MIN_MAJOR = 8;

/* eslint-disable no-console */

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

const getNoAuthURL = () => {
  const noAuthUrl = url.parse(process.env.COUCH_URL);
  delete noAuthUrl.auth;
  return noAuthUrl;
};

const envVarsCheck = () => {
  const envValueAndExample = [
    ['COUCH_URL', 'http://admin:pass@localhost:5984/medic'],
    ['COUCH_NODE_NAME', 'couchdb@127.0.0.1']
  ];

  const failures = [];
  envValueAndExample.forEach(([envconst, example]) => {
    if (!process.env[envconst]) {
      failures.push(`${envconst} must be set. For example: ${envconst}=${example}`);
    } else {
      const value = envconst === 'COUCH_URL' ? url.format(getNoAuthURL()) : process.env[envconst];
      console.log(envconst, value);
    }
  });

  if (failures.length) {
    return Promise.reject('At least one required environment variable was not set:\n' + failures.join('\n'));
  }
};

const couchDbNoAdminPartyModeCheck = () => {
  const noAuthUrl = getNoAuthURL();

  // require either 'http' or 'https' by removing the ";" from noAuthUrl.protocol
  const net = require(noAuthUrl.protocol.replace(':', ''));

  return new Promise((resolve, reject) => {
    net.get(url.format(noAuthUrl), ({statusCode}) => {
      // We expect to be rejected because we didn't provide auth
      if (statusCode === 401) {
        resolve();
      } else {
        console.error('Expected a 401 when accessing db without authentication.');
        console.error(`Instead we got a ${statusCode}`);
        reject(new Error('CouchDB security seems to be misconfigured, ' +
          'see: https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md#enabling-a-secure-couchdb'));
      }
    }).on('error', (e) => {
      reject(`CouchDB doesn't seem to be running on ${url.format(noAuthUrl)}. ` +
        `Tried to connect but got an error:\n ${e.stack}`);
    });
  });
};

// since we don't know what the object keys are, so lets find the first one
// and then the first element of that array. We always work in a single node
//  membership, so this should be safe.
const getNodeNameFromJson = (json) => {
  if (typeof json === 'object' && Object.keys(json).length > 0) {
    const key = Object.keys(json).shift();
    if(json[key].length > 0) {
      return json[key].shift();
    }
  }
  return false;
};

const couchNodeNamesMatch = (serverUrl) => {
  const envNodeName = process.env['COUCH_NODE_NAME'];
  const membershipUrl = serverUrl + '/_membership';

  return new Promise((resolve, reject) => {
    request.get({ url: membershipUrl, json: true }, (err, response, json) => {
      const serverNodeName = getNodeNameFromJson(json);
      if (envNodeName === serverNodeName) {
        console.log(`Environment variable "COUCH_NODE_NAME" matches server "${envNodeName}"`);
        return resolve();
      } else {
        return  reject(`Environment variable 'COUCH_NODE_NAME' set to "${envNodeName}" but doesn't match ` +
          `what's on CouchDB Membership endpoint "${serverNodeName}". See ` +
          `https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md#required-environment-variables`);
      }
    });
  });
};

const getCouchDbVersion = (serverUrl) => {
  return new Promise((resolve, reject) => {
    request.get({ url: serverUrl, json: true }, (err, response, body) => {
      return err ? reject(err) : resolve(body.version);
    });
  });
};

const couchDbVersionCheck = (serverUrl) => {
  return getCouchDbVersion(serverUrl).then(version => {
    console.log(`CouchDB Version: ${version}`);
  });
};

const check = (serverUrl) => {
  return Promise.resolve()
    .then(nodeVersionCheck)
    .then(envVarsCheck)
    .then(couchDbNoAdminPartyModeCheck)
    .then(() => couchNodeNamesMatch(serverUrl))
    .then(() => couchDbVersionCheck(serverUrl));
};

module.exports = {
  check: (serverUrl) => check(serverUrl),
  getCouchDbVersion: (serverUrl) => getCouchDbVersion(serverUrl),
  _nodeVersionCheck: () => nodeVersionCheck(),
  _envVarsCheck: () => envVarsCheck(),
  _couchDbNoAdminPartyModeCheck: () => couchDbNoAdminPartyModeCheck(),
  _couchDbVersionCheck: (serverUrl) => couchDbVersionCheck(serverUrl)
};
