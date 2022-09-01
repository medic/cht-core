/* eslint-disable no-console */

const _ = require('lodash');
const auth = require('./auth')();
const constants = require('./constants');
const rpn = require('request-promise-native');
const htmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter');
const specReporter = require('jasmine-spec-reporter').SpecReporter;
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const mustache = require('mustache');

process.env.API_PORT = constants.API_PORT;
process.env.COUCH_PORT = constants.COUCH_PORT;
process.env.COUCHDB_USER = auth.username;
process.env.COUCHDB_PASSWORD = auth.password;
process.env.CERTIFICATE_MODE = constants.CERTIFICATE_MODE;
process.env.NODE_TLS_REJECT_UNAUTHORIZED=0; // allow self signed certificates

const CONTAINER_NAMES = {
  haproxy: 'cht-haproxy-e2e',
  nginx: 'cht-nginx-e2e',
  couch1: 'cht-couchdb.1-e2e',
  couch2: 'cht-couchdb.2-e2e',
  couch3: 'cht-couchdb.3-e2e',
  api: 'cht-api-e2e',
  sentinel: 'cht-sentinel-e2e',
  haproxy_healthcheck: 'cht-haproxy-healthcheck-e2e',
  upgrade: 'cht-upgrade-service'
};

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
const db = new PouchDB(`http://${constants.API_HOST}/${constants.DB_NAME}`, { auth });
const sentinel = new PouchDB(`http://${constants.API_HOST}/${constants.DB_NAME}-sentinel`, { auth });
const medicLogs = new PouchDB(`http://${constants.API_HOST}/${constants.DB_NAME}-logs`, { auth });
let browserLogStream;
const userSettings = require('./factories/cht/users/user-settings');
const buildVersions = require('../scripts/build/versions');

let originalSettings;
const originalTranslations = {};
let e2eDebug;
const hasModal = () => element(by.css('#update-available')).isPresent();
const COUCH_USER_ID_PREFIX = 'org.couchdb.user:';

const COMPOSE_FILES = ['cht-core', 'cht-couchdb-cluster'];
const getTemplateComposeFilePath = file => path.resolve(__dirname, '..', 'scripts', 'build', `${file}.yml.template`);
const getTestComposeFilePath = file => path.resolve(__dirname, `${file}-test.yml`);

// First Object is passed to http.request, second is for specific options / flags
// for this wrapper
const request = (options, { debug } = {}) => {
  options = typeof options === 'string' ? { path: options } : _.clone(options);
  if (!options.noAuth) {
    options.auth = options.auth || auth;
  }
  options.uri = options.uri || `https://${constants.API_HOST}${options.path}`;
  options.json = options.json === undefined ? true : options.json;

  if (debug) {
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log(JSON.stringify(options, null, 2));
    console.log('!!!!!!!REQUEST!!!!!!!');
    console.log('!!!!!!!REQUEST!!!!!!!');
  }

  options.transform = (body, response, resolveWithFullResponse) => {
    // we might get a json response for a non-json request.
    const contentType = response.headers['content-type'];
    if (contentType && contentType.startsWith('application/json') && !options.json) {
      response.body = JSON.parse(response.body);
    }
    // return full response if `resolveWithFullResponse` or if non-2xx status code (so errors can be inspected)
    return resolveWithFullResponse || !(/^2/.test('' + response.statusCode)) ? response : response.body;
  };

  return rpn(options).catch(err => {
    err.responseBody = err.response && err.response.body;
    debug && console.warn(`A request error occurred ${err.options.uri}`);
    throw err;
  });
};

