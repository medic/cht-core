const Page = require('@page-objects/apdex/page');
const TASK_LIST = 'taskList';
const PATIENT_TASK = 'patientTask';

class TasksPage extends Page {

  async loadTaskList(settingsProvider) {
    await super.loadPage(settingsProvider, TASK_LIST);
  }

  async submitTask(settingsProvider) {
    await super.loadForm(settingsProvider, PATIENT_TASK);
  }

}

module.exports = new TasksPage();
