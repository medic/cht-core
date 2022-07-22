const path = require('path');

const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const tasksPage = require('../../../page-objects/tasks/tasks.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const commonPage = require('../../../page-objects/common/common.wdio.page');
const contactsPage = require('../../../page-objects/contacts/contacts.wdio.page');
const chtConfUtils = require('../../../cht-conf-utils');
const modalPage = require('../../../page-objects/common/modal.wdio.page');

const places = [
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

const clinics = [
  {
    _id: 'fixture:politicians',
    type: 'clinic',
    name: 'Politicians',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'politicians',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:artists',
    type: 'clinic',
    name: 'Artists',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'artists',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:scientists',
    type: 'clinic',
    name: 'Scientists',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'scientists',
    reported_date: new Date().getTime(),
  },
];

const people = [
  {
    _id: 'fixture:einstein',
    name: 'Albert Einstenin',
    type: 'person',
    patient_id: 'einstein',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:darwin',
    name: 'Charles Darwin',
    type: 'person',
    patient_id: 'darwin',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:tesla',
    name: 'Nikola Tesla',
    type: 'person',
    patient_id: 'tesla',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:leonardo',
    name: 'Leonardo da Vinci',
    type: 'person',
    patient_id: 'leonardo',
    parent: { _id: 'fixture:artists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:goya',
    name: 'Francisco Goya',
    type: 'person',
    patient_id: 'goya',
    parent: { _id: 'fixture:artists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:mozart',
    name: 'Wolfgang Amadeus Mozart',
    type: 'person',
    patient_id: 'mozart',
    parent: { _id: 'fixture:artists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:napoleon',
    name: 'Napoleon Bonaparte',
    type: 'person',
    patient_id: 'napoleon',
    parent: { _id: 'fixture:politicians', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:caesar',
    name: 'Julius Caesar',
    type: 'person',
    patient_id: 'caesar',
    parent: { _id: 'fixture:politicians', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:victoria',
    name: 'Queen Victoria',
    type: 'person',
    patient_id: 'victoria',
    parent: { _id: 'fixture:politicians', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
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

const supervisor = {
  username: 'super',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:super', name: 'Nemo' },
  roles: ['chw_supervisor'],
};

const getTaskNamesAndTitles = async (tasks) => {
  const tasksNamesAndTitles = [];
  for (const task of tasks) {
    const { contactName, formTitle } = await tasksPage.getTaskInfo(task);
    tasksNamesAndTitles.push({ contactName, formTitle });
  }
  return tasksNamesAndTitles;
};

const getGroupTasksNamesAndTitles = async () => {
  const groupTasks = await tasksPage.getTasksInGroup();
  return getTaskNamesAndTitles(groupTasks);
};

const expectTasksGroupLeaveModal = async () => {
  expect(await (await modalPage.body()).getText()).to.equal(
    'Are you sure you want to leave this page? You will no longer be able to see this household\'s other tasks.'
  );
  // modals have an animation, so clicking immediately on any of the buttons, mid animation, might cause the click to
  // land in a different place, instead of the button. So wait for the animation to finish...
  await browser.pause(500);
};

describe('Tasks group landing page', () => {
  before(async () => {
    await utils.saveDocs([...places, ...clinics, ...people]);
    await utils.createUsers([chw, supervisor]);
    await sentinelUtils.waitForSentinel();

    await chtConfUtils.initializeConfigDir();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    const tasksFilePath = path.join(__dirname, 'tasks-group-config.js');
    const { tasks } = await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
    await utils.updateSettings({ tasks }, 'api');
  });

  describe('for chw', () => {
    before(async () => {
      await loginPage.login({ username: chw.username, password: chw.password });
      await commonPage.closeTour();
      await (await commonPage.analyticsTab()).waitForDisplayed();
    });

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should have tasks', async () => {
      await tasksPage.goToTasksTab();
      const list = await tasksPage.getTasks();
      expect(list.length).to.equal(people.length + clinics.length + 2);
    });

    it('should display tasks group landing page after task completion', async () => {
      const task = await tasksPage.getTaskByContactAndForm('Queen Victoria', 'person_create');
      await task.click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await tasksPage.submitTask();

      // tasks group is displayed
      await tasksPage.waitForTasksGroupLoaded();
      const groupTasks = await tasksPage.getTasksInGroup();
      expect(groupTasks.length).to.equal(3);

      const groupTasksNamesAndTitles = await getGroupTasksNamesAndTitles();
      // and we see correct tasks
      expect(groupTasksNamesAndTitles).to.have.deep.members([
        { contactName: 'Julius Caesar', formTitle: 'person_create' },
        { contactName: 'Napoleon Bonaparte', formTitle: 'person_create' },
        { contactName: 'Politicians', formTitle: 'clinic_create' },
      ]);
    });

    it('should open task from the same group', async () => {
      await tasksPage.waitForTasksGroupLoaded();
      // clicking on one of the tasks in the group opens the task
      const groupTasks = await tasksPage.getTasksInGroup();
      for (const task of groupTasks) {
        const info = await tasksPage.getTaskInfo(task);
        if (info.contactName === 'Julius Caesar') {
          await task.click();
          break;
        }
      }

      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await tasksPage.submitTask();
      // tasks group is displayed again
      await tasksPage.waitForTasksGroupLoaded();
      const secondGroupTasks = await tasksPage.getTasksInGroup();
      expect(secondGroupTasks.length).to.equal(2);
    });

    it('should display modal when clicking on a task from another group', async () => {
      await tasksPage.waitForTasksGroupLoaded();

      // clicking on a task from a different group from the list displays a modal
      const taskFromOtherGroup = await tasksPage.getTaskByContactAndForm('Artists', 'clinic_create');
      await taskFromOtherGroup.click();
      await expectTasksGroupLeaveModal();

      // cancelling keeps you on the same page
      await (await modalPage.cancel()).click();
      await (await modalPage.body()).waitForDisplayed({ reverse: true });

      await tasksPage.waitForTasksGroupLoaded();

      // submitting the modal takes us to the other task
      await taskFromOtherGroup.click();
      await expectTasksGroupLeaveModal();
      await (await modalPage.confirm()).click();

      await tasksPage.waitForTaskContentLoaded('Place Home Visit');
      await tasksPage.submitTask();

      await tasksPage.waitForTasksGroupLoaded();
      const groupTasksAndTitles = await getGroupTasksNamesAndTitles();
      expect(groupTasksAndTitles).to.have.deep.members([
        { contactName: 'Leonardo da Vinci', formTitle: 'person_create' },
        { contactName: 'Francisco Goya', formTitle: 'person_create' },
        { contactName: 'Wolfgang Amadeus Mozart', formTitle: 'person_create' },
      ]);
    });

    it('should not display modal when clicking list task from same group', async () => {
      await tasksPage.waitForTasksGroupLoaded();
      const task = await tasksPage.getTaskByContactAndForm('Francisco Goya', 'person_create');
      await task.click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await tasksPage.submitTask();

      await tasksPage.waitForTasksGroupLoaded();

      // clicking on another page displays the modal
      await commonPage.goToPeople('', false);
      await expectTasksGroupLeaveModal();
      await (await modalPage.confirm()).click();
      await (await contactsPage.contactList()).waitForDisplayed();
      await (await commonPage.waitForPageLoaded());
    });

    it('should not show page when there are no more household tasks', async () => {
      await browser.refresh();
      await tasksPage.goToTasksTab();
      await (await commonPage.waitForPageLoaded());
      await tasksPage.getTasks();
      const task = await tasksPage.getTaskByContactAndForm('Napoleon Bonaparte', 'person_create');
      await task.click();

      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await tasksPage.submitTask();

      await tasksPage.waitForTasksGroupLoaded();
      const tasksInGroup = await tasksPage.getTasksInGroup();

      expect(tasksInGroup.length).to.equal(1);
      const lastTask = await tasksPage.getTaskByContactAndForm('Politicians', 'clinic_create');
      await lastTask.click();

      await tasksPage.waitForTaskContentLoaded('Place Home Visit');
      await tasksPage.submitTask();

      const emptySelection = await tasksPage.noSelectedTask();
      await (emptySelection).waitForDisplayed();
      await commonPage.waitForLoaderToDisappear(emptySelection);
      expect(await emptySelection.getText()).to.equal('No task selected');
    });

    it('should not show page when submitting task for contact with no leaf type place in lineage', async () => {
      const task = await tasksPage.getTaskByContactAndForm('Bob', 'person_create');
      await task.click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await tasksPage.submitTask();

      const emptySelection = await tasksPage.noSelectedTask();
      await (emptySelection).waitForDisplayed();
      await commonPage.waitForLoaderToDisappear(emptySelection);
      expect(await emptySelection.getText()).to.equal('No task selected');
    });
  });

  describe('for supervisor', () => {
    before(async () => {
      await loginPage.login({ username: supervisor.username, password: supervisor.password });
      await commonPage.closeTour();
      await (await commonPage.analyticsTab()).waitForDisplayed();
    });

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should have tasks', async () => {
      await tasksPage.goToTasksTab();
      const list = await tasksPage.getTasks();
      const taskNamesAndTitles = await getTaskNamesAndTitles(list);
      expect(taskNamesAndTitles).to.include.deep.members([
        { contactName: 'Albert Einstenin', formTitle: 'person_create' },
        { contactName: 'Charles Darwin', formTitle: 'person_create' },
        { contactName: 'Nikola Tesla', formTitle: 'person_create' },
        { contactName: 'Scientists', formTitle: 'clinic_create' },
      ]);
    });

    it('should not display task landing page after task completion', async () => {
      const task = await tasksPage.getTaskByContactAndForm('Albert Einstenin', 'person_create');
      await task.click();

      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await tasksPage.submitTask();

      const emptySelection = await tasksPage.noSelectedTask();
      await (emptySelection).waitForDisplayed();
      await commonPage.waitForLoaderToDisappear(emptySelection);
      expect(await emptySelection.getText()).to.equal('No task selected');
    });
  });

});