// Update both ddocs, to avoid instability in tests.
// Note that API will be copying changes to medic over to medic-client, so change
// medic-client first (api does nothing) and medic after (api copies changes over to
// medic-client, but the changes are already there.)
const updateSettings = updates => {
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

const revertTranslations = async () => {
  const updatedTranslations = Object.keys(originalTranslations);
  if (!updatedTranslations.length) {
    return Promise.resolve();
  }

  const docs = await module.exports.getDocs(updatedTranslations.map(code => `messages-${code}`));
  docs.forEach(doc => {
    doc.generic = Object.assign(doc.generic, originalTranslations[doc.code]);
    delete originalTranslations[doc.code];
  });

  await module.exports.requestOnTestDb({
    path: '/_bulk_docs',
    method: 'POST',
    body: { docs },
  });
};

const revertSettings = () => {
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

const PERMANENT_TYPES = ['translations', 'translations-backup', 'user-settings', 'info'];

const deleteAll = (except) => {
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
    /^form:contact:/,
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

  // Get, filter and delete documents
  return module.exports
    .requestOnTestDb({
      path: '/_all_docs?include_docs=true',
      method: 'GET',
    })
    .then(({ rows }) =>
      rows
        .filter(({ doc }) => doc && !ignoreFns.find(fn => fn(doc)))
        .map(({ doc }) => {
          doc._deleted = true;
          doc.type = 'tombstone'; // circumvent tombstones being created when DB is cleaned up
          return doc;
        })
    )
    .then(toDelete => {
      const ids = toDelete.map(doc => doc._id);
      if (e2eDebug) {
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
            if (e2eDebug) {
              console.log(`Deleted docs: ${JSON.stringify(response)}`);
            }
          }),
        module.exports.sentinelDb.allDocs({ keys: infoIds })
          .then(results => {
            const deletes = results.rows
              .filter(row => row.value) // Not already deleted
              .map(({ id, value }) => ({
                _id: id,
                _rev: value.rev,
                _deleted: true
              }));

            return module.exports.sentinelDb.bulkDocs(deletes);
          }).then(response => {
            if (e2eDebug) {
              console.log(`Deleted sentinel docs: ${JSON.stringify(response)}`);
            }
          })
      ]);
    });
};

const refreshToGetNewSettings = () => {
  // wait for the updates to replicate
  const dialog = element(by.css('#update-available .submit:not(.disabled)'));
  return browser
    .wait(protractor.ExpectedConditions.elementToBeClickable(dialog), 10000)
    .then(() => dialog.click())
    .catch(() => {
      // sometimes there's a double update which causes the dialog to be redrawn
      // retry with the new dialog
      return dialog.isPresent().then((isPresent) => {
        return isPresent && dialog.click();
      });
    })
    .then(() => {
      return browser.wait(
        protractor.ExpectedConditions.elementToBeClickable(
          element(by.id('contacts-tab'))
        ),
        10000,
        'Second refresh to get settings'
      );
    });
};

const closeReloadModal = () => {
  const dialog = element(by.css('#update-available .btn.cancel:not(.disabled)'));
  return browser
    .wait(protractor.ExpectedConditions.elementToBeClickable(dialog), 10000)
    .then(() => dialog.click());
};

const setUserContactDoc = (attempt=0) => {
  const {
    USER_CONTACT_ID: docId,
    DEFAULT_USER_CONTACT_DOC: defaultDoc
  } = constants;

  return db
    .get(docId)
    .catch(() => ({}))
    .then(existing => Object.assign(defaultDoc, { _rev: existing && existing._rev }))
    .then(newDoc => db.put(newDoc))
    .catch(err => {
      if (attempt > 3) {
        throw err;
      }
      return setUserContactDoc(attempt + 1);
    });
};

const revertDb = async (except, ignoreRefresh) => {
  const watcher = ignoreRefresh && await waitForSettingsUpdateLogs();
  const needsRefresh = await revertSettings();
  await deleteAll(except);
  await revertTranslations();

  // only refresh if the settings were changed or modal was already present and we're not explicitly ignoring
  if (!ignoreRefresh && (needsRefresh || await hasModal())) {
    watcher && watcher.cancel();
    await refreshToGetNewSettings();
  } else if (needsRefresh) {
    await watcher && watcher.promise;
  } else {
    watcher && watcher.cancel();
  }

  await setUserContactDoc();
};

