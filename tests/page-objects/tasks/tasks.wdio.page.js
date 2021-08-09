const chai = require('chai');

const taskListSelector = '#tasks-list';
const taskFormSelector = '#task-report';
const tasksGroupSelector = '#tasks-group .item-content';
const formTitleSelector = `${taskFormSelector} h3#form-title`;

const tasksList = () => $(taskListSelector);


const getTaskById = (emissionId) => {
  return $(`${taskListSelector} li[data-record-id="${emissionId}"`);
};

const getTasks = () => {
  return $$(`${taskListSelector} li`);
};

const getContactNameAndFormTitle = async (taskElement) => {
  const contactName = await (await taskElement.$('h4 span')).getText();
  const formTitle = await (await taskElement.$('.summary p')).getText();

  return { contactName, formTitle };
};

const getTaskByContactAndForm = async (name, title) => {
  const tasks = await getTasks();
  for (const task of tasks) {
    const { contactName, formTitle } = await getContactNameAndFormTitle(task);

    if (contactName === name && formTitle === title) {
      await task.scrollIntoView();
      return task;
    }
  }
};

const goToTasksTab = async () => {
  await browser.url('/#/tasks');
  await (await tasksList()).waitForDisplayed();
  await browser.waitUntil(async () => (await getTasks()).length, {
    timeout: 4000,
    timeoutMsg: 'Timed out waiting for tasks to load'
  });
};

const waitForTaskContentLoaded = async (name) => {
  await (await $(formTitleSelector)).waitForDisplayed();
  chai.expect(await (await $(`${formTitleSelector}`)).getText()).to.equal(name);
};

const submitTask = async () => {
  const submitButton = await $(`${taskFormSelector} button.btn.submit`);
  await submitButton.waitForDisplayed();
  await submitButton.click();
};

const waitForTasksGroupLoaded = async () => {
  const tasksGroupPage = await $(tasksGroupSelector);
  await tasksGroupPage.waitForDisplayed();
  const title = await (await $(`${tasksGroupSelector} .action-header h3`)).getText();
  chai.expect(title).to.equal('Other household tasks');
};

const getTasksInGroup = () => {
  return $$(`${tasksGroupSelector} li`);
};

module.exports = {
  tasksList,
  getTasks,
  goToTasksTab,
  getTaskById,
  getTaskByContactAndForm,
  waitForTaskContentLoaded,
  getContactNameAndFormTitle,
  submitTask,
  waitForTasksGroupLoaded,
  getTasksInGroup,
};
