const Page = require('@page-objects/apdex/page');
const TASK_LIST = 'taskList';
const PATIENT_TASK = 'patientTask';

class TasksPage extends Page {

  async loadTaskList() {
    await super.loadPage(TASK_LIST);
  }

  async submitTask() {
    await super.loadForm(PATIENT_TASK);
  }

}

module.exports = new TasksPage();