const getCreatedUsers = async () => {
  const adminUserId = COUCH_USER_ID_PREFIX + auth.username;
  const users = await request({ path: `/_users/_all_docs?start_key="${COUCH_USER_ID_PREFIX}"` });
  return users.rows
    .filter(user => user.id !== adminUserId)
    .map((user) => ({ ...user, username: user.id.replace(COUCH_USER_ID_PREFIX, '') }));
};

const deleteUsers = async (users, meta = false) => {
  if (!users.length) {
    return;
  }

  const usernames = users.map(user => COUCH_USER_ID_PREFIX + user.username);
  const userDocs = await request({ path: '/_users/_all_docs', method: 'POST', body: { keys: usernames } });
  const medicDocs = await request({
    path: `/${constants.DB_NAME}/_all_docs`,
    method: 'POST',
    body: { keys: usernames }
  });
  const toDelete = userDocs.rows
    .map(row => row.value && ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
    .filter(stub => stub);
  const toDeleteMedic = medicDocs.rows
    .map(row => row.value && ({ _id: row.id, _rev: row.value.rev, _deleted: true }))
    .filter(stub => stub);

  await Promise.all([
    request({ path: '/_users/_bulk_docs', method: 'POST', body: { docs: toDelete } }),
    request({ path: `/${constants.DB_NAME}/_bulk_docs`, method: 'POST', body: { docs: toDeleteMedic } }),
  ]);

  if (!meta) {
    return;
  }

  for (const user of users) {
    await request({ path: `/${constants.DB_NAME}-user-${user.username}-meta`, method: 'DELETE' });
  }
};

const createUsers = async (users, meta = false) => {
  const createUserOpts = {
    path: '/api/v1/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  for (const user of users) {
    await request(Object.assign({ body: user }, createUserOpts));
  }

  await module.exports.delayPromise(1000);

  if (!meta) {
    return;
  }

  for (const user of users) {
    await request({ path: `/${constants.DB_NAME}-user-${user.username}-meta`, method: 'PUT' });
  }
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

  return module.exports.requestOnTestDb(opts).then(results => {
    if (results.rows.every(validRow)) {
      return;
    }
    return module.exports.delayPromise(() => waitForDocRev(ids), 100);
  });
};

const getDefaultSettings = () => {
  const pathToDefaultAppSettings = path.join(__dirname, './config.default.json');
  return JSON.parse(fs.readFileSync(pathToDefaultAppSettings).toString());
};

const deprecated = (name, replacement) => {
  let msg = `The function ${name} has been deprecated.`;
  if (replacement) {
    msg = `${msg} Replace by ${replacement}`;
  }
  if (process.env.DEBUG) {
    console.warn(msg);
  }
};

const waitForSettingsUpdateLogs = (type) => {
  if (type === 'sentinel') {
    return module.exports.waitForSentinelLogs(/Reminder messages allowed between/);
  }

  return module.exports.waitForApiLogs(/Settings updated/);
};

const killSpawnedProcess = (proc) => {
  proc.stdout.destroy();
  proc.stderr.destroy();
  proc.kill('SIGINT');
};

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
  const matches = [];
  const errors = [];
  let logs = '';

  // It takes a while until the process actually starts tailing logs, and initiating next test steps immediately
  // after watching results in a race condition, where the log is created before watching started.
  // As a fix, watch the logs with tail=1, so we always receive one log line immediately, then proceed with next
  // steps of testing afterwards.
  const params = `logs ${container} -f --tail=1`;
  const proc = spawn('docker', params.split(' '), { stdio: ['ignore', 'pipe', 'pipe'] });
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

  const collect = () => {
    killSpawnedProcess(proc);

    if (errors.length) {
      return Promise.reject({ message: 'CollectLogs errored', errors, logs });
    }

    return Promise.resolve(matches);
  };

  return firstLineReceivedPromise.then(() => collect);
};


