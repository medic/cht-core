const request = require('request-promise-native');
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

const getNoAuthURL = (serverUrl) => {
  const noAuthUrl = new URL(serverUrl);
  noAuthUrl.password = '';
  noAuthUrl.username = '';
  return noAuthUrl;
};

// also strips duplicate slashes
const getPathSegments = (url) => url.pathname.split('/').filter(segment => segment);

const getMembershipUrl = (serverUrl) => {
  const url = new URL(serverUrl);
  url.pathname = '/_membership';
  return url.toString();
};

const getServerUrl = (couchUrl) => {
  const url = new URL(couchUrl);
  url.pathname = '/';
  return url.toString();
};

const getAdminConfigUrl = (serverUrl, nodeName, username) => {
  const url = new URL(serverUrl);
  url.pathname = `/_node/${nodeName}/_config/admins/${username}`;
  return url.toString();
};

const envVarsCheck = (COUCH_URL, COUCH_NODE_NAME) => {
  const failures = [];

  if (!COUCH_URL) {
    failures.push(`COUCH_URL must be set. For example: COUCH_URL='http://admin:pass@localhost:5984/medic'`);
  } else {
    console.log('COUCH_URL', getNoAuthURL(COUCH_URL).toString());
  }
  if (!COUCH_NODE_NAME) {
    failures.push(`COUCH_NODE_NAME must be set. For example: COUCH_NODE_NAME='couchdb@127.0.0.1'`);
  } else {
    console.log('COUCH_NODE_NAME', COUCH_NODE_NAME);
  }

  if (failures.length) {
    return Promise.reject('At least one required environment variable was not set:\n' + failures.join('\n'));
  }
};

const couchDbNoAdminPartyModeCheck = (COUCH_URL) => {
  const noAuthUrl = getNoAuthURL(COUCH_URL);
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
      reject(`CouchDB doesn't seem to be running on ${noAuthUrl.toString()}. ` +
        `Tried to connect but got an error:\n ${e.stack}`);
    });
  });
};

const checkNodeName = (nodeName, membership) => {
  return membership &&
    membership.all_nodes &&
    membership.all_nodes.includes(nodeName);
};

const couchNodeNamesMatch = async (COUCH_URL, COUCH_NODE_NAME) => {
  const response = await request.get(getMembershipUrl(COUCH_URL), { json: true });
  if (checkNodeName(COUCH_NODE_NAME, response)) {
    console.log(`Environment variable "COUCH_NODE_NAME" matches server "${COUCH_NODE_NAME}"`);
    return;
  }

  const noAuthUrl = getNoAuthURL(getMembershipUrl(COUCH_URL));
  // we don't want to log user and password, so strip them when we log via getNoAuthURL();
  throw new Error(`Environment variable 'COUCH_NODE_NAME' set to "${COUCH_NODE_NAME}" but doesn't match ` +
                  `what's on CouchDB Membership endpoint at "${noAuthUrl.toString()}". See ` +
                  `https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md#required-environment-variables`);
};

const getCouchDbVersion = async (serverUrl) => {
  const response = await request.get({ url: serverUrl, json: true });
  return response.version;
};

const couchDbVersionCheck = (COUCH_URL) => {
  const serverUrl = getServerUrl(COUCH_URL); // main database might not exist at first load
  return getCouchDbVersion(serverUrl).then(version => {
    console.log(`CouchDB Version: ${version}`);
  });
};

const check = (COUCH_URL, COUCH_NODE_NAME) => {
  return Promise.resolve()
    .then(nodeVersionCheck)
    .then(() => envVarsCheck(COUCH_URL, COUCH_NODE_NAME))
    .then(() => couchDbUrlCheck(COUCH_URL))
    .then(() => couchDbNoAdminPartyModeCheck(COUCH_URL))
    .then(() => couchNodeNamesMatch(COUCH_URL, COUCH_NODE_NAME))
    .then(() => couchDbVersionCheck(COUCH_URL));
};

const getNodes = async (serverUrl) => {
  const response = await request.get(getMembershipUrl(serverUrl), { json: true });
  return response && response.all_nodes;
};

const createAdmin = async (username, password, serverUrl) => {
  const nodes = await getNodes(serverUrl);
  for (const node of nodes) {
    await request.put({ url: getAdminConfigUrl(serverUrl, node, username), json: true, body: password });
  }
};

const couchDbUrlCheck = (COUCH_URL) => {
  const couchUrl = new URL(COUCH_URL);
  const pathSegments = getPathSegments(couchUrl);

  if (pathSegments.length !== 1) {
    throw new Error('Environment variable "COUCH_URL" must have only one path segment. ' +
                    'Please make sure your CouchDb is accessible through a URL that matches: ' +
                    '<protocol>://<username>:<password>@<host>:<port>/<db name>');
  }
};

const getServerUrls = async (COUCH_URL, username) => {
  const serverUrl = new URL(getServerUrl(COUCH_URL));

  const couchUrl = new URL(COUCH_URL);
  const dbName = getPathSegments(couchUrl)[0];
  couchUrl.pathname = `/${dbName}`;

  await createAdmin(username, serverUrl.password, serverUrl.toString());

  serverUrl.username = username;
  couchUrl.username = username;

  return {
    serverUrl: serverUrl.toString(),
    couchUrl: couchUrl.toString(),
    dbName,
  };
};

module.exports = {
  check,
  getServerUrls,
  getCouchDbVersion,
};
