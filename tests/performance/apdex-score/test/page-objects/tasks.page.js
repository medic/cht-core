const Page = require('./page');

class TasksPage extends Page {

  async loadTaskList(settingsProvider) {
    const page = settingsProvider.getPage('tasks');
    await super.loadAndAssertPage(page);
  }

  async submitTask(settingsProvider) {
    await this.loadTaskList(settingsProvider);
    
    const form = settingsProvider.getForm('patientTask');
    const commonElements = settingsProvider.getCommonElements();
    await super.fillUpFormOnly(form, commonElements);
  }

}

module.exports = new TasksPage();
