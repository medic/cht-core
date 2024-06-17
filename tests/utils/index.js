/* eslint-disable no-console */

const _ = require('lodash');
const constants = require('@constants');
const rpn = require('request-promise-native');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawn } = require('child_process');
const mustache = require('mustache');
// by default, mustache escapes slashes, which messes with paths and urls.
mustache.escape = (text) => text;
const semver = require('semver');
const moment = require('moment');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const userSettings = require('@factories/cht/users/user-settings');
const buildVersions = require('../../scripts/build/versions');
const PouchDB = require('pouchdb-core');
const chtDbUtils = require('@utils/cht-db');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-session-authentication'));
PouchDB.plugin(require('pouchdb-mapreduce'));

process.env.COUCHDB_USER = constants.USERNAME;
process.env.COUCHDB_PASSWORD = constants.PASSWORD;
process.env.CERTIFICATE_MODE = constants.CERTIFICATE_MODE;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; // allow self signed certificates
const DEBUG = process.env.DEBUG;

let originalSettings;
let dockerVersion;
let infrastructure = 'docker';
const isDocker = () => infrastructure === 'docker';
const isK3D = () => !isDocker();
const K3D_DATA_PATH = '/data';

const auth = { username: constants.USERNAME, password: constants.PASSWORD };
const SW_SUCCESSFUL_REGEX = /Service worker generated successfully/;
const ONE_YEAR_IN_S = 31536000;
const PROJECT_NAME = 'cht-e2e';
const NETWORK = 'cht-net-e2e';
const SERVICES = {
  haproxy: 'haproxy',
  nginx: 'nginx',
  couchdb1: 'couchdb-1.local',
  couchdb2: 'couchdb-2.local',
  couchdb3: 'couchdb-3.local',
  api: 'api',
  sentinel: 'sentinel',
  'haproxy-healthcheck': 'healthcheck',
};
const CONTAINER_NAMES = {};
const originalTranslations = {};
const COUCH_USER_ID_PREFIX = 'org.couchdb.user:';
const COMPOSE_FILES = ['cht-core', 'cht-couchdb-cluster'];
const PERMANENT_TYPES = ['translations', 'translations-backup', 'user-settings', 'info'];
const db = new PouchDB(`${constants.BASE_URL}/${constants.DB_NAME}`, { auth });
const sentinelDb = new PouchDB(`${constants.BASE_URL}/${constants.DB_NAME}-sentinel`, { auth });
const usersDb = new PouchDB(`${constants.BASE_URL}/_users`, { auth });
const logsDb = new PouchDB(`${constants.BASE_URL}/${constants.DB_NAME}-logs`, { auth });
const existingFeedbackDocIds = [];
const MINIMUM_BROWSER_VERSION = '90';
const KUBECTL_CONTEXT = `-n ${PROJECT_NAME} --context k3d-${PROJECT_NAME}`;
const cookieJar = rpn.jar();

// Cookies from the jar will be included on Node `fetch` calls
global.fetch = require('fetch-cookie').default(global.fetch, cookieJar);

const makeTempDir = (prefix) => fs.mkdtempSync(path.join(path.join(os.tmpdir(), prefix || 'ci-')));
const env = {
  ...process.env,
  CHT_NETWORK: NETWORK,
  COUCHDB_SECRET: 'monkey',
};

const dockerPlatformName = () => {
  try {
    return JSON.parse(execSync(`docker version --format '{{json .Server.Platform.Name}}'`));
  } catch (error) {
    console.log('docker version failed. NOTE this error is not relevant if running outside of docker');
    console.log(error.message);
  }
  return null;
};

const isDockerDesktop = () => {
  return (dockerPlatformName() || '').includes('Docker Desktop');
};

const dockerGateway = () => {
  const network = isDocker() ? NETWORK : `k3d-${PROJECT_NAME}`;
  try {
    return JSON.parse(execSync(`docker network inspect ${network} --format='{{json .IPAM.Config}}'`));
  } catch (error) {
    console.log('docker network inspect failed. NOTE this error is not relevant if running outside of docker');
    console.log(error.message);
  }
};

const getHostRoot = () => {
  if (isDockerDesktop()) {
    // Docker Desktop networking requires a special host name for connecting to host machine.
    // https://docs.docker.com/desktop/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host
    return 'host.docker.internal';
  }
  const gateway = dockerGateway();
  return gateway?.[0]?.Gateway || 'localhost';
};

const hostURL = (port = 80) => {
  const url = new URL(`http://${getHostRoot()}`);
  url.port = port;
  return url.href;
};

const parseCookieResponse = (cookieString) => {
  return cookieString.map((cookie) => {
    const cookieObject = {};
    const cookieSplit = cookie.split(';');
    const [cookieName, cookieValue] = cookieSplit.shift().split('=');
    cookieObject.name = cookieName;
    cookieObject.value = cookieValue;
    cookieSplit.forEach((cookieValues) => {
      const [key, value] = cookieValues.split('=');
      cookieObject[key] = (key.includes('Secure') || key.includes('HttpOnly')) ? true : value;
    });
    return cookieObject;
  });
};

const setupUserDoc = (userName = constants.USERNAME, userDoc = userSettings.build()) => {
  return getDoc(COUCH_USER_ID_PREFIX + userName)
    .then(doc => {
      const finalDoc = Object.assign(doc, userDoc);
      return saveDoc(finalDoc);
    });
};

const getSession = async () => {
  if (cookieJar.getCookies(constants.BASE_URL).length) {
    return;
  }

  const options = {
    method: 'POST',
    uri: `${constants.BASE_URL}/_session`,
    json: true,
    body: { name: auth.username, password: auth.password},
    auth,
    resolveWithFullResponse: true,
  };
  const response = await rpn(options);
  const setCookie = response.headers?.['set-cookie'];
  const header = Array.isArray(setCookie) ? setCookie.find(header => header.startsWith('AuthSession')) : setCookie;
  if (header) {
    try {
      cookieJar.setCookie(rpn.cookie(header), constants.BASE_URL);
    } catch (err) {
      console.error(err);
    }
  }
};

const isLoginRequest = options => {
  return options.path === '/medic/login' && options.body.user !== auth.username;
};

