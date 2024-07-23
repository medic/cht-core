const loadSettings = require('../settings-provider');

const loadPage = require('@page-objects/apdex/load.page');
const loginPage = require('@page-objects/apdex/login.page');
const contactsPage = require('@page-objects/apdex/contacts.page');
const targetsPage = require('@page-objects/apdex/targets.page');
const tasksPage = require('@page-objects/apdex/tasks.page');
const messagesPage = require('@page-objects/apdex/messages.page');
const reportsPage = require('@page-objects/apdex/reports.page');

describe('Apdex Performance Workflows', () => {
  const settingsProvider = loadSettings();
  const repetitions = settingsProvider.getIterations();
  const skip = settingsProvider.getTestsToSkip();

  before(async () => {
    if (!skip.login) {
      await loadPage.loadInstance(settingsProvider);
      await loginPage.login('offline', 'chw', settingsProvider);
      await loadPage.turnOnAirplaneMode(settingsProvider);
    }
  });

  for (let i = 0; i < repetitions; i++) {
    (skip.loadContactList ? xit : it)('should load contact list', async () => {
      await contactsPage.loadContactList(settingsProvider);
    });

    (skip.loadCHWArea ? xit : it)('should load CHW area', async () => {
      await contactsPage.loadCHWArea(settingsProvider);
    });

    (skip.loadHousehold ? xit : it)('should load household', async () => {
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

    (skip.loadReportList ? xit : it)('should load report list and view a report', async () => {
      await reportsPage.loadReportList(settingsProvider);
    });

    (skip.searchReport ? xit : it)('should search report', async () => {
      await reportsPage.searchReport(settingsProvider);
    });

    (skip.loadTaskList ? xit : it)('should load task list', async () => {
      await tasksPage.loadTaskList(settingsProvider);
    });

    (skip.submitTask ? xit : it)('should complete a task', async () => {
      await tasksPage.submitTask(settingsProvider);
    });

    (skip.loadTargets ? xit : it)('should load targets', async () => {
      await targetsPage.loadTargets(settingsProvider);
    });

    (skip.loadMessageList ? xit : it)('should load message list and view a message', async () => {
      await messagesPage.loadMessageList(settingsProvider);
    });

  }

});
