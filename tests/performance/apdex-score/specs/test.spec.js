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
      await contactsPage.loadContactList();
    });

    (skip.loadChwArea ? xit : it)('should load CHW area', async () => {
      await contactsPage.loadChwArea();
    });

    (skip.loadHousehold ? xit : it)('should load household', async () => {
      await contactsPage.loadHousehold();
    });

    (skip.createPatient ? xit : it)('should create patient', async () => {
      await contactsPage.createPatient();
    });

    (skip.loadPatient ? xit : it)('should load patient', async () => {
      await contactsPage.loadPatient();
    });

    (skip.submitPatientReport ? xit : it)('should submit patient report', async () => {
      await contactsPage.submitPatientReport();
    });

    (skip.searchContact ? xit : it)('should search contact', async () => {
      await contactsPage.searchContact();
    });

    (skip.loadReportList ? xit : it)('should load report list and view a report', async () => {
      await reportsPage.loadReportList();
    });

    (skip.searchReport ? xit : it)('should search report', async () => {
      await reportsPage.searchReport();
    });

    (skip.loadTaskList ? xit : it)('should load task list', async () => {
      await tasksPage.loadTaskList();
    });

    (skip.submitTask ? xit : it)('should complete a task', async () => {
      await tasksPage.submitTask();
    });

    (skip.loadTargets ? xit : it)('should load targets', async () => {
      await targetsPage.loadTargets();
    });

    (skip.loadMessageList ? xit : it)('should load message list and view a message', async () => {
      await messagesPage.loadMessageList();
    });

  }

});
