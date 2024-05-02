require('dotenv').config();

const { $ } = require('@wdio/globals');
const { execSync } = require('child_process');

const loadSettings = require('../../../settings-provider');

const LoadPage = require('../../pageobjects/load.page');
const LoginPage = require('../../pageobjects/login.page');
const PeoplePage = require('../../pageobjects/people.page');
const TasksPage = require('../../pageobjects/tasks.page');
const MessagesPage = require('../../pageobjects/messages.page');
const ReportsPage = require('../../pageobjects/reports.page');
const PerformancePage = require('../../pageobjects/performance.page');

describe('Apdex Performance Workflows', () => {
  const TIME_OUT = 1000 * 60 * 20;
  const settingsProvider = loadSettings();
  const REPETITIONS = settingsProvider.getIterations();

  before(async () => {
    const instanceUrl = settingsProvider.getInstanceURL();
    const hasPrivacyPolicy = settingsProvider.hasPrivacyPolicy();
    const user = settingsProvider.getUser('offline', 'chw');
    await LoadPage.loadInstance(instanceUrl);
    await LoginPage.login(user.username, user.password, hasPrivacyPolicy);
  });

  const waitForDisplayedAndRetry = async (selector, retryTotal = 20, retryCount = 0) => {
    try {
      return await (await $(selector)).waitForDisplayed({ timeout: TIME_OUT });
    } catch (error) {
      if (retryCount >= retryTotal) {
        return false;
      }
      return await waitForDisplayedAndRetry(selector, retryTotal, retryCount + 1);
    }
  };

  const scrollDown = (swipes = 0) => {
    for (let i = 0; i < swipes; i++) {
      execSync('adb shell input swipe 500 1000 300 300');
    }
  };

  const scrollUp = (swipes = 0) => {
    for (let i = 0; i < swipes; i++) {
      execSync('adb shell input swipe 300 300 500 1000');
    }
  };

  const assertMany = async (asserts = []) => {
    for (const assert of asserts) {
      if (assert.scrollDown) {
        scrollDown(assert.scrollDown);
      }

      if (assert.scrollUp) {
        scrollUp(assert.scrollUp);
      }

      await waitForDisplayedAndRetry(assert.selector);
    }
  };

  const navigate = async (navigation = []) => {
    for (const navStep of navigation) {
      if (navStep.scrollDown) {
        scrollDown(navStep.scrollDown);
      }

      if (navStep.scrollUp) {
        scrollUp(navStep.scrollUp);
      }

      if (await waitForDisplayedAndRetry(navStep.selector)) {
        await (await $(navStep.selector)).click();
      }

      if (navStep.asserts) {
        await assertMany(navStep.asserts);
      }
    }
  };

  for (let i = 0; i < REPETITIONS; i++) {
    it('should load contact list', async () => {
      const page = settingsProvider.getPage('contact-list');
      await navigate(page.navigation, page.asserts);
      if (page.postTestPath) {
        await navigate(page.postTestPath);
      }
    });

    it('should load CHW area', async () => {
      const page = settingsProvider.getPage('chw-area');
      await navigate(page.navigation, page.asserts);
      if (page.postTestPath) {
        await navigate(page.postTestPath);
      }
    });

    it('should load Household', async () => {
      const page = settingsProvider.getPage('household');
      await navigate(page.navigation, page.asserts);
      if (page.postTestPath) {
        await navigate(page.postTestPath);
      }
    });

    it('should load patient', async () => {
      const page = settingsProvider.getPage('patient');
      await navigate(page.navigation, page.asserts);
      if (page.postTestPath) {
        await navigate(page.postTestPath);
      }
    });
  }

  /*
  it('should submit a report for a newly created person', async () => {
    const firstName = 'Roy';
    const lastName = 'Caxton';
    await PeoplePage.createPersonKE(firstName, lastName, '1988-02-20');
    await PeoplePage.createDefaulterReport();
    await PeoplePage.searchPerson(firstName);
  });

  it('should view a person within the household', async () => {
    await PeoplePage.viewPersonKE();
  });

  it('should view the community health workers area', async () => {
    await PeoplePage.viewCHPArea();
  });

  it('should open the tasks page and view a task', async () => {
    await TasksPage.viewATask();
  });

  it('should open the reports page and view a report', async () => {
    await ReportsPage.viewAReport();
  });

  it('should open the messages page and view a message', async () => {
    await MessagesPage.viewAMessage();
  });

  it('should open the performance page and relaunch the app', async () => {
    await PerformancePage.viewPerformance();
    await PerformancePage.relaunchApp();
  });
*/
});