const randomIp = () => {
  const section = () => (Math.floor(Math.random() * 255) + 1);
  return `${section()}.${section()}.${section()}.${section()}`;
};

// First Object is passed to http.request, second is for specific options / flags
// for this wrapper
const request = async (options, { debug } = {}) => { //NOSONAR
  options = typeof options === 'string' ? { path: options } : _.clone(options);
  if (!options.noAuth && !options.auth && !isLoginRequest(options)) {
    await getSession();
    options.jar = cookieJar;
  } else {
    options.headers = options.headers || {};
    options.headers['X-Forwarded-For'] = randomIp();
  }
  options.uri = options.uri || `${constants.BASE_URL}${options.path}`;
  options.json = options.json === undefined ? true : options.json;

  if (debug) {
    console.log('SENDING REQUEST');
    console.log(JSON.stringify(options, null, 2));
  }

  options.transform = (body, response, resolveWithFullResponse) => {
    if (debug) {
      console.log('RESPONSE');
      console.log(response.statusCode);
      console.log(response.body);
    }
    // we might get a json response for a non-json request.
    const contentType = response.headers['content-type'];
    if (contentType?.startsWith('application/json') && !options.json) {
      response.body = JSON.parse(response.body);
    }
    // return full response if `resolveWithFullResponse` or if non-2xx status code (so errors can be inspected)
    return resolveWithFullResponse || !(/^2/.test('' + response.statusCode)) ? response : response.body;
  };

  try {
    return await rpn(options);
  } catch (err) {
    err.responseBody = err?.response?.body;
    console.warn(`Error with request: ${options.method || 'GET'} ${options.uri} ${err.statusCode}`);
    throw err;
  }
};

const requestOnTestDb = (options, debug) => {
  if (typeof options === 'string') {
    options = {
      path: options,
    };
  }
  const pathAndReqType = `${options.path}${options.method}`;
  if (pathAndReqType !== '/GET') {
    options.path = '/' + constants.DB_NAME + (options.path || '');
  }
  return request(options, debug);
};

const requestOnTestMetaDb = (options, debug) => {
  if (typeof options === 'string') {
    options = {
      path: options,
    };
  }
  options.path = `/${constants.DB_NAME}-user-${options.userName}-meta${options.path || ''}`;
  return request(options, debug);
};

const requestOnMedicDb = (options, debug) => {
  if (typeof options === 'string') {
    options = { path: options };
  }
  options.path = `/medic${options.path || ''}`;
  return request(options, debug);
};

const formDocProcessing = async (docs) => {
  if (!Array.isArray(docs)) {
    docs = [docs];
  }

  const formsWatchers = docs
    .filter(doc => doc.type === 'form')
    .map(doc => new RegExp(`Form with ID "${doc._id}" does not need to be updated`))
    .map(re => waitForApiLogs(re));

  const waitForForms = await Promise.all(formsWatchers);

  return {
    promise: () => Promise.all(waitForForms.map(wait => wait.promise)),
    cancel: () => waitForForms.forEach(wait => wait.cancel),
  };
};

const saveDoc = async doc => {
  const waitForForms = await formDocProcessing(doc);
  try {
    const result = requestOnTestDb({
      path: '/', // so audit picks this up
      method: 'POST',
      body: doc,
    });
    await waitForForms.promise();
    return result;
  } catch (err) {
    waitForForms.cancel();
    throw err;
  }
};

const saveDocs = async (docs) => {
  const waitForForms = await formDocProcessing(docs);
  const results = await requestOnTestDb({
    path: '/_bulk_docs',
    method: 'POST',
    body: { docs }
  });
  if (results.find(r => !r.ok)) {
    waitForForms.cancel();
    throw Error(JSON.stringify(results, null, 2));
  }

  await waitForForms.promise();
  return results;
};

const saveDocsRevs = async (docs) => {
  const results = await saveDocs(docs);
  results.forEach(({ rev }, idx) => docs[idx]._rev = rev);
  return results;
};

const saveDocIfNotExists = async doc => {
  try {
    await getDoc(doc._id);
  } catch (_) {
    await saveDoc(doc);
  }
};

const saveMetaDocs = (user, docs) => {
  const options = {
    userName: user,
    method: 'POST',
    body: { docs: docs },
    path: '/_bulk_docs',
  };
  return requestOnTestMetaDb(options)
    .then(results => {
      if (results.find(r => !r.ok)) {
        throw Error(JSON.stringify(results, null, 2));
      }
      return results;
    });
};

const getDoc = (id, rev, parameters = '') => {
  const params = {};
  if (rev) {
    params.rev = rev;
  }

  return requestOnTestDb({
    path: `/${id}${parameters}`,
    method: 'GET',
    params,
  });
};

const getDocs = (ids, fullResponse = false) => {
  return requestOnTestDb({
    path: `/_all_docs?include_docs=true`,
    method: 'POST',
    body: { keys: ids || [] },
  })
    .then(response => {
      return fullResponse ? response : response.rows.map(row => row.doc);
    });
};

const getMetaDocs = (user, ids, fullResponse = false) => {
  const options = {
    userName: user,
    method: 'POST',
    body: { keys: ids || [] },
    path: '/_all_docs?include_docs=true',
  };
  return requestOnTestMetaDb(options)
    .then(response => fullResponse ? response : response.rows.map(row => row.doc));
};

const deleteDoc = id => {
  return getDoc(id).then(doc => {
    doc._deleted = true;
    return saveDoc(doc);
  });
};

const deleteDocs = ids => {
  return getDocs(ids).then(docs => {
    docs = docs.filter(doc => !!doc);
    if (docs.length) {
      docs.forEach(doc => doc._deleted = true);
      return requestOnTestDb({
        path: '/_bulk_docs',
        method: 'POST',
        body: { docs },
      });
    }
  });
};

/**
 * Deletes all docs in the database, except some core docs (read the code) and
 * any docs that you specify.
 *
 * NB: this is back-end only, it does *not* care about the front-end, and will
 * not detect if it needs to refresh
 *
 * @param      {Array}    except  array of: exact document name; or regex; or
 *                                predicate function that returns true if you
 *                                wish to keep the document
 * @return     {Promise}  completion promise
 */
