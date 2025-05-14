const path = require('path');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');

describe('Task list due dates', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const chw = userFactory.build({ place: healthCenter._id, contact: { _id: 'fixture:user:bob', name: 'Bob' } });

  const updateDueDatesSettings = async (updates = {}) => {
    await chtConfUtils.initializeConfigDir();
    const tasksFilePath = path.join(__dirname, 'config/due-dates-config.js');

    const { tasks } = await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
    updates.tasks = tasks;
    await utils.updateSettings(updates, { ignoreReload: 'api', sync: true, refresh: true });
  };

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([ chw ]);
    await sentinelUtils.waitForSentinel();

    await loginPage.login(chw);
    await commonPage.tabsSelector.analyticsTab().waitForDisplayed();
  });

  after(async () => {
    await utils.deleteUsers([ chw ]);
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('should display correct due dates with default settings', async () => {
    await updateDueDatesSettings();

    await commonPage.goToTasks();
    const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());

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
    await updateDueDatesSettings({ task_days_overdue: true });

    await commonPage.goToTasks();
    const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());

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
    await updateDueDatesSettings({ task_days_overdue: true });

    await commonPage.goToTasks();
    const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());

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
