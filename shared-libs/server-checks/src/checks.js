const request = require('request-promise-native');
const MIN_MAJOR = 16;

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

const getNoAuthURL = (couchUrl) => {
  const noAuthUrl = new URL(couchUrl);
  noAuthUrl.password = '';
  noAuthUrl.username = '';
  return noAuthUrl;
};

const checkServerUrl = (serverUrl) => {
  let couchUrl;
  try {
    couchUrl = new URL(serverUrl);
  } catch (err){
    throw new Error('Environment variable "COUCH_URL" is required. ' +
                    'Please make sure your CouchDb is accessible through a URL that matches: ' +
                    '<protocol>://<username>:<password>@<host>:<port>/<db name>');
  }

  const pathSegments = couchUrl.pathname.split('/').filter(segment => segment);

  if (pathSegments.length !== 1) {
    throw new Error('Environment variable "COUCH_URL" must have only one path segment. ' +
                    'Please make sure your CouchDb is accessible through a URL that matches: ' +
                    '<protocol>://<username>:<password>@<host>:<port>/<db name>');
  }
};

const couchDbNoAdminPartyModeCheck = (couchUrl) => {
  const noAuthUrl = getNoAuthURL(couchUrl);

  // require either 'http' or 'https' by removing the ":" from noAuthUrl.protocol
  const net = require(noAuthUrl.protocol.replace(':', ''));

  return new Promise((resolve, reject) => {
    net.get(noAuthUrl.toString(), ({ statusCode }) => {
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
      reject(`CouchDB doesn't seem to be running on ${noAuthUrl.toString()}. ` +
        `Tried to connect but got an error:\n ${e.stack}`);
    });
  });
};

const getCouchDbVersion = (couchUrl) => {
  return request.get({ url: couchUrl, json: true }).then(response => response.version);
};

const couchDbVersionCheck = (couchUrl) => {
  return getCouchDbVersion(couchUrl).then(version => {
    console.log(`CouchDB Version: ${version}`);
  });
};

const couchDbCheck = async (couchUrl) => {
  const retryTimeout = () => new Promise(resolve => setTimeout(resolve, 1000));
  const serverUrl = new URL(couchUrl);
  serverUrl.pathname = '/';

  do {
    try {
      await couchDbVersionCheck(serverUrl.toString());
      await couchDbNoAdminPartyModeCheck(serverUrl.toString());
      return;
    } catch (err) {
      console.log('CouchDb check failed', err);
      await retryTimeout();
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

const check = (couchUrl) => {
  return Promise.resolve()
    .then(nodeVersionCheck)
    .then(() => checkServerUrl(couchUrl))
    .then(() => couchDbCheck(couchUrl));
};

module.exports = {
  check: (couchUrl) => check(couchUrl),
  getCouchDbVersion: (couchUrl) => getCouchDbVersion(couchUrl),
};
