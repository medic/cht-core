const loadSettings = require('../../../settings-provider');

const loadPage = require('../../page-objects/load.page');
const loginPage = require('../../page-objects/login.page');
const contactsPage = require('../../page-objects/contacts.page');
const targetsPage = require('../../page-objects/targets.page');
const tasksPage = require('../../page-objects/tasks.page');
const messagesPage = require('../../page-objects/messages.page');
const reportsPage = require('../../page-objects/reports.page');

describe('Apdex Performance Workflows', () => {
  const settingsProvider = loadSettings();
  const Repetitions = settingsProvider.getIterations();
  const skip = settingsProvider.getTestsToSkip();

  before(async () => {
    const hasPrivacyPolicy = settingsProvider.hasPrivacyPolicy();

    if (!skip.login) {
      const instanceUrl = settingsProvider.getInstanceURL();
      await loadPage.loadInstance(instanceUrl);

      const user = settingsProvider.getUser('offline', 'chw');
      await loginPage.login(user.username, user.password, hasPrivacyPolicy);
    }
  });

  for (let i = 0; i < Repetitions; i++) {
    (skip.loadContactList ? xit : it)('should load contact list', async () => {
      await contactsPage.loadContactList(settingsProvider);
    });

    (skip.loadCHWArea ? xit : it)('should load CHW area', async () => {
      await contactsPage.loadCHWArea(settingsProvider);
    });

    (skip.loadHousehold ? xit : it)('should load Household', async () => {
      await contactsPage.loadHousehold(settingsProvider);
    });

    (skip.createPatient ? xit : it)('should create patient', async () => {
      await contactsPage.createPatient(settingsProvider);
    });

    (skip.loadPatient ? xit : it)('should load patient', async () => {
      await contactsPage.loadPatient(settingsProvider);
    });

    (skip.submitPatientReport ? xit : it)('should submit patient report', async () => {
      await contactsPage.submitPatientReport(settingsProvider);
    });

    (skip.searchContact ? xit : it)('should search contact', async () => {
      await contactsPage.searchContact(settingsProvider);
    });

    (skip.loadMessageList ? xit : it)('should load message list and view a message', async () => {
      await messagesPage.loadMessageList(settingsProvider);
    });

    (skip.loadTaskList ? xit : it)('should load task list and view a task', async () => {
      await tasksPage.loadTaskList(settingsProvider);
    });

    (skip.loadReportList ? xit : it)('should load report list and view a report', async () => {
      await reportsPage.loadReportList(settingsProvider);
    });

    (skip.searchReport ? xit : it)('should search report', async () => {
      await reportsPage.searchReport(settingsProvider);
    });

    (skip.loadTargets ? xit : it)('should load targets and relaunch the app', async () => {
      await targetsPage.loadTargets(settingsProvider);
    });
  }
});
