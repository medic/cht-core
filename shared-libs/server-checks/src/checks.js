const request = require('@medic/couch-request');

const MIN_COUCHDB_VERSION = { major: 3, minor: 3 };

/* eslint-disable no-console */

const nodeVersionCheck = () => {
  try {
    console.log(`Node Version: ${process.versions.node}`);
    console.log(`Node Mode: "${process.env.NODE_ENV || 'development'}"`);
    console.log(`Node Environment Options: '${process.env.NODE_OPTIONS}'`);
  } catch (err) {
    console.error('Fatal error checking node version');
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

const arrayEqual = (arr1, arr2) => ![
  ...arr1.filter(item => !arr2.includes(item)),
  ...arr2.filter(item => !arr1.includes(item)),
].length;

const sameMembershipResult = (result1, result2) => {
  return arrayEqual(result1.all_nodes, result1.cluster_nodes) &&
         arrayEqual(result2.all_nodes, result2.cluster_nodes) &&
         arrayEqual(result1.all_nodes, result2.all_nodes);
};

const checkCluster = async (couchUrl) => {
  const membershipResults = [
    await request.get({ url: `${couchUrl}_membership`, json: true }),
    await request.get({ url: `${couchUrl}_membership`, json: true }),
    await request.get({ url: `${couchUrl}_membership`, json: true }),
  ];

  const consistentMembership =
          sameMembershipResult(membershipResults[0], membershipResults[1]) &&
          sameMembershipResult(membershipResults[0], membershipResults[2]);

  if (!consistentMembership) {
    throw new Error('Cluster not ready');
  }

  try {
    await request.get({ url: `${couchUrl}_users`, json: true });
    await request.get({ url: `${couchUrl}_replicator`, json: true });
    await request.get({ url: `${couchUrl}_global_changes`, json: true });
  } catch (err) {
    throw new Error('System databases do not exist');
  }

  console.log('CouchDb Cluster ready');
};

const getCouchDbVersion = async (couchUrl) => {
  const response = await request.get({ url: couchUrl, json: true });
  return response.version;
};

const couchDbVersionCheck = async (couchUrl) => {
  const version = await getCouchDbVersion(couchUrl);
  const [ major, minor ] = version.split('.').map(Number);
  if (major < MIN_COUCHDB_VERSION.major || minor < MIN_COUCHDB_VERSION.minor) {
    throw new Error(`CouchDB Version ${version} is not supported, minimum is ` + 
                    `${MIN_COUCHDB_VERSION.major}.${MIN_COUCHDB_VERSION.minor}.0`);
  }
  console.log(`CouchDB Version: ${version}`);
};

const logRequestError = (error) => {
  delete error.options;
  delete error.request;
  delete error.response;

  console.error(error);
};

const couchDbCheck = async (couchUrl) => {
  const retryTimeout = () => new Promise(resolve => setTimeout(resolve, 1000));
  const serverUrl = new URL(couchUrl);
  serverUrl.pathname = '/';

  do {
    try {
      await couchDbVersionCheck(serverUrl.toString());
      await couchDbNoAdminPartyModeCheck(serverUrl.toString());
      await checkCluster(serverUrl.toString());
      return;
    } catch (err) {
      logRequestError(err);
      await retryTimeout();
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

const check = async (couchUrl) => {
  await nodeVersionCheck();
  await checkServerUrl(couchUrl);
  await couchDbCheck(couchUrl);
};

module.exports = {
  check: (couchUrl) => check(couchUrl),
  getCouchDbVersion: (couchUrl) => getCouchDbVersion(couchUrl),
};
