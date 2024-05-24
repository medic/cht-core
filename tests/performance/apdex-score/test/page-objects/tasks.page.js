const Page = require('./page');

class TasksPage extends Page {

  async loadTaskList(settingsProvider) {
    const page = settingsProvider.getPage('tasks');
    await super.loadAndAssertPage(page);
  }

}

module.exports = new TasksPage();
