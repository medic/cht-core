const request = require('request-promise-native');
const uuid = require('uuid').v4;
const MIN_MAJOR = 8;

const { COUCH_URL, COUCH_NODE_NAME } = process.env;

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

const getNoAuthURL = (serverUrl) => {
  serverUrl = serverUrl || COUCH_URL;
  const noAuthUrl = new URL(serverUrl);
  noAuthUrl.password = '';
  noAuthUrl.username = '';
  return noAuthUrl;
};
const getMembershipUrl = (serverUrl) => {
  const url = new URL(serverUrl);
  url.pathname = '/_membership';
  return url.toString();
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
      const value = envconst === 'COUCH_URL' ? getNoAuthURL().toString() : process.env[envconst];
      console.log(envconst, value);
    }
  });

  if (failures.length) {
    return Promise.reject('At least one required environment variable was not set:\n' + failures.join('\n'));
  }
};

const couchDbNoAdminPartyModeCheck = () => {
  const noAuthUrl = getNoAuthURL();
  // require either 'http' or 'https' by removing the ":" from noAuthUrl.protocol
  const net = require(noAuthUrl.protocol.replace(':', ''));

  return new Promise((resolve, reject) => {
    net.get(noAuthUrl.toString(), ({statusCode}) => {
      if (statusCode === 401) {
        console.log('CouchDB Security checked');
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

const checkNodeName = (nodeName, membership) => {
  return membership &&
    membership.all_nodes &&
    membership.all_nodes.includes(nodeName);
};

const couchNodeNamesMatch = async () => {
  const response = await request.get(getMembershipUrl(COUCH_URL), { json: true });
  if (checkNodeName(COUCH_NODE_NAME, response)) {
    console.log(`Environment variable "COUCH_NODE_NAME" matches server "${COUCH_NODE_NAME}"`);
    return;
  }

  const noAuthUrl = getNoAuthURL(getMembershipUrl(serverUrl));
  // we don't want to log user and password, so strip them when we log via getNoAuthURL();
  throw new Error(`Environment variable 'COUCH_NODE_NAME' set to "${COUCH_NODE_NAME}" but doesn't match ` +
                  `what's on CouchDB Membership endpoint at "${noAuthUrl.toString()}". See ` +
                  `https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md#required-environment-variables`);
};

const getCouchDbVersion = async (serverUrl) => {
  const response = await request.get({ url: serverUrl, json: true });
  return response.version;
};

const couchDbVersionCheck = () => {
  return getCouchDbVersion(COUCH_URL).then(version => {
    console.log(`CouchDB Version: ${version}`);
  });
};

const check = () => {
  return Promise.resolve()
    .then(nodeVersionCheck)
    .then(envVarsCheck)
    .then(couchDbNoAdminPartyModeCheck)
    .then(couchNodeNamesMatch)
    .then(couchDbVersionCheck);
};

const getNodes = async (serverUrl) => {
  const response = await request.get(`${serverUrl}/_membership`, { json: true });
  return response && response.cluster_nodes;
};

const createUser = async (username, serverUrl) => {
  const nodes = await getNodes(serverUrl);
  const password = uuid();
  for (const node of nodes) {
    const url = `${serverUrl}/_node/${node}/_config/admins/${username}`;
    await request.put({ url, json: true, method: 'PUT', body: password });
  }

  return password;
};

const getServerUrls = async (username) => {
  const envUrl = process.env.COUCH_URL;

  const couchUrl = new URL(envUrl);
  couchUrl.pathname = couchUrl.pathname.replace(/\/$/, '');

  const serverUrl = new URL(envUrl);
  serverUrl.pathname = '';

  const password = await createUser(username, serverUrl.toString());

  couchUrl.username = username;
  couchUrl.password = password;

  serverUrl.username = username;
  serverUrl.password = password;

  return { serverUrl, couchUrl, password };
};

module.exports = {
  check,
  getServerUrls,
  getCouchDbVersion,
  // todo
  _nodeVersionCheck: () => nodeVersionCheck(),
  _envVarsCheck: () => envVarsCheck(),
  _couchDbNoAdminPartyModeCheck: () => couchDbNoAdminPartyModeCheck(),
  _couchNodeNamesMatch: () => couchNodeNamesMatch(),
  _couchDbVersionCheck: (serverUrl) => couchDbVersionCheck(serverUrl)
};