const deleteAllDocs = (except) => { //NOSONAR
  except = Array.isArray(except) ? except : [];
  // Generate a list of functions to filter documents over
  const ignorables = except.concat(
    doc => PERMANENT_TYPES.includes(doc.type),
    'service-worker-meta',
    constants.USER_CONTACT_ID,
    'migration-log',
    'resources',
    'branding',
    'partners',
    'settings',
    /^form:/,
    /^_design/
  );
  const ignoreFns = [];
  const ignoreStrings = [];
  const ignoreRegex = [];
  ignorables.forEach(i => {
    if (typeof i === 'function') {
      ignoreFns.push(i);
    } else if (typeof i === 'object') {
      ignoreRegex.push(i);
    } else {
      ignoreStrings.push(i);
    }
  });

  ignoreFns.push(doc => ignoreStrings.includes(doc._id));
  ignoreFns.push(doc => ignoreRegex.find(r => doc._id.match(r)));

  // Accessing function using module.exports because it's stub in webapp/tests/mocha/unit/testingtests/e2e/utils.spec.js
  return module.exports
    .requestOnTestDb({
      path: '/_all_docs?include_docs=true',
      method: 'GET',
    })
    .then(({ rows }) => {
      return rows
        .filter(({ doc }) => doc && !ignoreFns.find(fn => fn(doc)))
        .map(({ doc }) => {
          return {
            _id: doc._id,
            _rev: doc._rev,
            _deleted: true,
          };
        });
    })
    .then(toDelete => {
      const ids = toDelete.map(doc => doc._id);
      if (DEBUG) {
        console.log(`Deleting docs and infodocs: ${ids}`);
      }
      const infoIds = ids.map(id => `${id}-info`);
      return Promise.all([
        module.exports
          .requestOnTestDb({
            path: '/_bulk_docs',
            method: 'POST',
            body: { docs: toDelete },
          })
          .then(response => {
            if (DEBUG) {
              console.log(`Deleted docs: ${JSON.stringify(response)}`);
            }
          }),
        module.exports.sentinelDb
          .allDocs({ keys: infoIds })
          .then(results => {
            const deletes = results.rows
              .filter(row => row.value) // Not already deleted
              .map(({ id, value }) => ({
                _id: id,
                _rev: value.rev,
                _deleted: true
              }));
            // Accessing property using module.exports because
            // it's stub in webapp/tests/mocha/unit/testingtests/e2e/utils.spec.js
            return module.exports.sentinelDb.bulkDocs(deletes);
          }).then(response => {
            if (DEBUG) {
              console.log(`Deleted sentinel docs: ${JSON.stringify(response)}`);
            }
          })
      ]);
    })
    .then(() => require('@utils/sentinel').skipToSeq());
};

// Update both ddocs, to avoid instability in tests.
// Note that API will be copying changes to medic over to medic-client, so change
// medic-client first (api does nothing) and medic after (api copies changes over to
// medic-client, but the changes are already there.)
const updateCustomSettings = updates => {
  if (originalSettings) {
    throw new Error('A previous test did not call revertSettings');
  }
  return request({
    path: '/api/v1/settings',
    method: 'GET',
  })
    .then(settings => {
      originalSettings = settings;
      // Make sure all updated fields are present in originalSettings, to enable reverting later.
      Object.keys(updates).forEach(updatedField => {
        if (!_.has(originalSettings, updatedField)) {
          originalSettings[updatedField] = null;
        }
      });
    })
    .then(() => {
      return request({
        path: '/api/v1/settings?replace=1',
        method: 'PUT',
        body: updates,
      });
    });
};

const waitForSettingsUpdateLogs = (type) => {
  if (type === 'sentinel') {
    return waitForSentinelLogs(true, /Reminder messages allowed between/);
  }
  return waitForApiLogs(/Settings updated/);
};

/**
 * Update settings and refresh if required
 *
 * @param {Object}         updates  Object containing all updates you wish to
 *                                  make
 * @param  {Boolean|String} ignoreReload if false, will wait for reload modal and reload. if truthy, will tail
 *                                       service logs and resolve when new settings are loaded. By default, watches
 *                                       api logs, if value equals 'sentinel', will watch sentinel logs instead.
 * @return {Promise}        completion promise
 */
const updateSettings = async (updates, ignoreReload) => {
  const watcher = ignoreReload &&
    Object.keys(updates).length &&
    await waitForSettingsUpdateLogs(ignoreReload);
  await updateCustomSettings(updates);
  if (!ignoreReload) {
    return await commonElements.closeReloadModal(true);
  }
  return watcher && await watcher.promise;
};

const revertCustomSettings = () => {
  if (!originalSettings) {
    return Promise.resolve(false);
  }
  return request({
    path: '/api/v1/settings?replace=1',
    method: 'PUT',
    body: originalSettings,
  }).then((result) => {
    originalSettings = null;
    return result.updated;
  });
};

/**
 * Revert settings and refresh if required
 *
 * @param {Boolean|String} ignoreRefresh if false, will wait for reload modal and reload. if true, will tail api logs
 *                                       and resolve when new settings are loaded.
 * @return {Promise}       completion promise
 */
const revertSettings = async ignoreRefresh => {
  const watcher = ignoreRefresh && await waitForSettingsUpdateLogs();
  const needsRefresh = await revertCustomSettings();

  if (!ignoreRefresh) {
    return needsRefresh && await commonElements.closeReloadModal(true);
  }

  if (!needsRefresh) {
    watcher?.cancel();
    return;
  }

  return await watcher.promise;
};

const seedTestData = (userContactDoc, documents) => {
  return saveDocs(documents)
    .then(() => getDoc(constants.USER_CONTACT_ID))
    .then(existingContactDoc => {
      if (userContactDoc) {
        Object.assign(existingContactDoc, userContactDoc);
        return saveDoc(existingContactDoc);
      }
    });
};

