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

  before(async () => {
    settingsProvider = loadSettings();
    const instanceUrl = settingsProvider.getInstanceURL();
    const hasPrivacyPolicy = settingsProvider.hasPrivacyPolicy();
    const user = settingsProvider.getUser('offline', 'chw');
    await LoadPage.loadInstance(instanceUrl);
    await LoginPage.login(user.username, user.password, hasPrivacyPolicy);
  });

  const waitForDisplayedAndRetry = async (elementPromise, retryTotal = 5, retryCount = 0) => {
    return (await $(elementPromise))
      .waitForDisplayed({ timeout: TIME_OUT })
      .catch(() => {
        if (retryCount >= retryTotal) {
          return;
        }
        return waitForDisplayedAndRetry(elementPromise, retryTotal, retryCount + 1);
      });
  };

  const navigateAndAssert = async (navigation, assertValue) => {
    for (const page of navigation) {
      if (await waitForDisplayedAndRetry(page.selector)) {
        await (await $(page.selector)).click();
      }
    }
    return waitForDisplayedAndRetry(assertValue.selector);
  };

  const navigate = async (navigation) => {
    for (const page of navigation) {
      if (await waitForDisplayedAndRetry(page.selector)) {
        await (await $(page.selector)).click();
      }
    }
  };

  for (let i = 0; i < 40; i++) {
    it('should load contact list', async () => {
      const page = settingsProvider.getPage('contact-list');
      await navigateAndAssert(page.navigation, page.assert);

      // load another page to load contact list again in next iteration
      const pageTargets = settingsProvider.getPage('targets');
      await navigate(pageTargets.navigation);
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
