const utils = require('./utils'),
  spawn = require('child_process').spawn,
  constants = require('./constants'),
  auth = require('./auth')(),
  modules = [];

const getLoginUrl = () => {
  const redirectUrl = encodeURIComponent(`/${constants.DB_NAME}/_design/medic/_rewrite/#/messages?e2eTesting=true`);
  return `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}/login?redirect=${redirectUrl}`;
};

const login = browser => {
  browser.driver.get(getLoginUrl());
  browser.driver.findElement(by.name('user')).sendKeys(auth.user);
  browser.driver.findElement(by.name('password')).sendKeys(auth.pass);
  browser.driver.findElement(by.id('login')).click();
  // Login takes some time, so wait until it's done.
  const bootstrappedCheck = () => element(by.css('body.bootstrapped')).isPresent();
  return browser.driver.wait(bootstrappedCheck, 20 * 1000, 'Login should be complete within 20 seconds');
};

const startNodeModule = (dir, startOutput) => {
  return new Promise(resolve => {
    const module = spawn('node', ['server.js'], {
      cwd: dir,
      env: {
        API_PORT: constants.API_PORT,
        COUCH_URL: utils.getCouchUrl(),
        COUCH_NODE_NAME: process.env.COUCH_NODE_NAME,
        PATH: process.env.PATH
      }
    });
    let started = false;
    module.stdout.on('data', data => {
      if (!started && data.toString().includes(startOutput)) {
        started = true;
        resolve();
      }
      console.log(`[${dir}] ${data}`);
    });
    module.stderr.on('data', data => console.error(`[${dir}] ${data}`));
    modules.push(module);
  });
};

const startApi = () => startNodeModule('api', 'Medic API listening on port');

const startSentinel = () => startNodeModule('sentinel', 'startup complete.');

// start sentinel serially because it relies on api
const startModules = () => startApi().then(startSentinel);

const setupSettings = () => {
  return utils.request({
    path: `/${constants.DB_NAME}/_design/medic/_rewrite/update_settings/medic`,
    method: 'PUT',
    body: JSON.stringify({ setup_complete: true })
  });
};

const setupUser = () => {
  return utils.getDoc('org.couchdb.user:' + auth.user)
    .then(doc => {
      doc.known = true;
      doc.language = 'en';
      doc.roles = ['_admin'];
      return utils.saveDoc(doc);
    });
};

exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['e2e/**/*.js'],
  framework: 'jasmine2',
  capabilities: {
    // browserName: 'chrome'
    browserName: 'firefox'
    //'marionette':'true'
  },
  onPrepare: () => {
    const startup = startModules();
    browser.ignoreSynchronization = true;
    browser.driver.wait(startup, 15 * 1000, 'API should start within 15 seconds');
    browser.driver.sleep(1000);
    browser.driver.wait(setupSettings, 5 * 1000, 'Settings should be setup within 5 seconds');
    browser.driver.wait(setupUser, 5 * 1000, 'User should be setup within 5 seconds');
    browser.driver.sleep(1000);
    return login(browser);
  },
  onCleanUp: () => modules.forEach(module => module.kill())
};