const revertTranslations = async () => {
  const updatedTranslations = Object.keys(originalTranslations);
  if (!updatedTranslations.length) {
    return Promise.resolve();
  }

  const docs = await getDocs(updatedTranslations.map(code => `messages-${code}`));
  docs.forEach(doc => {
    doc.generic = Object.assign(doc.generic, originalTranslations[doc.code]);
    delete originalTranslations[doc.code];
  });

  await requestOnTestDb({
    path: '/_bulk_docs',
    method: 'POST',
    body: { docs },
  });
};

const deleteLocalDocs = async () => {
  const localDocs = await requestOnTestDb({ path: '/_local_docs?include_docs=true' });

  const docsToDelete = localDocs.rows
    .filter(row => row?.doc?.replicator === 'pouchdb')
    .map(row => {
      row.doc._deleted = true;
      return row.doc;
    });

  await saveDocs(docsToDelete);
};

const hasModal = () => $('#update-available').isDisplayed();

const setUserContactDoc = (attempt = 0) => {
  const {
    USER_CONTACT_ID: docId,
    DEFAULT_USER_CONTACT_DOC: defaultDoc
  } = constants;

  return db
    .get(docId)
    .catch(() => ({}))
    .then(existing => Object.assign(defaultDoc, { _rev: existing?._rev }))
    .then(newDoc => db.put(newDoc))
    .catch(err => {
      if (attempt > 3) {
        throw err;
      }
      return setUserContactDoc(attempt + 1);
    });
};

const deleteMetaDbs = async () => {
  const allDbs = await request({ path: '/_all_dbs' });
  const metaDbs = allDbs.filter(db => db.endsWith('-meta') && !db.endsWith('-users-meta'));
  for (const metaDb of metaDbs) {
    await request({ method: 'DELETE', path: `/${metaDb}` });
  }
};

/**
 * Deletes documents from the database, including Enketo forms. Use with caution.
 * @param {array} except - exeptions in the delete method. If this parameter is empty
 *                         everything will be deleted from the config, including all the enketo forms.
 * @param {boolean} ignoreRefresh
 */
const revertDb = async (except, ignoreRefresh) => { //NOSONAR
  await deleteAllDocs(except);
  await revertTranslations();
  await deleteLocalDocs();
  const watcher = ignoreRefresh && await waitForSettingsUpdateLogs();
  const needsRefresh = await revertCustomSettings();

  // only refresh if the settings were changed or modal was already present and we're not explicitly ignoring
  if (!ignoreRefresh && (needsRefresh || await hasModal())) {
    watcher?.cancel();
    await commonElements.closeReloadModal(true);
  } else if (needsRefresh) {
    watcher && await watcher.promise;
  } else {
    watcher?.cancel();
  }

  await deleteMetaDbs();

  await setUserContactDoc();
};

const getOrigin = () => `${constants.BASE_URL}`;

const getBaseUrl = () => `${constants.BASE_URL}/#/`;

const getAdminBaseUrl = () => `${constants.BASE_URL}/admin/#/`;

const getLoggedInUser = async () => {
  try {
    if (typeof browser === 'undefined') {
      return;
    }
    const cookies = await browser.getCookies('userCtx');
    if (!cookies.length) {
      return;
    }

    const userCtx = JSON.parse(decodeURIComponent(cookies?.[0]?.value));
    return userCtx.name;
  } catch (err) {
    console.warn('Error getting userCtx', err.message);
    return;
  }
};

/**
 * Deletes _users docs and medic/user-settings docs for specified users
 * @param {Array} users - list of users to be deleted
 * @param {Boolean} meta - if true, deletes meta db-s as well, default true
 * @return {Promise}
 */
const deleteUsers = async (users, meta = false) => { //NOSONAR
  if (!users.length) {
    return;
  }

  const loggedUser = await getLoggedInUser();
  if (loggedUser && users.find(user => user.username === loggedUser)) {
    await browser.reloadSession();
  }

  const usernames = users.map(user => COUCH_USER_ID_PREFIX + user.username);
  const userDocs = await request({ path: '/_users/_all_docs', method: 'POST', body: { keys: usernames } });
  const medicDocs = await request({
    path: `/${constants.DB_NAME}/_all_docs`,
    method: 'POST',
    body: { keys: usernames }
  });

  const toDelete = userDocs.rows
    .map(row => row.value && !row.value.deleted && ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
    .filter(stub => stub);
  const toDeleteMedic = medicDocs.rows
    .map(row => row.value && !row.value.deleted && ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
    .filter(stub => stub);

  const results = await Promise.all([
    request({ path: '/_users/_bulk_docs', method: 'POST', body: { docs: toDelete } }),
    request({ path: `/${constants.DB_NAME}/_bulk_docs`, method: 'POST', body: { docs: toDeleteMedic } }),
  ]);
  const errors = results.flat().filter(result => !result.ok);
  if (errors.length) {
    return deleteUsers(users, meta);
  }
};

const getCreatedUsers = async () => {
  const adminUserId = COUCH_USER_ID_PREFIX + constants.USERNAME;
  const users = await request({ path: `/_users/_all_docs?start_key="${COUCH_USER_ID_PREFIX}"` });
  return users.rows
    .filter(user => user.id !== adminUserId)
    .map((user) => ({ ...user, username: user.id.replace(COUCH_USER_ID_PREFIX, '') }));
};

/**
 * Creates users - optionally also creating their meta dbs
 * @param {Array} users - list of users to be created
 * @param {Boolean} meta - if true, creates meta db-s as well, default false
 * @return {Promise}
 * */
const createUsers = async (users, meta = false) => {
  const createUserOpts = { path: '/api/v1/users', method: 'POST' };
  const createUserV3Opts = { path: '/api/v3/users', method: 'POST' };

  for (const user of users) {
    const options = {
      body: user,
      ...(Array.isArray(user.place) ? createUserV3Opts : createUserOpts)
    };
    await request(options);
  }

  await delayPromise(1000);

  if (!meta) {
    return;
  }

  for (const user of users) {
    await request({ path: `/${constants.DB_NAME}-user-${user.username}-meta`, method: 'PUT' });
  }
};

const getAllUserSettings = () => db
  .query('medic-client/doc_by_type', { include_docs: true, key: ['user-settings'] })
  .then(response => response.rows.map(row => row.doc));

/**
 * Returns all the user settings docs matching the given criteria.
 * @param {{ name, contactId }} opts - object containing the query parameters
 * @return {Promise}
 * */
const getUserSettings = ({ contactId, name }) => {
  return getAllUserSettings()
    .then(docs => docs.filter(doc => {
      const nameMatches = !name || doc.name === name;
      const contactIdMatches = !contactId || doc.contact_id === contactId;
      return nameMatches && contactIdMatches;
    }));
};

const apiRetry = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(listenForApi());
    }, 1000);
  });
};

