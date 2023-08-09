const taskListSelector = '#tasks-list';
const taskFormSelector = '#task-report';
const tasksGroupSelector = '#tasks-group .item-content';
const formTitleSelector = `${taskFormSelector} h3#form-title`;
const noSelectedTaskSelector = '.empty-selection';
const errorLogSelector = `${taskListSelector} error-log`;

const tasksList = () => $(taskListSelector);

const getErrorLog = async () => {
  await $(errorLogSelector).waitForDisplayed();

  const errorMessage = await (await $('.error-details span')).getText();
  const userDetails = await (await $$('.error-details dl dd'));
  const errorStack = await (await $('pre code'));

  const username = await userDetails[0].getText();
  const url = await userDetails[1].getText();
  return { errorMessage, url, username, errorStack };
};

const getTaskById = (emissionId) => $(`${taskListSelector} li[data-record-id="${emissionId}"`);
const getTasks = () => $$(`${taskListSelector} li.content-row`);

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
  const emissionId = (await browser.getUrl()).split('/').slice(-1)[0];
  const taskLi = await getTaskById(emissionId);
  const submitButton = await $(`${taskFormSelector} button.btn.submit`);
  await submitButton.waitForDisplayed();
  await submitButton.click();
  await taskLi.waitForDisplayed({ reverse: true });
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
  getTaskInfo,
  getTasksListInfos,
  submitTask,
  waitForTasksGroupLoaded,
  getTasksInGroup,
  noSelectedTask,
  getErrorLog
};
