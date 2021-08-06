const taskListSelector = '#tasks-list';
const taskFormSelector = '#task-report';
const tasksList = () => $(taskListSelector);

const getTaskById = (emissionId) => {
  return $(`${taskListSelector} li[data-record-id="${emissionId}"`);
};

const getTasks = () => {
  return $(`${taskListSelector} li`);
};

const getTaskByContact = async (name) => {
  return (await $(`${taskListSelector} li h4`)).$(`span=${name}`);
};

const goToTasksTab = async () => {
  await browser.url('/#/tasks');
  await (await tasksList()).waitForDisplayed();
};

const waitForTaskContentLoaded = async (name) => {
  await (await $(taskFormSelector)).waitForDisplayed();
  expect(await (await $(`${taskFormSelector} #form-title`)).getText()).to.equal(name);
};

module.exports = {
  tasksList,
  getTasks,
  goToTasksTab,
  getTaskById,
  getTaskByContact,
  waitForTaskContentLoaded,
};