const listenForApi = async () => {
  console.log('Checking API');
  try {
    await request({ path: '/api/info' });
    console.log('API is up');
  } catch (err) {
    console.log('API check failed, trying again in 1 second');
    console.log(err.message);
    await apiRetry();
  }
};

const dockerComposeCmd = (params) => {
  params = params.split(' ').filter(String);
  const composeFiles = COMPOSE_FILES.map(file => ['-f', getTestComposeFilePath(file)]).flat();
  params.unshift(...composeFiles, '-p', PROJECT_NAME);

  return new Promise((resolve, reject) => {
    const cmd = spawn('docker-compose', params, { env });
    const output = [];
    const log = (data, error) => {
      data = data.toString();
      output.push(data);
      error ? console.error(data) : console.log(data);
    };

    cmd.on('error', (err) => {
      console.error(err);
      reject(err);
    });
    cmd.stdout.on('data', log);
    cmd.stderr.on('data', log);

    cmd.on('close', () => resolve(output));
  });
};

const stopService = async (service) => {
  if (isDocker()) {
    return await dockerComposeCmd(`stop -t 0 ${service}`);
  }
  await saveLogs(); // we lose logs when a pod crashes or is stopped.
  await runCommand(`kubectl ${KUBECTL_CONTEXT} scale deployment cht-${service} --replicas=0`);
  let tries = 100;
  do {
    try {
      await getPodName(service, true);
      await delayPromise(100);
      tries--;
    } catch {
      return;
    }
  } while (tries > 0);
};

const waitForService = async (service) => {
  if (isDocker()) {
    // in Docker, containers start quickly enough that there is no need to check status
    return;
  }

  let tries = 100;
  do {
    try {
      const podName = await getPodName(service, true);
      await runCommand(
        `kubectl ${KUBECTL_CONTEXT} wait --for jsonpath={.status.containerStatuses[0].started}=true ${podName}`,
        true
      );
      return;
    } catch {
      tries--;
      await delayPromise(100);
    }
  } while (tries > 0);
};

const stopSentinel = () => stopService('sentinel');

const startService = async (service) => {
  if (isDocker()) {
    return await dockerComposeCmd(`start ${service}`);
  }
  await runCommand(`kubectl ${KUBECTL_CONTEXT} scale deployment cht-${service} --replicas=1`);
};

const startSentinel = async (listen) => {
  await startService('sentinel');
  listen && await waitForService('sentinel');
};

const stopApi = () => stopService('api');

const startApi = async (listen = true) => {
  await startService('api');
  listen && await listenForApi();
};

const stopHaproxy = () => stopService('haproxy');

const startHaproxy = () => startService('haproxy');

const saveCredentials = (key, password) => {
  const options = {
    path: `/api/v1/credentials/${key}`,
    method: 'PUT',
    body: password,
    json: false,
    headers: {
      'Content-Type': 'text/plain'
    }
  };
  return request(options);
};

const deepFreeze = (obj) => {
  Object
    .keys(obj)
    .filter(prop => typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop]))
    .forEach(prop => deepFreeze(obj[prop]));
  return Object.freeze(obj);
};

// delays executing a function that returns a promise with the provided interval (in ms)
const delayPromise = (promiseFn, interval) => {
  if (typeof promiseFn === 'number') {
    interval = promiseFn;
    promiseFn = () => Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => promiseFn()
      .then(resolve)
      .catch(reject), interval);
  });
};

const setTransitionSeqToNow = () => {
  return Promise.all([
    sentinelDb.get('_local/transitions-seq').catch(() => ({ _id: '_local/transitions-seq' })),
    db.info()
  ]).then(([sentinelMetadata, { update_seq: updateSeq }]) => {
    sentinelMetadata.value = updateSeq;
    return sentinelDb.put(sentinelMetadata);
  });
};

const waitForDocRev = (ids) => {
  ids = ids.map(id => typeof id === 'string' ? { id: id, rev: 1 } : id);

  const validRow = row => {
    if (!row.id || !row.value || !row.value.rev) {
      return false;
    }

    const expectedRev = ids.find(id => id.id === row.id).rev;
    if (!expectedRev) {
      return false;
    }

    const existentRev = row.value.rev.split('-')[0];
    return Number(existentRev) >= Number(expectedRev);
  };

  const opts = {
    path: '/_all_docs',
    body: { keys: ids.map(id => id.id) },
    method: 'POST'
  };

  return requestOnTestDb(opts).then(results => {
    if (results.rows.every(validRow)) {
      return;
    }
    return delayPromise(() => waitForDocRev(ids), 100);
  });
};

const getDefaultSettings = () => {
  const pathToDefaultAppSettings = path.join(__dirname, '../config.default.json');
  return JSON.parse(fs.readFileSync(pathToDefaultAppSettings).toString());
};

const addTranslations = (languageCode, translations = {}) => {
  const builtinTranslations = [
    'bm',
    'en',
    'es',
    'fr',
    'hi',
    'id',
    'ne',
    'sw'
  ];
  const getTranslationsDoc = code => {
    return db.get(`messages-${code}`).catch(err => {
      if (err.status === 404) {
        return {
          _id: `messages-${code}`,
          type: 'translations',
          code: code,
          name: code,
          enabled: true,
          generic: {}
        };
      }
    });
  };

  return getTranslationsDoc(languageCode).then(translationsDoc => {
    if (builtinTranslations.includes(languageCode)) {
      originalTranslations[languageCode] = _.clone(translationsDoc.generic);
    }

    Object.assign(translationsDoc.generic, translations);
    return db.put(translationsDoc);
  });
};

