require('dotenv').config();

const loadSettings = require('../../../settings-provider');

const LoadPage = require('../../pageobjects/load.page');
const LoginPage = require('../../pageobjects/login.page');
const PeoplePage = require('../../pageobjects/people.page');
const TasksPage = require('../../pageobjects/tasks.page');
const MessagesPage = require('../../pageobjects/messages.page');
const ReportsPage = require('../../pageobjects/reports.page');
const PerformancePage = require('../../pageobjects/performance.page');

describe('Apdex Performance Workflows', () => {
  before(async () => {
    const settingsProvider = loadSettings();
    const instanceUrl = settingsProvider.getInstanceURL();
    const hasPrivacyPolicy = instanceUrl.hasPrivacyPolicy();
    const user = settingsProvider.getUser('offline', 'chw');
    await LoadPage.loadInstance(instanceUrl);
    await LoginPage.login(user.username, user.password, hasPrivacyPolicy);
  });

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

});
