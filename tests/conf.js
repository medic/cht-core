const fs = require('fs');
const request = require('request-promise-native');
const utils = require('./utils');
const constants = require('./constants');
const auth = require('./auth')();
const browserLogStream = fs.createWriteStream(
  __dirname + '/../tests/logs/browser.console.log'
);

const chai = require('chai');
// so the .to.have.members will display the array members when assertions fail instead of [ Array(6) ]
chai.config.truncateThreshold = 0;

const baseConfig = {
  params:{
    pathToConfig: false
  },
  seleniumAddress: 'http://localhost:4444/wd/hub',
  //Enabling specs as they are working.
  suites: {
    // e2e:'e2e/**/*.js',
    e2e: [
      '**/login.spec.js',
      '**/report-date-filter.js',
      '**/sentinel/queue.spec.js',
      '**/api/routing.js',
      '**/infodocs.js',
      '**/common.specs.js',
      '**/content-security-policy.js',
      'tests/e2e/create-meta-db.js',
    ],
    // performance: 'performance/**/*.js'
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
        .then(() => utils.reporter.afterLaunch(resolve.bind(this, exitCode)));
    });
  },
  onPrepare: () => {
    jasmine.getEnv().addReporter(utils.specReporter);
    jasmine.getEnv().addReporter(utils.reporter);
    browser.waitForAngularEnabled(false);

    // wait for startup to complete
    browser.driver.wait(prepServices(), 135 * 1000, 'API took too long to start up');

    afterEach(() => {
      return browser
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

    return login(browser).then(() => runAndLog('User setup', setupUser));
  }
};

exports.config = baseConfig;

const runAndLog = (msg, func) => {
  console.log(`API startup: ${msg}`);
  return func();
};

const prepServices = () => {
  let apiReady;
  if (constants.IS_TRAVIS) {
    console.log('On travis, waiting for horti to first boot api');
    // Travis' horti will be installing and then deploying api and sentinel, and those logs are
    // getting pushed into horti.log Once horti has bootstrapped we want to restart everything so
    // that the service processes get restarted with their logs separated and pointing to the
    // correct logs for testing
    apiReady = listenForApi()
      .then(() => console.log('Horti booted API, rebooting under our logging structure'))
      .then(() => request.post('http://localhost:31337/all/restart'));
  } else {
    // Locally we just need to start them and can do so straight away
    apiReady = request.post('http://localhost:31337/all/start');
  }

  return apiReady
    .then(() => listenForApi())
    .then(() => runAndLog('Settings setup', setupSettings))
    .then(() => runAndLog('User contact doc setup', utils.setUserContactDoc));
};

const listenForApi = () => {
  console.log('Checking API');
  return utils.request({ path: '/api/info' }).catch(() => {
    console.log('API check failed, trying again in 1 second');
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(listenForApi());
      }, 1000);
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
  browser.driver.findElement(by.name('user')).sendKeys(auth.username);
  browser.driver.findElement(by.name('password')).sendKeys(auth.password);
  browser.driver.findElement(by.id('login')).click();
  // Login takes some time, so wait until it's done.
  const bootstrappedCheck = () =>
    element(by.css('.app-root.bootstrapped')).isPresent();
  return browser.driver.wait(
    bootstrappedCheck,
    20 * 1000,
    'Login should be complete within 20 seconds'
  );
};

const setupSettings = () => {
  const defaultAppSettings = utils.getDefaultSettings();
  defaultAppSettings.transitions = {};

  return utils.request({
    path: '/api/v1/settings?replace=1',
    method: 'PUT',
    body: defaultAppSettings
  });
};

const setupUser = () => {
  return utils
    .getDoc('org.couchdb.user:' + auth.username)
    .then(doc => {
      doc.contact_id = constants.USER_CONTACT_ID;
      doc.language = 'en';
      return utils.saveDoc(doc);
    })
    .then(() => utils.refreshToGetNewSettings())
    .then(() => utils.closeTour());
};