const enableLanguage = (languageCode) => enableLanguages([languageCode]);

const enableLanguages = async (languageCodes) => {
  const { languages } = await getSettings();
  for (const languageCode of languageCodes) {
    const language = languages.find(language => language.locale === languageCode);
    if (language) {
      language.enabled = true;
    } else {
      languages.push({
        locale: languageCode,
        enabled: true,
      });
    }
  }
  await updateSettings({ languages }, true);
};

const getSettings = () => getDoc('settings').then(settings => settings.settings);

const getTemplateComposeFilePath = file => path.resolve(__dirname, '../..', 'scripts', 'build', `${file}.yml.template`);

const getTestComposeFilePath = file => path.resolve(__dirname, `../${file}-test.yml`);

const generateK3DValuesFile = async () => {
  const view = {
    repo: buildVersions.getRepo(),
    tag: buildVersions.getImageTag(),
    db_name: constants.DB_NAME,
    user: constants.USERNAME,
    password: constants.PASSWORD,
    secret: '',
    uuid: '',
    namespace: PROJECT_NAME,
    data_path: K3D_DATA_PATH,
  };

  const templatePath = path.resolve(__dirname, '..', 'helm', `values.yaml.template`);
  const testValuesPath = path.resolve(__dirname, '..', 'helm', `values.yaml`);
  const template = await fs.promises.readFile(templatePath, 'utf-8');
  await fs.promises.writeFile(testValuesPath, mustache.render(template, view));
};

const generateComposeFiles = async () => {
  const view = {
    repo: buildVersions.getRepo(),
    tag: buildVersions.getImageTag(),
    db_name: constants.DB_NAME,
    couchdb_servers: 'couchdb-1.local,couchdb-2.local,couchdb-3.local',
  };

  for (const file of COMPOSE_FILES) {
    const templatePath = getTemplateComposeFilePath(file);
    const testComposePath = getTestComposeFilePath(file);

    const template = await fs.promises.readFile(templatePath, 'utf-8');
    await fs.promises.writeFile(testComposePath, mustache.render(template, view));
  }
};

const runAndLogApiStartupMessage = (msg, func) => {
  console.log(`API startup: ${msg}`);
  return func();
};

const setupSettings = () => {
  const defaultAppSettings = getDefaultSettings();
  defaultAppSettings.transitions = {};

  return request({
    path: '/api/v1/settings?replace=1',
    method: 'PUT',
    body: defaultAppSettings
  });
};

const createLogDir = async () => {
  const logDirPath = path.join(__dirname, '../logs');
  if (fs.existsSync(logDirPath)) {
    await fs.promises.rm(logDirPath, { recursive: true });
  }
  await fs.promises.mkdir(logDirPath);
};

const startServices = async () => {
  env.DB1_DATA = makeTempDir('ci-dbdata');
  env.DB2_DATA = makeTempDir('ci-dbdata');
  env.DB3_DATA = makeTempDir('ci-dbdata');

  await dockerComposeCmd('up -d');
  const services = await dockerComposeCmd('ps -q');
  if (!services.length) {
    throw new Error('Errors when starting services');
  }
};

const runCommand = (command, silent) => {
  const [cmd, ...params] = command.split(' ');
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, params, { env });
    const output = [];
    const log = (data, error) => {
      data = data.toString();
      output.push(data);
      if (!silent) {
        error ? console.error(data) : console.log(data);
      }
    };

    proc.on('error', (err) => {
      console.error(err);
      reject(err);
    });
    proc.stdout.on('data', log);
    proc.stderr.on('data', log);

    proc.on('close', (exitCode) => {
      const outString = output.join('\n');
      return exitCode ? reject(outString) : resolve(outString);
    });
  });
};

const createCluster = async (dataDir) => {
  const hostPort = process.env.NGINX_HTTPS_PORT ? `${process.env.NGINX_HTTPS_PORT}` : '443';
  await runCommand(
    `k3d cluster create ${PROJECT_NAME} ` +
    `--port ${hostPort}:443@loadbalancer ` +
    `--volume ${dataDir}:${K3D_DATA_PATH} --kubeconfig-switch-context=false`
  );
};

const importImages = async () => {
  const allImages = Object
    .keys(SERVICES)
    .map(service => {
      const serviceName = service.replace(/\d/, '');
      return `${buildVersions.getRepo()}/cht-${serviceName}:${buildVersions.getImageTag()}`;
    });
  const images = [...new Set(allImages)];

  for (const image of images) {
    // authentication to private repos is weird to set up in k3d.
    // https://k3d.io/v5.2.0/usage/registries/#authenticated-registries
    try {
      await runCommand(`docker image inspect ${image}`, true);
    } catch {
      await runCommand(`docker pull ${image}`);
    }
    await runCommand(`k3d image import ${image} -c ${PROJECT_NAME}`);
  }
};

const cleanupOldCluster = async () => {
  try {
    await runCommand(`k3d cluster delete ${PROJECT_NAME}`);
  } catch {
    console.warn('No cluster to clean up');
  }
};

const prepK3DServices = async (defaultSettings) => {
  infrastructure = 'k3d';
  await createLogDir();

  const dataDir = makeTempDir('ci-dbdata');
  await fs.promises.mkdir(path.join(dataDir, 'srv1'));
  await fs.promises.mkdir(path.join(dataDir, 'srv2'));
  await fs.promises.mkdir(path.join(dataDir, 'srv3'));

  await cleanupOldCluster();
  await createCluster(dataDir);
  await generateK3DValuesFile();
  await importImages();

  const helmChartPath = path.join(__dirname, '..', 'helm');
  const valesPath = path.join(helmChartPath, 'values.yaml');
  await runCommand(
    `helm install ${PROJECT_NAME} ${helmChartPath} -n ${PROJECT_NAME} `+
    `--kube-context k3d-${PROJECT_NAME} --values ${valesPath} --create-namespace`
  );
  await listenForApi();

  if (defaultSettings) {
    await runAndLogApiStartupMessage('Settings setup', setupSettings);
  }
  await runAndLogApiStartupMessage('User contact doc setup', setUserContactDoc);
};

