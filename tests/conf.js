const utils = require('./utils');
const chai = require('chai');
chai.use(require('chai-exclude'));
chai.use(require('chai-shallow-deep-equal'));
// so the .to.have.members will display the array members when assertions fail instead of [ Array(6) ]
chai.config.truncateThreshold = 0;
chai.use(require('chai-exclude'));

const baseConfig = {
  params:{
    pathToConfig: false
  },
  SELENIUM_PROMISE_MANAGER: false,
  seleniumAddress: 'http://localhost:4444/wd/hub',
  exclude: [
    '**/*wdio-spec.js',
    'e2e/api/**/*.js',
    'e2e/sentinel/**/*.js',
    'e2e/transitions/**/*.js',
    'e2e/**/*-config/*.js',
  ],
  suites: {
    web: [
      'e2e/!(cht)/**/*.js',
      'e2e/**/*.js'
    ],
    cht: [
      'e2e/cht/*.spec.js'
    ],
    mobile: ['mobile/**/*.js'],
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
      args: [
        '--window-size=1024,768',
        '--headless',
        '--ignore-certificate-errors',
        '--disable-gpu',
        '--deny-permission-prompts',
        '--no-sandbox'
      ],
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
  afterLaunch: async () => await utils.endSession(),
  onPrepare: async () => {
    jasmine.getEnv().addReporter(utils.specReporter);
    jasmine.getEnv().addReporter(utils.reporter);
    jasmine.getEnv().addReporter(utils.currentSpecReporter);

    browser.waitForAngularEnabled(false);
    // wait for startup to complete
    const config = await browser.getProcessedConfig();
    await browser.driver.wait(utils.prepServices(config.suite === 'web'), 200 * 1000, 'API took too long to start up');

    afterEach(() => {
      return utils.saveBrowserLogs();
    });

    return utils.protractorLogin(browser).then(() => utils.runAndLogApiStartupMessage('User setup', utils.setupUser));
  }
};

exports.config = baseConfig;

