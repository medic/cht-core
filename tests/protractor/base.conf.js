const utils = require('./utils'),
      constants = require('./constants'),
      auth = require('./auth')();
const serviceManager = require('./service-manager');


class BaseConfig {
  constructor(testSrcDir, options={}) {
    this.config = {
      seleniumAddress: 'http://localhost:4444/wd/hub',

      specs: [`${testSrcDir}/**/*.js`],

      framework: 'jasmine2',
      capabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: ['--headless', '--disable-gpu', '--window-size=1024,768']
        }
        // browserName: 'firefox',
        // 'marionette':'true'
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
      onPrepare: () => {
        jasmine.getEnv().addReporter(utils.reporter);
        browser.waitForAngularEnabled(false);

        if(options.manageServices) {
          browser.driver.wait(serviceManager.startAll(), 60 * 1000, 'API and Sentinel should start within 60 seconds');
          browser.driver.sleep(1); // block until previous command has completed
        }

        browser.driver.wait(setupSettings, 5 * 1000, 'Settings should be setup within 5 seconds');
        browser.driver.wait(setupUser, 5 * 1000, 'User should be setup within 5 seconds');
        browser.driver.sleep(1); // block until previous command has completed

        return login(browser);
      },
    };

    if(options.manageServices) {
      this.onCleanUp = serviceManager.stopAll;
    }
  }
}

module.exports = BaseConfig;


const getLoginUrl = () => {
  const redirectUrl = encodeURIComponent(`/${constants.DB_NAME}/_design/${constants.MAIN_DDOC_NAME}/_rewrite/#/messages`);
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

const setupSettings = () => {
  return utils.request({
    path: '/api/v1/settings',
    method: 'PUT',
    body: JSON.stringify({ setup_complete: true }),
    headers: { 'Content-Type': 'application/json' }
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