const prepServices = async (defaultSettings) => {
  await createLogDir();
  await generateComposeFiles();

  updateContainerNames();

  await tearDownServices();
  await startServices();
  await listenForApi();
  if (defaultSettings) {
    await runAndLogApiStartupMessage('Settings setup', setupSettings);
  }
  await runAndLogApiStartupMessage('User contact doc setup', setUserContactDoc);
};

const getLogs = (container) => {
  const logFile = path.resolve(__dirname, '../logs', `${container.replace('pod/', '')}.log`);
  const logWriteStream = fs.createWriteStream(logFile, { flags: 'w' });
  const command = isDocker() ? 'docker' : 'kubectl';

  const params = `logs ${container} ${isK3D() ? KUBECTL_CONTEXT : ''}`.split(' ').filter(Boolean);

  return new Promise((resolve, reject) => {
    const cmd = spawn(command, params);
    cmd.on('error', (err) => {
      console.error('Error while collecting container logs', err);
      reject(err);
    });
    cmd.stdout.pipe(logWriteStream, { end: false });
    cmd.stderr.pipe(logWriteStream, { end: false });

    cmd.on('close', () => {
      resolve();
      logWriteStream.end();
    });
  });
};

const saveLogs = async () => {
  if (isK3D()) {
    const podsList = await runCommand(`kubectl ${KUBECTL_CONTEXT} get pods --no-headers -o name`);
    const pods = podsList.split('\n').filter(name => name);
    for (const podName of pods) {
      await getLogs(podName);
    }
    return;
  }

  for (const containerName of Object.values(CONTAINER_NAMES)) {
    await getLogs(containerName);
  }
};

const tearDownServices = async () => {
  await saveLogs();
  if (!DEBUG) {
    if (isK3D()) {
      return await cleanupOldCluster();
    }
    await dockerComposeCmd('down -t 0 --remove-orphans --volumes');
  }
};

const killSpawnedProcess = (proc) => {
  proc.stdout.destroy();
  proc.stderr.destroy();
  proc.kill('SIGINT');
};

/**
 * Watches a docker or kubernetes container log until at least one line matches one of the given regular expressions.
 *
 * Watch expires after 10 seconds.
 * @param {String} container - name of the container to watch
 * @param {Boolean} tail - when true, log is tailed. when false, whole log is analyzed. Always true for Docker.
 * @param {[RegExp]} regex - matching expression(s) run against lines
 * @returns {Promise<{cancel: function(): void, promise: Promise<void>}>}
 * that contains the promise to resolve when logs lines are matched and a cancel function
 */

const waitForLogs = (container, tail, ...regex) => {
  container = getContainerName(container);
  const cmd = isDocker() ? 'docker' : 'kubectl';
  let timeout;
  let logs = '';
  let firstLine = false;
  tail = (isDocker() || tail) ? '--tail=1': '';

  // It takes a while until the process actually starts tailing logs, and initiating next test steps immediately
  // after watching results in a race condition, where the log is created before watching started.
  // As a fix, watch the logs with tail=1, so we always receive one log line immediately, then proceed with next
  // steps of testing afterward.
  const params = `logs ${container} -f ${tail} ${isK3D() ? KUBECTL_CONTEXT : ''}`.split(' ').filter(Boolean);
  const proc = spawn(cmd, params, { stdio: ['ignore', 'pipe', 'pipe'] });
  let receivedFirstLine;
  const firstLineReceivedPromise = new Promise(resolve => receivedFirstLine = resolve);

  const checkOutput = (data) => {
    if (!firstLine) {
      firstLine = true;
      receivedFirstLine();
      return;
    }

    data = data.toString();
    logs += data;
    const lines = data.split('\n');
    const matchingLine = lines.find(line => regex.find(r => r.test(line)));
    return matchingLine;
  };

  const promise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      console.log('Found logs', logs, 'did not match expected regex:', ...regex);
      reject(new Error('Timed out looking for details in logs.'));
      killSpawnedProcess(proc);
    }, 20000);

    const check = data => {
      const foundMatch = checkOutput(data);
      if (foundMatch || !regex.length) {
        resolve();
        clearTimeout(timeout);
        killSpawnedProcess(proc);
      }
    };

    proc.stdout.on('data', check);
    proc.stderr.on('data', check);
  });

  return firstLineReceivedPromise.then(() => ({
    promise,
    cancel: () => {
      clearTimeout(timeout);
      killSpawnedProcess(proc);
    }
  }));
};

const waitForApiLogs = (...regex) => waitForLogs('api', true, ...regex);
const waitForSentinelLogs = (tail, ...regex) => waitForLogs('sentinel', tail, ...regex);
/**
 * Collector that listens to the given container logs and collects lines that match at least one of the
 * given regular expressions
 *
 * To use, call before the action you wish to catch, and then execute the returned function after
 * the action should have taken place. The function will return a promise that will succeed with
 * the list of captured lines, or fail if there have been any errors with log capturing.
 *
 * @param      {string}    container    container name
 * @param      {[RegExp]}  regex        matching expression(s) run against lines
 * @return     {Promise<function>}      promise that returns a function that returns a promise
 */
const collectLogs = (container, ...regex) => {
  container = getContainerName(container);
  const cmd = isDocker() ? 'docker' : 'kubectl';
  const matches = [];
  const errors = [];
  let logs = '';

  // It takes a while until the process actually starts tailing logs, and initiating next test steps immediately
  // after watching results in a race condition, where the log is created before watching started.
  // As a fix, watch the logs with tail=1, so we always receive one log line immediately, then proceed with next
  // steps of testing afterward.
  const params = `logs ${container} -f --tail=1 ${isK3D() ? KUBECTL_CONTEXT : ''}`.split(' ').filter(Boolean);
  const proc = spawn(cmd, params, { stdio: ['ignore', 'pipe', 'pipe'] });
  let receivedFirstLine;
  const firstLineReceivedPromise = new Promise(resolve => receivedFirstLine = resolve);

  proc.stdout.on('data', (data) => {
    receivedFirstLine();
    data = data.toString();
    logs += data;
    const lines = data.split('\n');
    lines.forEach(line => regex.forEach(r => r.test(line) && matches.push(line)));
  });
  proc.stderr.on('err', err => {
    receivedFirstLine();
    errors.push(err.toString());
  });

  proc.on('error', err => {
    receivedFirstLine();
    errors.push(err.toString());
  });

  const collect = () => {
    if (errors.length) {
      const error = new Error('CollectLogs errored');
      error.errors = errors;
      error.logs = logs;
      return Promise.reject(error);
    }

    return Promise.resolve(matches);
  };

  return firstLineReceivedPromise.then(() => collect);
};

