const wdioBaseConfig = require('../wdio.conf');

const path = require('path');
const fs = require('fs');

const chai = require('chai');
chai.use(require('chai-exclude'));
chai.use(require('chai-as-promised'));
const ALLURE_OUTPUT = 'allure-results';
const logPath = path.join('tests', 'logs');
const browserLogPath = path.join(logPath, 'browser.console.log');
const mockConfig = require('./mock-config');

// Override specific properties from wdio base config
const defaultConfig = Object.assign({
  ...wdioBaseConfig.config,
  specs: ['**/*.wdio-spec.js'],
  baseUrl: mockConfig.startMockApp(),

  onPrepare: () => {
    // delete all previous test
    if (fs.existsSync(ALLURE_OUTPUT)) {
      const files = fs.readdirSync(ALLURE_OUTPUT) || [];
      files.forEach(fileName => {
        if (fileName !== 'history') {
          const filePath = path.join(ALLURE_OUTPUT, fileName);
          fs.unlinkSync(filePath);
        }
      });
    }
    // clear the main log file
    if (fs.existsSync(browserLogPath)) {
      fs.unlinkSync(browserLogPath);
    }
    // Create tests/logs if it does not exist.
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath);
    }
  },

  beforeTest: (test) => {
    const testTile = test.title;
    const title = `~~~~~~~~~~~~~ ${testTile} ~~~~~~~~~~~~~~~~~~~~~~\n`;
    fs.appendFileSync(browserLogPath, title);
  },

  after: () => {
    mockConfig.stopMockApp();
  },

  afterTest: () => {},

  onComplete: () => {},
});

exports.config = defaultConfig;