/**
 * Watches a docker log until at least one line matches one of the given regular expressions.
 * Watch expires after 10 seconds.
 * @param {String} container - name of the container to watch
 * @param {[RegExp]} regex - matching expression(s) run against lines
 * @returns {Promise<Object>} that contains the promise to resolve when logs lines are matched and a cancel function
 */
const waitForDockerLogs = (container, ...regex) => {
  let timeout;
  let logs = '';
  let firstLine = false;

  // It takes a while until the process actually starts tailing logs, and initiating next test steps immediately
  // after watching results in a race condition, where the log is created before watching started.
  // As a fix, watch the logs with tail=1, so we always receive one log line immediately, then proceed with next
  // steps of testing afterwards.
  const params = `logs ${container} -f --tail=1`;
  const proc = spawn('docker', params.split(' '), { stdio: ['ignore', 'pipe', 'pipe'] });
  let receivedFirstLine;
  const firstLineReceivedPromise = new Promise(resolve => receivedFirstLine = resolve);

  const promise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      console.log('Found logs', logs, 'watched for', ...regex);
      reject(new Error('Timed out looking for details in logs.'));
      killSpawnedProcess(proc);
    }, 6000);

    const checkOutput = (data) => {
      if (!firstLine) {
        firstLine = true;
        receivedFirstLine();
        return;
      }

      data = data.toString();
      logs += data;
      const lines = data.split('\n');
      if (lines.find(line => regex.find(r => r.test(line)))) {
        resolve();
        clearTimeout(timeout);
        killSpawnedProcess(proc);
      }
    };

    proc.stdout.on('data', checkOutput);
    proc.stderr.on('data', checkOutput);
  });

  return firstLineReceivedPromise.then(() => ({
    promise,
    cancel: () => {
      clearTimeout(timeout);
      killSpawnedProcess(proc);
    }
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

const saveBrowserLogs = () => {
  // wdio also writes in this file
  if (!browserLogStream) {
    browserLogStream = fs.createWriteStream(__dirname + '/../tests/logs/browser.console.log');
  }

  return browser
    .manage()
    .logs()
    .get('browser')
    .then(logs => {
      const currentSpec = jasmine.currentSpec.fullName;
      browserLogStream.write(`\n~~~~~~~~~~~ ${currentSpec} ~~~~~~~~~~~~~~~~~~~~~\n\n`);
      logs
        .map(log => `[${log.level.name_}] ${log.message}\n`)
        .forEach(log => browserLogStream.write(log));
      browserLogStream.write('\n~~~~~~~~~~~~~~~~~~~~~\n\n');
    });
};

const generateComposeFiles = async () => {
  const view = {
    repo: buildVersions.getRepo(),
    tag: buildVersions.getImageTag(),
    network: 'cht-net-e2e',
    couch1_container_name: CONTAINER_NAMES.couch1,
    couch2_container_name: CONTAINER_NAMES.couch2,
    couch3_container_name: CONTAINER_NAMES.couch3,
    haproxy_container_name: CONTAINER_NAMES.haproxy,
    nginx_container_name: CONTAINER_NAMES.nginx,
    api_container_name: CONTAINER_NAMES.api,
    sentinel_container_name: CONTAINER_NAMES.sentinel,
    haproxy_healthcheck_container_name: CONTAINER_NAMES.haproxy_healthcheck,
    db_name: 'medic-test',
    couchdb_servers: 'couchdb.1,couchdb.2,couchdb.3',
  };

  for (const file of COMPOSE_FILES) {
    const templatePath = getTemplateComposeFilePath(file);
    const testComposePath = getTestComposeFilePath(file);

    const template = await fs.promises.readFile(templatePath, 'utf-8');
    await fs.promises.writeFile(testComposePath, mustache.render(template, view));
  }
};

const prepServices = async (defaultSettings) => {
  await generateComposeFiles();

  await stopServices(true);
  await startServices();
  await listenForApi();
  if (defaultSettings) {
    await runAndLogApiStartupMessage('Settings setup', setupSettings);
  }
  await runAndLogApiStartupMessage('User contact doc setup', setUserContactDoc);
};

const dockerComposeCmd = (...params) => {
  const composeFilesParam = COMPOSE_FILES
    .map(file => ['-f', getTestComposeFilePath(file)])
    .flat();

  return new Promise((resolve, reject) => {
    const cmd = spawn('docker-compose', [ ...composeFilesParam, ...params ]);
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

const getDockerLogs = (container) => {
  const logFile = path.resolve(__dirname, 'logs', `${container}.log`);
  const logWriteStream = fs.createWriteStream(logFile, { flags: 'w' });

  return new Promise((resolve, reject) => {
    const cmd = spawn('docker', ['logs', container]);

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
  for (const containerName of Object.values(CONTAINER_NAMES)) {
    await getDockerLogs(containerName);
  }
};

const startServices = async () => {
  await dockerComposeCmd('up', '-d');
  const services = await dockerComposeCmd('ps', '-q');
  if (!services.length) {
    throw new Error('Errors when starting services');
  }
};

const stopServices = async (removeOrphans) => {
  if (removeOrphans) {
    return dockerComposeCmd('down', '--remove-orphans', '--volumes');
  }
  await saveLogs();
};
const startService = async (service) => {
  await dockerComposeCmd('start', `cht-${service}`);
};

const stopService = async (service) => {
  await dockerComposeCmd('stop', '-t', 0, `cht-${service}`);
};

const protractorLogin = async (browser, timeout = 20) => {
  await browser.driver.get(module.exports.getLoginUrl());
  await browser.driver.findElement(by.name('user')).sendKeys(auth.username);
  await browser.driver.findElement(by.name('password')).sendKeys(auth.password);
  await browser.driver.findElement(by.id('login')).click();
  // Login takes some time, so wait until it's done.
  const bootstrappedCheck = () =>
    element(by.css('.app-root.bootstrapped')).isPresent();
  return browser.driver.wait(
    bootstrappedCheck,
    timeout * 1000,
    `Login should be complete within ${timeout} seconds`
  );
};

const setupUser = () => {
  return module.exports.setupUserDoc()
    .then(() => refreshToGetNewSettings())
    .then(() => module.exports.closeTour());
};

const setupUserDoc = (userName = auth.username, userDoc = userSettings.build()) => {
  return module.exports.getDoc(COUCH_USER_ID_PREFIX + userName)
    .then(doc => {
      const finalDoc = Object.assign(doc, userDoc);
      return module.exports.saveDoc(finalDoc);
    });
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

const dockerGateway = () => {
  try {
    return JSON.parse(execSync(`docker network inspect cht-net-e2e --format='{{json .IPAM.Config}}'`));
  } catch (error) {
    console.log('docker network inspect failed. NOTE this error is not relevant if running outside of docker');
    console.log(error.message);
  }
};

const hostURL = (port = 80) => {
  const gateway = dockerGateway();
  const host = gateway && gateway[0] && gateway[0].Gateway ? gateway[0].Gateway : 'localhost';
  const url = new URL(`http://${host}`);
  url.port = port;
  return url.href;
};

const formDocProcessing = async (docs) => {
  if (!Array.isArray(docs)) {
    docs = [docs];
  }

  const formsWatchers = docs
    .filter(doc => doc.type === 'form')
    .map(doc => new RegExp(`Form with ID "${doc._id}" does not need to be updated`))
    .map(re => module.exports.waitForApiLogs(re));

  const waitForForms = await Promise.all(formsWatchers);

  return {
    promise:() => Promise.all(waitForForms.map(wait => wait.promise)),
    cancel: () => waitForForms.forEach(wait => wait.cancel),
  };
};

module.exports = {
  hostURL,
  parseCookieResponse,
  deprecated,
  db: db,
  sentinelDb: sentinel,
  medicLogsDb: medicLogs,
  setupUserDoc,
  request: request,

  reporter: new htmlScreenshotReporter({
    reportTitle: 'e2e Test Report',
    inlineImages: true,
    showConfiguration: true,
    captureOnlyFailedSpecs: true,
    reportOnlyFailedSpecs: false,
    showQuickLinks: true,
    dest: `tests/results/`,
    filename: 'report.html',
    pathBuilder: function (currentSpec) {
      return currentSpec.fullName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
    },
  }),

  specReporter: new specReporter({
    spec: {
      displayStacktrace: 'raw',
      displayDuration: true
    }
  }),

  /*
   this is kind of a hack
   but you can now access the current running spec in beforeEach / afterEach / etc by accessing jasmine.currentSpec
   the value looks like :
   type Result {
    id: 'spec0',
    description: 'This string is the title of your `it` block',
    fullName: 'This is the full title derived from nested `describe` and `it`s that you have created',
    failedExpectations: [], - possibly has contents during `afterEach` / `afterAll`
    passedExpectations: [], - possibly has contents during `afterEach` / `afterAll`
    pendingReason: '',
    testPath: '/path/to/the/spec/file/of/this/test.js'
   }
   */
  currentSpecReporter: {
    specStarted: result => {
      jasmine.currentSpec = result;
      return module.exports.apiLogTestStart(jasmine.currentSpec.fullName);
    },
    specDone: result => {
      jasmine.currentSpec = result;
      return module.exports.apiLogTestEnd(jasmine.currentSpec.fullName);
    },
  },

  requestOnTestDb: (options, debug) => {
    if (typeof options === 'string') {
      options = {
        path: options,
      };
    }

    const pathAndReqType = `${options.path}${options.method}`;
    if (pathAndReqType !== '/GET') {
      options.path = '/' + constants.DB_NAME + (options.path || '');
    }
    return request(options, { debug });
  },

  requestOnTestMetaDb: (options, debug) => {
    if (typeof options === 'string') {
      options = {
        path: options,
      };
    }
    options.path = `/${constants.DB_NAME}-user-${options.userName}-meta${options.path || ''}`;
    return request(options, { debug: debug });
  },

  requestOnMedicDb: (options, debug) => {
    if (typeof options === 'string') {
      options = { path: options };
    }
    options.path = `/medic${options.path || ''}`;
    return request(options, { debug: debug });
  },

  saveDoc: async doc => {
    const waitForForms = await formDocProcessing(doc);
    try {
      const result = module.exports.requestOnTestDb({
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
  },

  saveDocs: async docs => {
    const waitForForms = await formDocProcessing(docs);
    const results = await module.exports.requestOnTestDb({
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
  },

  saveMetaDocs: (user, docs) => {
    const options = {
      userName: user,
      method: 'POST',
      body: { docs: docs },
      path: '/_bulk_docs',
    };
    return module.exports
      .requestOnTestMetaDb(options)
      .then(results => {
        if (results.find(r => !r.ok)) {
          throw Error(JSON.stringify(results, null, 2));
        }
        return results;
      });
  },

  getDoc: (id, rev) => {
    const params = {};
    if (rev) {
      params.rev = rev;
    }

    return module.exports.requestOnTestDb({
      path: `/${id}`,
      method: 'GET',
      params,
    });
  },

  getDocs: (ids, fullResponse = false) => {
    return module.exports
      .requestOnTestDb({
        path: `/_all_docs?include_docs=true`,
        method: 'POST',
        body: { keys: ids || [] },
      })
      .then(response => {
        return fullResponse ? response : response.rows.map(row => row.doc);
      });
  },

  getMetaDocs: (user, ids, fullResponse = false) => {
    const options = {
      userName: user,
      method: 'POST',
      body: { keys: ids || [] },
      path: '/_all_docs?include_docs=true',
    };
    return module.exports
      .requestOnTestMetaDb(options)
      .then(response => fullResponse ? response : response.rows.map(row => row.doc));
  },

  deleteDoc: id => {
    return module.exports.getDoc(id).then(doc => {
      doc._deleted = true;
      return module.exports.saveDoc(doc);
    });
  },

  deleteDocs: ids => {
    return module.exports.getDocs(ids).then(docs => {
      docs = docs.filter(doc => !!doc);
      if (docs.length) {
        docs.forEach(doc => doc._deleted = true);
        return module.exports.requestOnTestDb({
          path: '/_bulk_docs',
          method: 'POST',
          body: { docs },
        });
      }
    });
  },

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
  deleteAllDocs: deleteAll,

  /*
   * Sets the document referenced by the user's org.couchdb.user document to a default value
   */
  setUserContactDoc,

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
  updateSettings: async (updates, ignoreReload) => {
    const watcher = ignoreReload &&
      Object.keys(updates).length &&
      await waitForSettingsUpdateLogs(ignoreReload);
    await updateSettings(updates);
    if (!ignoreReload) {
      return await refreshToGetNewSettings();
    }
    return watcher && await watcher.promise;
  },
  /**
   * Revert settings and refresh if required
   *
   * @param {Boolean|String} ignoreRefresh if false, will wait for reload modal and reload. if true, will tail api logs
   *                                       and resolve when new settings are loaded.
   * @return {Promise}       completion promise
   */
  revertSettings: async ignoreRefresh => {
    const watcher = ignoreRefresh && await waitForSettingsUpdateLogs();
    const needsRefresh = await revertSettings();

    if (!ignoreRefresh) {
      return await refreshToGetNewSettings();
    }

    if (!needsRefresh) {
      watcher && watcher.cancel();
      return;
    }

    return await watcher.promise;
  },

  seedTestData: (userContactDoc, documents) => {
    return module.exports
      .saveDocs(documents)
      .then(() => module.exports.getDoc(constants.USER_CONTACT_ID))
      .then(existingContactDoc => {
        if (userContactDoc) {
          Object.assign(existingContactDoc, userContactDoc);
          return module.exports.saveDoc(existingContactDoc);
        }
      });
  },
  /**
   * Cleans up DB after each test. Works with the given callback
   * and also returns a promise - pick one!
   */
  afterEach: () => revertDb(),

  //check for the update modal before
  beforeEach: async () => {
    if (await element(by.css('#update-available')).isPresent()) {
      await $('body').sendKeys(protractor.Key.ENTER);
    }
  },

  /**
   * Reverts the db's settings and documents
   *
   * @param  {Array}            except       documents to ignore, see deleteAllDocs
   * @param  {Boolean|String}  ignoreRefresh if false, will wait for reload modal and reload. if true, will tail api
   *                                         logs and resolve when new settings are loaded.
   * @return {Promise}
   */
  revertDb: revertDb,
  resetBrowser: () => {
    return browser.driver
      .navigate()
      .refresh()
      .then(() => {
        return browser.wait(() => {
          return element(by.css('#messages-tab')).isPresent();
        }, 10000, 'Timed out waiting for browser to reset. Looking for element #messages-tab');
      });
  },
  resetBrowserNative: (element = $('#messages-tab'), time = 10000) => {
    return browser.driver
      .navigate()
      .refresh()
      .then(() => {
        return browser.wait(() => {
          return element.isPresent();
        }, time, 'Timed out waiting for browser to reset. Looking for element #messages-tab');
      });
  },

  countOf: count => {
    return c => {
      return c === count;
    };
  },

  getCouchUrl: () =>
    `http://${auth.username}:${auth.password}@${constants.COUCH_HOST}:${constants.COUCH_PORT}/${constants.DB_NAME}`,

  getInstanceUrl: () =>
    `http://${auth.username}:${auth.password}@${constants.API_HOST}`,

  getOrigin: () =>
    `http://${constants.API_HOST}`,

  getBaseUrl: () =>
    `http://${constants.API_HOST}/#/`,

  getAdminBaseUrl: () =>
    `http://${constants.API_HOST}/admin/#/`,

  getLoginUrl: () =>
    `https://${constants.API_HOST}/${constants.DB_NAME}/login`,

  // Deletes _users docs and medic/user-settings docs for specified users
  // @param {Array} usernames - list of users to be deleted
  // @param {Boolean} meta - if true, deletes meta db-s as well, default true
  // @return {Promise}
  deleteUsers: deleteUsers,
  getCreatedUsers,

  // Creates users - optionally also creating their meta dbs
  // @param {Array} users - list of users to be created
  // @param {Boolean} meta - if true, creates meta db-s as well, default false
  // @return {Promise}
  createUsers: createUsers,

  setDebug: debug => e2eDebug = debug,

  stopSentinel: () => stopService('sentinel'),
  startSentinel: () => startService('sentinel'),

  saveCredentials: (key, password) => {
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
  },

  // delays executing a function that returns a promise with the provided interval (in ms)
  delayPromise: (promiseFn, interval) => {
    if (typeof promiseFn === 'number') {
      interval = promiseFn;
      promiseFn = () => Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => promiseFn().then(resolve).catch(reject), interval);
    });
  },

  setTransitionSeqToNow: () => {
    return Promise.all([
      sentinel.get('_local/transitions-seq').catch(() => ({ _id: '_local/transitions-seq' })),
      db.info()
    ]).then(([sentinelMetadata, { update_seq: updateSeq }]) => {
      sentinelMetadata.value = updateSeq;
      return sentinel.put(sentinelMetadata);
    });
  },
  refreshToGetNewSettings: refreshToGetNewSettings,
  closeReloadModal: closeReloadModal,

  closeTour: async () => {
    const closeButton = element(by.css('#tour-select a.btn.cancel'));
    try {
      await browser.wait(protractor.ExpectedConditions.visibilityOf(closeButton), 10000);
      await browser.wait(protractor.ExpectedConditions.elementToBeClickable(closeButton), 1000);
      await closeButton.click();
      // wait for the request to the server to execute
      // is there a way to leverage protractor to achieve this???
      await browser.sleep(500);
    } catch (err) {
      // there might not be a tour, show a warning
      console.warn('Tour modal has not appeared after 2 seconds');
    }

  },

  waitForDocRev: waitForDocRev,

  getDefaultSettings: getDefaultSettings,

  addTranslations: (languageCode, translations = {}) => {
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
  },

  getSettings: () => module.exports.getDoc('settings').then(settings => settings.settings),

  prepServices: prepServices,

  setupUser: setupUser,
  protractorLogin: protractorLogin,

  saveBrowserLogs: saveBrowserLogs,
  tearDownServices: stopServices,
  endSession: async (exitCode) => {
    await module.exports.tearDownServices();
    return module.exports.reporter.afterLaunch(exitCode);
  },

  runAndLogApiStartupMessage: runAndLogApiStartupMessage,
  findDistrictHospitalFromPlaces: (places) => places.find((place) => place.type === 'district_hospital'),

  apiLogFile: 'api.e2e.log',
  sentinelLogFile: 'sentinel.e2e.log',

  waitForDockerLogs,
  collectLogs,

  waitForApiLogs: (...regex) => module.exports.waitForDockerLogs(CONTAINER_NAMES.api, ...regex),
  waitForSentinelLogs: (...regex) => module.exports.waitForDockerLogs(CONTAINER_NAMES.sentinel, ...regex),
  collectSentinelLogs: (...regex) => collectLogs(CONTAINER_NAMES.sentinel, ...regex),
  collectApiLogs: (...regex) => collectLogs(CONTAINER_NAMES.api, ...regex),

  apiLogTestStart: (name) => {
    return module.exports.requestOnTestDb(`/?start=${name.replace(/\s/g, '_')}`);
  },
  apiLogTestEnd: (name) => {
    return module.exports.requestOnTestDb(`/?end=${name.replace(/\s/g, '_')}`);
  },
  COMPOSE_FILES,
  CONTAINER_NAMES,
  listenForApi,
};
