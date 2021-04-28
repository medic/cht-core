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
  SELENIUM_PROMISE_MANAGER: false,
  seleniumAddress: 'http://localhost:4444/wd/hub',
  suites: {
    web: ['e2e/**/add-new-language.spec.js'],
    mobile: [],
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
      args: ['--window-size=1024,768', '--headless', '--disable-gpu'],
      prefs: {
        intl: { accept_languages: 'en-US' },
      },
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
  onPrepare: async () => {
    jasmine.getEnv().addReporter(utils.specReporter);
    jasmine.getEnv().addReporter(utils.reporter);
    jasmine.getEnv().addReporter(utils.currentSpecReporter);

    browser.waitForAngularEnabled(false);

    // wait for startup to complete
    await browser.driver.wait(prepServices(), 135 * 1000, 'API took too long to start up');

    afterEach(() => {
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
    });

    return login(browser).then(() => runAndLog('User setup', setupUser));
  }
};

exports.config = baseConfig;

const runAndLog = (msg, func) => {
  console.log(`API startup: ${msg}`);
  return func();
};

const prepServices = async () => {
  if (constants.IS_TRAVIS) {
    console.log('On travis, waiting for horti to first boot api');
    // Travis' horti will be installing and then deploying api and sentinel, and those logs are
    // getting pushed into horti.log Once horti has bootstrapped we want to restart everything so
    // that the service processes get restarted with their logs separated and pointing to the
    // correct logs for testing
    await listenForApi();
    console.log('Horti booted API, rebooting under our logging structure');
    await request.post('http://localhost:31337/all/restart');
  } else {
    // Locally we just need to start them and can do so straight away
    await request.post('http://localhost:31337/all/start');
  }

  await listenForApi();
  await runAndLog('Settings setup', setupSettings);
  await runAndLog('User contact doc setup', utils.setUserContactDoc);
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
    await utils.request({ path: '/api/info' });
  } catch(err) {
    console.log('API check failed, trying again in 1 second');
    console.log(err.message);
    await apiRetry();
  }
};

const getLoginUrl = () => {
  const redirectUrl = encodeURIComponent(
    `/${constants.DB_NAME}/_design/${constants.MAIN_DDOC_NAME}/_rewrite/#/messages`
  );
  return `http://${constants.API_HOST}:${constants.API_PORT}/${constants.DB_NAME}/login?redirect=${redirectUrl}`;
};

const login = async browser => {
  await browser.driver.get(getLoginUrl());
  await browser.driver.findElement(by.name('user')).sendKeys(auth.username);
  await browser.driver.findElement(by.name('password')).sendKeys(auth.password);
  await browser.driver.findElement(by.id('login')).click();
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