const collectSentinelLogs = (...regex) => collectLogs('sentinel', ...regex);

const collectApiLogs = (...regex) => collectLogs('api', ...regex);

const collectHaproxyLogs = (...regex) => collectLogs('haproxy', ...regex);

const normalizeTestName = name => name.replace(/\s/g, '_');

const apiLogTestStart = (name) => {
  return requestOnTestDb(`/?start=${normalizeTestName(name)}`)
    .catch(() => console.warn('Error logging test start - ignoring'));
};

const apiLogTestEnd = (name) => {
  return requestOnTestDb(`/?end=${normalizeTestName(name)}`)
    .catch(() => console.warn('Error logging test end - ignoring'));
};

const getDockerVersion = () => {
  try {
    const response = execSync('docker-compose -v').toString();
    const version = response.match(semver.re[3])[0];
    return semver.major(version);
  } catch (err) {
    console.error(err);
    return 1;
  }
};

const updateContainerNames = (project = PROJECT_NAME) => {
  dockerVersion = dockerVersion || getDockerVersion();

  Object.entries(SERVICES).forEach(([key, service]) => {
    CONTAINER_NAMES[key] = getContainerName(service, project);
  });
  CONTAINER_NAMES.upgrade = getContainerName('cht-upgrade-service', 'upgrade');
};
const getContainerName = (service, project = PROJECT_NAME) => {
  if (isDocker()) {
    dockerVersion = dockerVersion || getDockerVersion();
    const separator = dockerVersion === 2 ? '-' : '_';
    return `${project}${separator}${service}${separator}1`;
  }

  return `deployment/cht-${service}`;
};

const getUpdatedPermissions  = async (roles, addPermissions, removePermissions) => {
  const settings = await getSettings();
  addPermissions.forEach(permission => {
    if (!settings.permissions[permission]) {
      settings.permissions[permission] = [];
    }
    settings.permissions[permission].push(...roles);
  });

  (removePermissions || []).forEach(permission => settings.permissions[permission] = []);
  return settings.permissions;
};

const updatePermissions = async (roles, addPermissions, removePermissions, ignoreReload) => {
  const permissions = await getUpdatedPermissions(roles, addPermissions, removePermissions);
  await updateSettings({ permissions }, ignoreReload);
};

const getSentinelDate = () => getContainerDate('sentinel');
const getPodName = async (service, silent) => {
  const cmd = await runCommand(
    `kubectl get pods ${KUBECTL_CONTEXT} -l cht.service=${service} --field-selector=status.phase==Running -o name`,
    silent
  );
  return cmd.replace(/[^A-Za-z0-9-/]/g, '');
};

const getContainerDate = async (container) => {
  let date;
  if (isDocker()) {
    container = getContainerName(container);
    date = await runCommand(`docker exec ${container} date -R`);
  } else {
    const podName = await getPodName(container);
    date = await runCommand(`kubectl exec ${KUBECTL_CONTEXT} ${podName} -- date -R`);
  }
  return moment.utc(date);
};

const logFeedbackDocs = async (test) => {
  const feedBackDocs = await chtDbUtils.getFeedbackDocs();
  const newFeedbackDocs = feedBackDocs.filter(doc => !existingFeedbackDocIds.includes(doc._id));
  if (!newFeedbackDocs.length) {
    return false;
  }

  const filename = `feedbackDocs-${test.parent} ${test.title}.json`.replace(/\s/g, '-');
  const filePath = path.resolve(__dirname, '..', 'logs', filename);
  fs.writeFileSync(filePath, JSON.stringify(newFeedbackDocs, null, 2));
  existingFeedbackDocIds.push(...newFeedbackDocs.map(doc => doc._id));

  return true;
};

const isMinimumChromeVersion = process.env.CHROME_VERSION === MINIMUM_BROWSER_VERSION;

const escapeBranchName = (branch) => branch?.replace(/[/|_]/g, '-');

module.exports = {
  db,
  sentinelDb,
  logsDb,
  usersDb,

  SW_SUCCESSFUL_REGEX,
  ONE_YEAR_IN_S,
  PROJECT_NAME,
  makeTempDir,
  hostURL,
  parseCookieResponse,
  setupUserDoc,
  request,
  requestOnTestDb,
  requestOnTestMetaDb,
  requestOnMedicDb,
  saveDoc,
  saveDocs,
  saveDocsRevs,
  saveDocIfNotExists,
  saveMetaDocs,
  getDoc,
  getDocs,
  getMetaDocs,
  deleteDoc,
  deleteDocs,
  deleteAllDocs,
  updateSettings,
  revertSettings,
  seedTestData,
  revertDb,
  getOrigin,
  getBaseUrl,
  getAdminBaseUrl,
  deleteUsers,
  getCreatedUsers,
  createUsers,
  getUserSettings,
  listenForApi,
  stopSentinel,
  startSentinel,
  stopApi,
  startApi,
  stopHaproxy,
  startHaproxy,
  saveCredentials,
  deepFreeze,
  delayPromise,
  setTransitionSeqToNow,
  waitForDocRev,
  getDefaultSettings,
  addTranslations,
  enableLanguage,
  enableLanguages,
  getSettings,
  prepServices,
  prepK3DServices,
  tearDownServices,
  waitForApiLogs,
  waitForSentinelLogs,
  collectSentinelLogs,
  collectApiLogs,
  collectHaproxyLogs,
  apiLogTestStart,
  apiLogTestEnd,
  updateContainerNames,
  updatePermissions,
  getUpdatedPermissions,
  formDocProcessing,
  getSentinelDate,
  logFeedbackDocs,
  isMinimumChromeVersion,
  escapeBranchName,
  isK3D,
};
