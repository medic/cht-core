const Page = require('@page-objects/apdex/page');

class TasksPage extends Page {

  async loadTaskList(settingsProvider) {
    const page = settingsProvider.getPage('taskList');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async submitTask(settingsProvider) {
    const form = settingsProvider.getForm('patientTask');
    const commonElements = settingsProvider.getCommonElements();
    await super.fillUpForm(form, commonElements);
  }

}

module.exports = new TasksPage();
