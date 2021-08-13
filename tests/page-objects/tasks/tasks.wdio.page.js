const taskListSelector = '#tasks-list';
const taskFormSelector = '#task-report';
const tasksGroupSelector = '#tasks-group .item-content';
const formTitleSelector = `${taskFormSelector} h3#form-title`;
const noSelectedTaskSelector = '.empty-selection';

const tasksList = () => $(taskListSelector);
const getTaskById = (emissionId) => $(`${taskListSelector} li[data-record-id="${emissionId}"`);
const getTasks = () => $$(`${taskListSelector} li`);

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
  await browser.waitUntil(async () => {
    const formTitle = await (await $(`${formTitleSelector}`)).getText();
    return formTitle === name;
  }, { timeout: 2000 });
};

const submitTask = async () => {
  const submitButton = await $(`${taskFormSelector} button.btn.submit`);
  await submitButton.waitForDisplayed();
  await submitButton.click();
};

const waitForTasksGroupLoaded = async () => {
  await (await $(tasksGroupSelector)).waitForDisplayed();
  await browser.waitUntil(async () => {
    const pageTitle = await (await $(`${tasksGroupSelector} .action-header h3`)).getText();
    return pageTitle === 'Other household tasks';
  }, { timeout: 2000 });
};

const getTasksInGroup = () => $$(`${tasksGroupSelector} li`);
const noSelectedTask = () => $(noSelectedTaskSelector);

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
  noSelectedTask,
};
