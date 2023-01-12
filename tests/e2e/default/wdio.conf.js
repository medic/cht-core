const allure = require('allure-commandline');
const fs = require('fs');
const path = require('path');
const chai = require('chai');
chai.use(require('chai-exclude'));

const constants = require('../../constants');
const utils = require('../../utils');
const fileDownloadUtils = require('../../utils/file-download');
const browserUtils = require('../../utils/browser');

const ALLURE_OUTPUT = 'allure-results';
const browserLogPath = path.join('tests', 'logs', 'browser.console.log');
const logLevels = ['error', 'warning', 'debug'];
const existingFeedBackDocIds = [];
let testTile;

const baseConfig = {
  //
  // ====================
  // Runner Configuration
  // ====================
  //
  // WebdriverIO allows it to run your tests in arbitrary locations (e.g. locally or
  // on a remote machine).
  runner: 'local',
  //
  // ==================
  // Specify Test Files
  // ==================
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called.
  //
  // The specs are defined as an array of spec files (optionally using wildcards
  // that will be expanded). The test for each spec file will be run in a separate
  // worker process. In order to have a group of spec files run in the same worker
  // process simply enclose them in an array within the specs array.
  //
  // If you are calling `wdio` from an NPM script (see https://docs.npmjs.com/cli/run-script),
  // then the current working directory is where your `package.json` resides, so `wdio`
  // will be called from there.
  //
  specs: [
    './tests/e2e/default/**/online-user.wdio-spec.js',
  ],
  // Patterns to exclude.
  exclude: [
    // 'path/to/excluded/files'
  ],
  //
  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude options in
  // order to group specific specs to a specific capability.
  //
  // First, you can define how many instances should be started at the same time. Let's
  // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
  // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
  // files and you set maxInstances to 10, all spec files will get tested at the same time
  // and 30 processes will get spawned. The property handles how many capabilities
  // from the same test should run tests.
  //
  maxInstances: 10,
  //
  // If you have trouble getting all important capabilities together, check out the
  // Sauce Labs platform configurator - a great tool to configure your capabilities:
  // https://docs.saucelabs.com/reference/platforms-configurator
  //
  capabilities: [{

    // maxInstances can get overwritten per capability. So if you have an in-house Selenium
    // grid with only 5 firefox instances available you can make sure that not more than
    // 5 instances get started at a time.
    maxInstances: 1,
    //
    browserName: 'chrome',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: [ '--headless', '--disable-gpu', '--deny-permission-prompts', '--ignore-certificate-errors']
    }

    // If outputDir is provided WebdriverIO can capture driver session logs
    // it is possible to configure which logTypes to include/exclude.
    // excludeDriverLogs: ['*'], // pass '*' to exclude all driver session logs
    // excludeDriverLogs: ['bugreport', 'server'],
  }],
  //
  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here
  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: process.env.LOGLEVEL || 'error',
  //
  // Set specific log levels per logger
  // loggers:
  // - webdriver, webdriverio
  // - @wdio/applitools-service, @wdio/browserstack-service, @wdio/devtools-service, @wdio/sauce-service
  // - @wdio/mocha-framework, @wdio/jasmine-framework
  // - @wdio/local-runner
  // - @wdio/sumologic-reporter
  // - @wdio/cli, @wdio/config, @wdio/utils
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  // logLevels: {
  //   webdriver: 'info',
  //   '@wdio/applitools-service': 'info'
  // },
  //
  // If you only want to run your tests until a specific amount of tests have failed use
  // bail (default is 0 - don't bail, run all tests).
  bail: 0,
  //
  // Set a base URL in order to shorten url command calls. If your `url` parameter starts
  // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
  // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
  // gets prepended directly.
  baseUrl: constants.BASE_URL,
  //
  // Default timeout for all waitFor* commands.
  waitforTimeout: 15000,
  //
  // Default timeout in milliseconds for request
  // if browser driver or grid doesn't send response
  connectionRetryTimeout: 120000,
  //
  // Default request retries count
  connectionRetryCount: 3,
  //
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  services: ['devtools'],

  // Framework you want to run your specs with.
  // The following are supported: Mocha, Jasmine, and Cucumber
  // see also: https://webdriver.io/docs/frameworks
  //
  // Make sure you have the wdio adapter package for the specific framework installed
  // before running any tests.
  framework: 'mocha',
  //
  // The number of times to retry the entire specfile when it fails as a whole
  // specFileRetries: 1,
  //
  // Delay in seconds between the spec file retry attempts
  // specFileRetriesDelay: 0,
  //
  // Whether or not retried specfiles should be retried immediately or deferred to the end of the queue
  // specFileRetriesDeferred: false,
  //
  // Test reporter for stdout.
  // The only one supported by default is 'dot'
  // see also: https://webdriver.io/docs/dot-reporter
  reporters: [
    ['allure', {
      outputDir: ALLURE_OUTPUT,
      disableWebdriverStepsReporting: true
    }],
    'spec',
  ],
  //
  // Options to be passed to Mocha.
  // See the full list at http://mochajs.org/
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
  //
  // =====
  // Hooks
  // =====
  // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
  // it and to build services around it. You can either apply a single function or an array of
  // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
  // resolved to continue.
  /**
   * Gets executed once before all workers get launched.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   */
  onPrepare: async function () {
    // delete all previous test
    if (fs.existsSync(ALLURE_OUTPUT)) {
      const files = fs.readdirSync(ALLURE_OUTPUT) || [];
      files.forEach(fileName => {
        const filePath = path.join(ALLURE_OUTPUT, fileName);
        fs.unlinkSync(filePath);
      });
    }

    // clear the main log file
    if (fs.existsSync(browserLogPath)) {
      fs.unlinkSync(browserLogPath);
    }
    await utils.prepServices();
  },
  /**
   * Gets executed before a worker process is spawned and can be used to initialise specific service
   * for that worker as well as modify runtime environments in an async fashion.
   * @param  {String} cid    capability id (e.g 0-0)
   * @param  {[type]} caps   object containing capabilities for session that will be spawn in the worker
   * @param  {[type]} specs  specs to be run in the worker process
   * @param  {[type]} args   object that will be merged with the main configuration once worker is initialised
   * @param  {[type]} execArgv list of string arguments passed to the worker process
   */
  // onWorkerStart: function (cid, caps, specs, args, execArgv) {
  // },
  /**
   * Gets executed just before initialising the webdriver session and test framework. It allows you
   * to manipulate configurations depending on the capability or spec.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  // beforeSession: function (config, capabilities, specs) {
  // },
  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs    List of spec file paths that are to be run
   * @param {Object}     browser    instance of created browser/device session
   */
  before: async function () {
    global.expect = chai.expect;
    await browser.url('/');
    await browser.cdp('Log', 'enable');
    await browser.cdp('Runtime', 'enable');
    // dedupe the messages to work around to known issue: https://github.com/webdriverio/webdriverio/issues/6347
    let lastMessage = '';
    browser.on('Runtime.consoleAPICalled', (data) => {
      if (data && logLevels.indexOf(data.type) >= 0) {
        const logEntry = `[${data.type}] Console Api Event: ${JSON.stringify(data.args)}\n`;
        if (logEntry !== lastMessage) {
          fs.appendFileSync(browserLogPath, logEntry);
          lastMessage = logEntry;
        }
      }
    });
    browser.on('Log.entryAdded', (params) => {
      if(params && params.entry) {
        const entry = params.entry;
        const logEntry = `[${entry.level}]: ${entry.source} ${entry.text} url: ${entry.url} at ${entry.timestamp}\n`;
        if (logEntry !== lastMessage) {
          fs.appendFileSync(browserLogPath, logEntry);
          lastMessage = logEntry;
        }
      }
    });
  },
  /**
   * Runs before a WebdriverIO command gets executed.
   * @param {String} commandName hook command name
   * @param {Array} args arguments that command would receive
   */
  // beforeCommand: function (commandName, args) {
  // },
  /**
   * Hook that gets executed before the suite starts
   * @param {Object} suite suite details
   */
  // beforeSuite: function (suite) {
  // },
  /**
   * Function to be executed before a test (in Mocha/Jasmine) starts.
   */
  beforeTest: async (test) => {
    testTile = test.title;
    const title = `~~~~~~~~~~~~~ ${testTile} ~~~~~~~~~~~~~~~~~~~~~~\n`;
    fs.appendFileSync(browserLogPath, title);
    await utils.apiLogTestStart(testTile);
  },
  /**
   * Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
   * beforeEach in Mocha)
   */
  // beforeHook: function (test, context) {
  // },
  /**
   * Hook that gets executed _after_ a hook within the suite starts (e.g. runs after calling
   * afterEach in Mocha)
   */
  // afterHook: function (test, context, { error, result, duration, passed, retries }) {
  // },
  /**
   * Function to be executed after a test (in Mocha/Jasmine).
   */
  afterTest: async (test, context, { passed }) => {
    const feedBackDocs = await browserUtils.feedBackDocs(`${test.parent} ${test.title}`, existingFeedBackDocIds);
    existingFeedBackDocIds.push(feedBackDocs);
    if(feedBackDocs){
      if(passed){
        context.test.callback(new Error('Feedback docs were generated during the test.'));
      }
      passed = false;
    }
    if (passed === false) {
      await browser.takeScreenshot();
    }
    await utils.apiLogTestEnd(test.title);
  },

  /**
   * Hook that gets executed after the suite has ended
   * @param {Object} suite suite details
   */
  // afterSuite: function (suite) {
  // },
  /**
   * Runs after a WebdriverIO command gets executed
   * @param {String} commandName hook command name
   * @param {Array} args arguments that command would receive
   * @param {Number} result 0 - command success, 1 - command error
   * @param {Object} error error object if any
   */
  // afterCommand: async function (commandName, args, result, error) {
  //   await browser.takeScreenshot();
  // },
  /**
   * Gets executed after all tests are done. You still have access to all global variables from
   * the test.
   * @param {Number} result 0 - test pass, 1 - test fail
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  after: async () => {
    // Replaces After hook in test file with a common clean up
    const users = await utils.getCreatedUsers();
    if (users.length) {
      await utils.deleteUsers(users);
    }
    await utils.revertDb([/^form:/], true);
  },
  /**
   * Gets executed right after terminating the webdriver session.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  // afterSession: (config, capabilities, specs) => {
  // },
  /**
   * Gets executed after all workers got shut down and the process is about to exit. An error
   * thrown in the onComplete hook will result in the test run failing.
   * @param {Object} exitCode 0 - success, 1 - fail
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {<Object>} results object containing test results
   */
  onComplete: async () => {
    fileDownloadUtils.deleteDownloadDirectory();
    await utils.tearDownServices();
    const reportError = new Error('Could not generate Allure report');
    const timeoutError = new Error('Timeout generating report');
    const generation = allure(['generate', 'allure-results', '--clean']);

    return new Promise((resolve, reject) => {
      const generationTimeout = setTimeout(
        () => reject(timeoutError),
        60 * 1000);

      generation.on('exit', (exitCode) => {
        clearTimeout(generationTimeout);

        if (exitCode !== 0) {
          return reject(reportError);
        }

        console.log('Allure report successfully generated');
        resolve();
      });
    });
  },
  /**
  * Gets executed when a refresh happens.
  * @param {String} oldSessionId session ID of the old session
  * @param {String} newSessionId session ID of the new session
  */
  //onReload: function(oldSessionId, newSessionId) {
  //}
};


exports.config = baseConfig;
