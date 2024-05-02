require('dotenv').config();

const loadSettings = require('../../../settings-provider');

const LoadPage = require('../../page-objects/load.page');
const LoginPage = require('../../page-objects/login.page');
const contactsPage = require('../../page-objects/contacts.page');
/*
const TasksPage = require('../../page-objects/tasks.page');
const MessagesPage = require('../../page-objects/messages.page');
const ReportsPage = require('../../page-objects/reports.page');
const PerformancePage = require('../../page-objects/performance.page');
*/

describe('Apdex Performance Workflows', () => {
  const settingsProvider = loadSettings();
  const REPETITIONS = settingsProvider.getIterations();

  before(async () => {
    const instanceUrl = settingsProvider.getInstanceURL();
    const hasPrivacyPolicy = settingsProvider.hasPrivacyPolicy();
    const user = settingsProvider.getUser('offline', 'chw');
    await LoadPage.loadInstance(instanceUrl);
    await LoginPage.login(user.username, user.password, hasPrivacyPolicy);
  });

  for (let i = 0; i < REPETITIONS; i++) {
    it('should load contact list', async () => {
      await contactsPage.loadContactList(settingsProvider);
    });

    it('should load CHW area', async () => {
      await contactsPage.loadCHWArea(settingsProvider);
    });

    it('should load Household', async () => {
      await contactsPage.loadHousehold(settingsProvider);
    });

    it('should load patient', async () => {
      await contactsPage.loadPatient(settingsProvider);
    });
  }

  // ToDo: clean all these below after settings are done

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
