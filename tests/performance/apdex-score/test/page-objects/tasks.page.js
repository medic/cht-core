const Page = require('./page');

class TasksPage extends Page {

  async loadTaskList(settingsProvider) {
    const page = settingsProvider.getPage('taskList');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

}

module.exports = new TasksPage();
