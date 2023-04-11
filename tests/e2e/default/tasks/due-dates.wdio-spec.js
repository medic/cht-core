const path = require('path');

const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtConfUtils = require('../../../cht-conf-utils');

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
  const tasksFilePath = path.join(__dirname, 'config/due-dates-config.js');

  const { tasks } = await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
  updates.tasks = tasks;
  await utils.updateSettings(updates, 'api');
  await commonPage.sync(true);
  await browser.refresh();
};

describe('Task list due dates', () => {
  before(async () => {
    await utils.saveDocs(contacts);
    await utils.createUsers([ chw ]);
    await sentinelUtils.waitForSentinel();

    await loginPage.login({ username: chw.username, password: chw.password });
    await commonPage.closeTour();
    await (await commonPage.analyticsTab()).waitForDisplayed();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('should display correct due dates with default settings', async () => {
    await updateSettings();

    await tasksPage.goToTasksTab();
    const infos = await getTasksInfos(await tasksPage.getTasks());

    expect(infos).to.have.deep.members([
      { contactName: 'Bob', formTitle: 'person_create_7', dueDateText: '', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_5', dueDateText: '', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_2', dueDateText: '2 days left', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_1', dueDateText: '1 day left', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_0', dueDateText: 'Due today', overdue: true, lineage: '' },
      {
        contactName: 'Bob',
        formTitle: 'person_create_overdue_1',
        dueDateText: 'Due today',
        overdue: true,
        lineage: ''
      },
      {
        contactName: 'Bob',
        formTitle: 'person_create_overdue_2',
        dueDateText: 'Due today',
        overdue: true,
        lineage: ''
      },
      {
        contactName: 'Bob',
        formTitle: 'person_create_overdue_5',
        dueDateText: 'Due today',
        overdue: true,
        lineage: ''
      },
    ]);
  });

  it('should display correct due dates with taskDaysOverdue setting', async () => {
    await updateSettings({ task_days_overdue: true });

    await tasksPage.goToTasksTab();
    const infos = await getTasksInfos(await tasksPage.getTasks());

    expect(infos).to.have.deep.members([
      { contactName: 'Bob', formTitle: 'person_create_7', dueDateText: '', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_5', dueDateText: '', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_2', dueDateText: '2 days left', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_1', dueDateText: '1 day left', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_0', dueDateText: 'Due today', overdue: true, lineage: '' },
      {
        contactName: 'Bob',
        formTitle: 'person_create_overdue_1',
        dueDateText: 'Due yesterday',
        overdue: true,
        lineage: ''
      },
      {
        contactName: 'Bob',
        formTitle: 'person_create_overdue_2',
        dueDateText: 'Due 2 days ago',
        overdue: true,
        lineage: ''
      },
      {
        contactName: 'Bob',
        formTitle: 'person_create_overdue_5',
        dueDateText: 'Due 5 days ago',
        overdue: true,
        lineage: ''
      },
    ]);
  });

  it('should display correct due dates with taskDaysOverdue setting and simple translation', async () => {
    await utils.addTranslations('en', { 'task.overdue.days': 'Late' });
    await updateSettings({ task_days_overdue: true });

    await tasksPage.goToTasksTab();
    const infos = await getTasksInfos(await tasksPage.getTasks());

    expect(infos).to.have.deep.members([
      { contactName: 'Bob', formTitle: 'person_create_7', dueDateText: '', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_5', dueDateText: '', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_2', dueDateText: '2 days left', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_1', dueDateText: '1 day left', overdue: false, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_0', dueDateText: 'Late', overdue: true, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_overdue_1', dueDateText: 'Late', overdue: true, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_overdue_2', dueDateText: 'Late', overdue: true, lineage: '' },
      { contactName: 'Bob', formTitle: 'person_create_overdue_5', dueDateText: 'Late', overdue: true, lineage: '' },
    ]);
  });
});
