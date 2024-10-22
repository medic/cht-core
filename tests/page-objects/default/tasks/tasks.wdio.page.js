const path = require('path');
const utils = require('@utils');
const chtConfUtils = require('@utils/cht-conf');

const TASK_LIST_SELECTOR = '#tasks-list';
const TASK_FORM_SELECTOR = '#task-report';
const TASKS_GROUP_SELECTOR = '#tasks-group .item-content';
const FORM_TITLE_SELECTOR = `${TASK_FORM_SELECTOR} h3#form-title`;
const NO_SELECTED_TASK_SELECTOR = '.empty-selection';

const getTaskById = (emissionId) => $(`${TASK_LIST_SELECTOR} li[data-record-id="${emissionId}"`);
const getTasks = () => $$(`${TASK_LIST_SELECTOR} li.content-row`);

const getTaskInfo = async (taskElement) => {
  const contactName = await (await taskElement.$('h4 span')).getText();
  const formTitle = await (await taskElement.$('.summary p')).getText();
  let lineage = '';
  if (await (await taskElement.$('.detail')).isExisting()){
    lineage = await (await taskElement.$('.detail')).getText();
  }

  let dueDateText = '';
  if (await (await taskElement.$('.date .relative-date-content')).isExisting()) {
    dueDateText = await (await taskElement.$('.date .relative-date-content')).getText();
  }

  const classAttr = await taskElement.getAttribute('class');
  const overdue = classAttr.split(' ').includes('overdue');

  return { contactName, formTitle, dueDateText, overdue, lineage };
};

const getTasksListInfos = async (tasks) => {
  const infos = [];
  for (const task of tasks) {
    infos.push(await getTaskInfo(task));
  }
  return infos;
};

const getTaskByContactAndForm = async (name, title) => {
  const tasks = await getTasks();
  for (const task of tasks) {
    const { contactName, formTitle } = await getTaskInfo(task);

    if (contactName === name && formTitle === title) {
      await task.scrollIntoView();
      return task;
    }
  }
};

const waitForTaskContentLoaded = async (name) => {
  await (await $(FORM_TITLE_SELECTOR)).waitForDisplayed();
  await browser.waitUntil(async () => {
    const formTitle = await (await $(`${FORM_TITLE_SELECTOR}`)).getText();
    return formTitle === name;
  }, { timeout: 2000 });
};

const getOpenTaskElement = async () => {
  const emissionId = (await browser.getUrl()).split('/').slice(-1)[0];
  return getTaskById(emissionId);
};

const waitForTasksGroupLoaded = async () => {
  await (await $(TASKS_GROUP_SELECTOR)).waitForDisplayed();
  await browser.waitUntil(async () => {
    const pageTitle = await (await $(`${TASKS_GROUP_SELECTOR} .action-header h3`)).getText();
    return pageTitle === 'Other household tasks';
  }, { timeout: 2000 });
};

const getTasksInGroup = () => $$(`${TASKS_GROUP_SELECTOR} li`);
const noSelectedTask = () => $(NO_SELECTED_TASK_SELECTOR);

const openTaskById = async (id, taskType) => {
  await getTaskById(`${id}${taskType}`).click();
  await $(TASK_FORM_SELECTOR).waitForDisplayed();
};

const compileTasks = async (tasksFileName, sync) => {
  await chtConfUtils.initializeConfigDir();
  const tasksFilePath = path.join(__dirname, `../../../e2e/default/tasks/config/${tasksFileName}`);
  const settings = await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
  await utils.updateSettings(settings, { ignoreReload: 'api', sync });
};

const isTaskElementDisplayed = async (type, text) => {
  return await (await $(TASK_LIST_SELECTOR)).$(`${type}*=${text}`).isDisplayed();
};

module.exports = {
  getTasks,
  getTaskByContactAndForm,
  waitForTaskContentLoaded,
  getTaskInfo,
  getTasksListInfos,
  getOpenTaskElement,
  waitForTasksGroupLoaded,
  getTasksInGroup,
  noSelectedTask,
  openTaskById,
  compileTasks,
  isTaskElementDisplayed,
};
