const path = require('path');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

describe('Tasks group landing page', () => {
  const todayDate = Date.now();

  const places = placeFactory.generateHierarchy(['district_hospital', 'health_center']);
  const healthCenter = places.get('health_center');

  const politiciansClinic = placeFactory.place().build({
    type: 'clinic',
    name: 'Politicians',
    parent: healthCenter,
    reported_date: todayDate
  });
  const artistClinic = placeFactory.place().build({
    type: 'clinic',
    name: 'Artists',
    parent: healthCenter,
    reported_date: todayDate,
  });
  const scientistsClinic = placeFactory.place().build({
    type: 'clinic',
    name: 'Scientists',
    parent: healthCenter,
    reported_date: todayDate,
  });

  const people = [
    personFactory.build({
      name: 'Albert Einstein',
      patient_id: 'einstein',
      parent: scientistsClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Charles Darwin',
      patient_id: 'darwin',
      parent: scientistsClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Nikola Tesla',
      patient_id: 'tesla',
      parent: scientistsClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Leonardo da Vinci',
      patient_id: 'leonardo',
      parent: artistClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Francisco Goya',
      patient_id: 'goya',
      parent: artistClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Wolfgang Amadeus Mozart',
      patient_id: 'mozart',
      parent: artistClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Napoleon Bonaparte',
      patient_id: 'napoleon',
      parent: politiciansClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Julius Caesar',
      patient_id: 'caesar',
      parent: politiciansClinic,
      reported_date: todayDate
    }),
    personFactory.build({
      name: 'Queen Victoria',
      patient_id: 'victoria',
      parent: politiciansClinic,
      reported_date: todayDate
    }),
  ];

  const chw = userFactory.build({
    username: 'bob',
    place: healthCenter._id,
    contact: { _id: 'fixture:user:bob', name: 'Bob' }
  });

  const supervisor = userFactory.build({
    username: 'super',
    place: healthCenter._id,
    contact: { _id: 'fixture:user:super', name: 'Nemo' },
    roles: ['chw_supervisor'],
  });

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
    await modalPage.body().waitForClickable();
    expect(await modalPage.body().getText()).to.equal(
      'Are you sure you want to leave this page? You will no longer be able to see this household\'s other tasks.'
    );
  };

  before(async () => {
    await utils.saveDocs([...places.values(), politiciansClinic, artistClinic, scientistsClinic, ...people.values()]);
    await utils.createUsers([chw, supervisor]);
    await sentinelUtils.waitForSentinel();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);
    await tasksPage.compileTasks('tasks-group-config.js', false);
  });

  after(async () => {
    await utils.deleteUsers([ chw, supervisor ]);
    await utils.revertDb([/^form:/], true);
    await utils.revertSettings(true);
  });

  describe('for chw', () => {
    before(async () => {
      await loginPage.login(chw);
    });

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should have tasks', async () => {
      await commonPage.goToTasks();
      const list = await tasksPage.getTasks();
      expect(list.length).to.equal(people.length + 5);
    });

    it('should display tasks group landing page after task completion', async () => {
      const task = await tasksPage.getTaskByContactAndForm('Queen Victoria', 'person_create');
      await task.click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      const taskElement = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElement.waitForDisplayed({ reverse: true });

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
      const taskElement = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElement.waitForDisplayed({ reverse: true });
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
      await modalPage.cancel();
      await modalPage.checkModalHasClosed();

      await tasksPage.waitForTasksGroupLoaded();

      // submitting the modal takes us to the other task
      await taskFromOtherGroup.click();
      await expectTasksGroupLeaveModal();
      await modalPage.submit();

      await tasksPage.waitForTaskContentLoaded('Place Home Visit');
      const taskElement = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElement.waitForDisplayed({ reverse: true });

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
      const taskElement = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElement.waitForDisplayed({ reverse: true });

      await tasksPage.waitForTasksGroupLoaded();

      // clicking on another page displays the modal
      await commonPage.goToPeople('', false);
      await expectTasksGroupLeaveModal();
      await modalPage.submit();
      await contactsPage.leftPanelSelectors.contactList().waitForDisplayed();
      await commonPage.waitForPageLoaded();
    });

    it('should not show page when there are no more household tasks', async () => {
      await commonPage.goToTasks();
      await commonPage.waitForPageLoaded();
      await tasksPage.getTasks();
      const task = await tasksPage.getTaskByContactAndForm('Napoleon Bonaparte', 'person_create');
      await task.click();

      await tasksPage.waitForTaskContentLoaded('Home Visit');
      const taskElementHomeVisit = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElementHomeVisit.waitForDisplayed({ reverse: true });

      await tasksPage.waitForTasksGroupLoaded();
      const tasksInGroup = await tasksPage.getTasksInGroup();

      expect(tasksInGroup.length).to.equal(1);
      const lastTask = await tasksPage.getTaskByContactAndForm('Politicians', 'clinic_create');
      await lastTask.click();

      await tasksPage.waitForTaskContentLoaded('Place Home Visit');
      const taskElementPlaceHomeVisit = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElementPlaceHomeVisit.waitForDisplayed({ reverse: true });

      const emptySelection = await tasksPage.noSelectedTask();
      await (emptySelection).waitForDisplayed();
      await commonPage.waitForLoaderToDisappear(emptySelection);
      expect(await emptySelection.getText()).to.equal('No task selected');
    });

    it('should not show page when submitting task for contact with no leaf type place in lineage', async () => {
      const task = await tasksPage.getTaskByContactAndForm('Bob', 'person_create');
      await task.click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      const taskElement = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElement.waitForDisplayed({ reverse: true });

      const emptySelection = await tasksPage.noSelectedTask();
      await (emptySelection).waitForDisplayed();
      await commonPage.waitForLoaderToDisappear(emptySelection);
      expect(await emptySelection.getText()).to.equal('No task selected');
    });
  });

  describe('for supervisor', () => {
    before(async () => {
      await loginPage.login(supervisor);
    });

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should have tasks', async () => {
      await commonPage.goToTasks();
      const list = await tasksPage.getTasks();
      const taskNamesAndTitles = await getTaskNamesAndTitles(list);
      expect(taskNamesAndTitles).to.include.deep.members([
        { contactName: 'Albert Einstein', formTitle: 'person_create' },
        { contactName: 'Charles Darwin', formTitle: 'person_create' },
        { contactName: 'Nikola Tesla', formTitle: 'person_create' },
        { contactName: 'Scientists', formTitle: 'clinic_create' },
      ]);
    });

    it('should not display task landing page after task completion', async () => {
      const task = await tasksPage.getTaskByContactAndForm('Albert Einstein', 'person_create');
      await task.click();

      await tasksPage.waitForTaskContentLoaded('Home Visit');
      const taskElement = await tasksPage.getOpenTaskElement();
      await genericForm.submitForm();
      await taskElement.waitForDisplayed({ reverse: true });

      const emptySelection = await tasksPage.noSelectedTask();
      await (emptySelection).waitForDisplayed();
      await commonPage.waitForLoaderToDisappear(emptySelection);
      expect(await emptySelection.getText()).to.equal('No task selected');
    });
  });

});
