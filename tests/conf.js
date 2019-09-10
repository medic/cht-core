const fs = require('fs');
const utils = require('./utils');
const constants = require('./constants');
const auth = require('./auth')();
const contactForms = require('./contact-forms.json');
const browserLogStream = fs.createWriteStream(
  __dirname + '/../tests/logs/browser.console.log'
);
const request = require('request-promise-native');

const baseConfig = {
  params:{
    pathToConfig: false
  },
  seleniumAddress: 'http://localhost:4444/wd/hub',
  suites: {
    e2e:'e2e/**/*.js',
    performance: 'performance/**/*.js'
  },
  framework: 'jasmine2',
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      // chromedriver 75 is w3c enabled by default and causes some actions to be impossible to perform
      // eg: browser.actions().sendKeys(protractor.Key.TAB).perform()
      // https://github.com/angular/protractor/issues/5261
      w3c: false,
      args: ['--window-size=1024,768', '--headless', '--disable-gpu']
    }
  },
  jasmineNodeOpts: {
    // makes default jasmine reporter not display dots for every spec
    print: () => {}
  },
  beforeLaunch: function() {
    process.on('uncaughtException', function() {
      utils.reporter.jasmineDone();
      utils.reporter.afterLaunch();
    });
    return new Promise(function(resolve) {
      utils.reporter.beforeLaunch(resolve);
    });
  },
  afterLaunch: function(exitCode) {
    return new Promise(function(resolve) {
      return request.post('http://localhost:31337/die')
        .catch(() => {}) // On travis this doesn't currently work: https://github.com/medic/medic/issues/5915
        .then(() => utils.reporter.afterLaunch(resolve.bind(this, exitCode)));
    });
  },
  onPrepare: () => {
    jasmine.getEnv().addReporter(utils.specReporter);
    jasmine.getEnv().addReporter(utils.reporter);
    browser.waitForAngularEnabled(false);

    // wait for startup to complete
    browser.driver.wait(startApi(), 135 * 1000, 'API took too long to start up');


    afterEach(() => {
      browser
        .manage()
        .logs()
        .get('browser')
        .then(logs => {
          logs
            .map(log => `[${log.level.name_}] ${log.message}\n`)
            .forEach(log => browserLogStream.write(log));
          browserLogStream.write('\n~~~~~~~~~~~~~~~~~~~~~\n\n');
        });
    });

    return login(browser);
  }
};

exports.config = baseConfig;

const runAndLog = (msg, func) => {
  console.log(`API startup: ${msg}`);
  return func();
};

const startApi = () =>
  listenForApi()
    .then(() => runAndLog('Settings setup', setupSettings))
    .then(() => runAndLog('User contact doc setup', utils.setUserContactDoc))
    .then(() => runAndLog('User setup', setupUser));

const listenForApi = () => {
  console.log('Checking API');
  return utils.request({ path: '/api/info' }).catch(() => {
    console.log('API check failed, trying again in 5 seconds');
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(listenForApi());
      }, 5000);
    });
  });
};

const getLoginUrl = () => {
  const redirectUrl = encodeURIComponent(
    `/${constants.DB_NAME}/_design/${constants.MAIN_DDOC_NAME}/_rewrite/#/messages`
  );
  return `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}/login?redirect=${redirectUrl}`;
};

const login = browser => {
  browser.driver.get(getLoginUrl());
  browser.driver.findElement(by.name('user')).sendKeys(auth.user);
  browser.driver.findElement(by.name('password')).sendKeys(auth.pass);
  browser.driver.findElement(by.id('login')).click();
  // Login takes some time, so wait until it's done.
  const bootstrappedCheck = () =>
    element(by.css('body.bootstrapped')).isPresent();
  return browser.driver.wait(
    bootstrappedCheck,
    20 * 1000,
    'Login should be complete within 20 seconds'
  );
};

const setupSettings = () => {
  return utils.saveDocs(contactForms).then(() => {
    // saves the standard contact forms
    return utils.request({
      path: '/api/v1/settings',
      method: 'PUT',
      body: JSON.stringify({ setup_complete: true }),
      headers: { 'Content-Type': 'application/json' }
    });
  });
};

const setupUser = () => {
  return utils.getDoc('org.couchdb.user:' + auth.user).then(doc => {
    doc.contact_id = constants.USER_CONTACT_ID;
    doc.known = true;
    doc.language = 'en';
    doc.roles = ['_admin'];
    return utils.saveDoc(doc);
  });
};
