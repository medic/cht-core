require('dotenv').config();

const loadSettings = require('../../../settings-provider');

const LoadPage = require('../../pageobjects/load.page');
const LoginPage = require('../../pageobjects/login.page');
const PeoplePage = require('../../pageobjects/people.page');
const TasksPage = require('../../pageobjects/tasks.page');
const MessagesPage = require('../../pageobjects/messages.page');
const ReportsPage = require('../../pageobjects/reports.page');
const PerformancePage = require('../../pageobjects/performance.page');
const { $ } = require('@wdio/globals');

describe('Apdex Performance Workflows', () => {
  let settingsProvider;
  const TIME_OUT = 1000 * 60 * 20;
  const REPETITIONS = 2;

  before(async () => {
    settingsProvider = loadSettings();
    const instanceUrl = settingsProvider.getInstanceURL();
    const hasPrivacyPolicy = settingsProvider.hasPrivacyPolicy();
    const user = settingsProvider.getUser('offline', 'chw');
    await LoadPage.loadInstance(instanceUrl);
    await LoginPage.login(user.username, user.password, hasPrivacyPolicy);
  });

  const waitForDisplayedAndRetry = async (selector, retryTotal = 5, retryCount = 0) => {
    return (await $(selector))
      .waitForDisplayed({ timeout: TIME_OUT })
      .catch(() => {
        if (retryCount >= retryTotal) {
          return;
        }
        return waitForDisplayedAndRetry(selector, retryTotal, retryCount + 1);
      });
  };

  const scrollView = () => {
    return $('android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(1)');
  };

  const assertMany = async (asserts = []) => {
    for (const assert of asserts) {
      if (assert.scrollTo) {
        await scrollView().catch(() => console.log('ignore'));
      }
      await waitForDisplayedAndRetry(assert.selector);
    }
  };

  const navigate = async (navigation = []) => {
    for (const navStep of navigation) {
      if (navStep.scrollTo) {
        await scrollView().catch(() => console.log('ignore'));
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
      await navigate(page.postTestPath);
    });

    it('should load CHW area', async () => {
      const page = settingsProvider.getPage('chw-area');
      await navigate(page.navigation, page.asserts);
      await navigate(page.postTestPath);
    });

    it('should load Household', async () => {
      const page = settingsProvider.getPage('household');
      await navigate(page.navigation, page.asserts);
      await navigate(page.postTestPath);
    });

    it('should load patient', async () => {
      const page = settingsProvider.getPage('patient');
      await navigate(page.navigation, page.asserts);
      await navigate(page.postTestPath);
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
