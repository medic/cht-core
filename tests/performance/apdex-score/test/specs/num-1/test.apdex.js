const loadSettings = require('../../../settings-provider');

const loadPage = require('../../page-objects/load.page');
const loginPage = require('../../page-objects/login.page');
const contactsPage = require('../../page-objects/contacts.page');
const performancePage = require('../../page-objects/performance.page');
const tasksPage = require('../../page-objects/tasks.page');
const messagesPage = require('../../page-objects/messages.page');
const reportsPage = require('../../page-objects/reports.page');

describe('Apdex Performance Workflows', () => {
  const settingsProvider = loadSettings();
  const REPETITIONS = settingsProvider.getIterations();

  before(async () => {
    const instanceUrl = settingsProvider.getInstanceURL();
    const hasPrivacyPolicy = settingsProvider.hasPrivacyPolicy();
    const user = settingsProvider.getUser('offline', 'chw');
    await loadPage.loadInstance(instanceUrl);
    await loginPage.login(user.username, user.password, hasPrivacyPolicy);
  });

  for (let i = 0; i < REPETITIONS; i++) {
    it('should load contact list', async () => {
      await contactsPage.loadContactList(settingsProvider);
    });

    // it('should load CHW area', async () => {
    //   await contactsPage.loadCHWArea(settingsProvider);
    // });

    // it('should load Household', async () => {
    //   await contactsPage.loadHousehold(settingsProvider);
    // });

    // it('should create patient', async () => {
    //   await contactsPage.createPatient(settingsProvider);
    // });

    it('should load patient', async () => {
      await contactsPage.loadPatient(settingsProvider);
    });

    it('should submit patient report', async () => {
      await contactsPage.submitPatientReport(settingsProvider);
    });

    // it('should search patient', async () => {
    //   await contactsPage.searchPatient(settingsProvider);
    // });

    // it('should load message list and view a message', async () => {
    //   await messagesPage.loadMessageList(settingsProvider);
    // });

    it('should load task list and complete a task', async () => {
      await tasksPage.submitTask(settingsProvider);
    });
  
    // it('should load report list and view a report', async () => {
    //   await reportsPage.loadReportList(settingsProvider);
    // });

    it('should load analytics and relaunch the app', async () => {
      await performancePage.loadAnalytics(settingsProvider);
    });

  }

});
