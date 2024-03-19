const path = require('path');

const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtConfUtils = require('@utils/cht-conf');

const contacts = [
  {
    _id: 'fixture:district',
    type: 'district_hospital',
    name: 'District',
    place_id: 'district',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:center',
    type: 'health_center',
    name: 'Health Center',
    parent: { _id: 'fixture:district' },
    place_id: 'health_center',
    reported_date: new Date().getTime(),
  },
];

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

const getTasksInfos = async (tasks) => {
  const infos = [];
  for (const task of tasks) {
    infos.push(await tasksPage.getTaskInfo(task));
  }
  return infos;
};

const updateSettings = async (updates = {}) => {
  await chtConfUtils.initializeConfigDir();
  const tasksFilePath = path.join(__dirname, 'config/load-tasks-config.js');

  const { tasks } = await chtConfUtils.compileNoolsConfig({
    tasks: tasksFilePath,
  });
  updates.tasks = tasks;
  await utils.updateSettings(updates, 'api');
  await commonPage.sync(true);
  await browser.refresh();
};

describe('Load tasks ', () => {
  before(async () => {
    await utils.saveDocs(contacts);
    await utils.createUsers([chw]);
    await sentinelUtils.waitForSentinel();

    await loginPage.login({ username: chw.username, password: chw.password });
    await (await commonPage.analyticsTab()).waitForDisplayed();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('should load and display 300 tasks before displaying "No more Tasks"', async () => {
    await updateSettings();

    await tasksPage.goToTasksTab();
    const infos = await getTasksInfos(await tasksPage.getTasks());

    expect(infos.length).to.equal(300);
    expect(infos[0]).to.eql({
      contactName: 'Bob',
      formTitle: 'person_create_0',
      dueDateText: 'Due today',
      overdue: true,
      lineage: '',
    });
  });
});
