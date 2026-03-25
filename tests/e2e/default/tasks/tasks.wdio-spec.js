const path = require('path');

const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtDbUtils = require('@utils/cht-db');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Tasks', () => {

  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter1 = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const districtHospital = places.get('district_hospital');
  const healthCenter2 = placeFactory.place().build({
    name: 'health_center_2',
    type: CONTACT_TYPES.HEALTH_CENTER,
    parent: { _id: districtHospital._id },
  });
  const chwContact = personFactory.build({
    name: 'Megan Spice',
    phone: '+12068881234',
    place: healthCenter1._id,
    parent: healthCenter1,
  });
  const chw = userFactory.build({
    username: 'offlineuser_tasks',
    isOffline: true,
    place: healthCenter1._id,
    contact: chwContact._id,
  });
  const patient = personFactory.build({
    name: 'patient1',
    patient_id: 'patient1',
    parent: clinic,
    reported_date: new Date().getTime(),
  });
  const patient2 = personFactory.build({
    name: 'patient2',
    patient_id: 'patient2',
    parent: healthCenter1,
    reported_date: new Date().getTime(),
  });

  before(async () => {
    await utils.saveDocs([
      ...places.values(), healthCenter2, chwContact, patient, patient2,
    ]);
    await utils.createUsers([ chw ]);
    await sentinelUtils.waitForSentinel();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);
    await loginPage.login(chw);
  });

  it('should remove task from list when CHW completes a task successfully', async () => {
    const CONFIG_PATH = 'tasks-breadcrumbs-config.js';
    const taskConfig = require(`./config/${CONFIG_PATH}`);

    await tasksPage.compileTasks(CONFIG_PATH, true);
    await commonPage.goToTasks();
    expect(await tasksPage.getTasks()).to.have.length(3);

    const task = await tasksPage.getTaskByContactAndForm(patient.name, taskConfig[0].name);
    await task.click();
    await tasksPage.waitForTaskContentLoaded('Home Visit');
    const taskElement = await tasksPage.getOpenTaskElement();
    await genericForm.submitForm();

    await taskElement.waitForDisplayed({ reverse: true });
    await commonPage.sync();
    expect(await tasksPage.getTasks()).to.have.length(2);
  });

  it('should add a task when CHW completes a task successfully, and that task creates another task', async () => {
    const CONFIG_PATH = 'infinite-tasks-config.js';
    const taskConfig = require(`./config/${CONFIG_PATH}`);

    await tasksPage.compileTasks(CONFIG_PATH, true);

    await commonPage.goToTasks();
    expect(await tasksPage.getTasks()).to.have.length(2);
    const task = await tasksPage.getTaskByContactAndForm(chwContact.name, taskConfig[0].name);
    await task.click();
    await tasksPage.waitForTaskContentLoaded('Home Visit');
    await genericForm.submitForm();
    await commonPage.sync();
    expect(await tasksPage.getTasks()).to.have.length(3);
  });

  it('should load all tasks at once', async () => {
    const CONFIG_PATH = 'tasks-multiple-config.js';
    const taskConfig = require(`./config/${CONFIG_PATH}`);
    await tasksPage.compileTasks('tasks-multiple-config.js', true);

    await commonPage.goToTasks();
    const list = await tasksPage.getTasks();
    const infos = await tasksPage.getTasksListInfos(list);
    const nbrContacts = 2;
    expect(infos).to.have.length(taskConfig.length * nbrContacts);

    for (let i = 0; i < (infos.length/nbrContacts); i++) {
      expect(infos).to.include.deep.members([
        {
          contactName: chwContact.name,
          formTitle: `person_create_${i + 1}`,
          lineage: '',
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: patient2.name,
          formTitle: `person_create_${i + 1}`,
          lineage: '',
          dueDateText: 'Due today',
          overdue: true
        },
      ]);
    }
    await commonPage.loadNextInfiniteScrollPage();
    expect(await tasksPage.isTaskElementDisplayed('p', 'No more tasks')).to.be.true;
  });

  it('Should show error message for bad config', async () => {
    await commonPage.reloadSession();
    await tasksPage.compileTasks('tasks-error-config.js', false);
    await loginPage.login(chw);

    await commonPage.goToTasks();
    const { errorMessage, url, username, errorStack } = await commonPage.getErrorLog();
    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching tasks');
    expect(await errorStack.isDisplayed()).to.be.true;
    expect(await errorStack.getText()).to
      .include('TypeError: Cannot read properties of undefined (reading \'name\')');

    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    feedbackDocs.forEach(feedbackDoc => {
      expect(feedbackDoc.info.message).to.include('Cannot read properties of undefined (reading \'name\')');
    });

    await chtDbUtils.clearFeedbackDocs();
  });

  describe('contact tasks', () => {
    beforeEach(async () => {
      await tasksPage.compileTasks('tasks-contact-config.js', true);
      await commonPage.goToTasks();
    });

    it('should launch an add contact form when type is provided in content', async () => {
      expect(await tasksPage.getTasks()).to.have.length(4);
      const task = await tasksPage.getTaskByContactAndForm(clinic.name, 'Add Household Members');
      await task.click();

      expect(await browser.getUrl()).to.include(`/contacts/${clinic._id}/add/person`);
      expect(await genericForm.getFormTitle()).to.equal('New person');
      await genericForm.cancelForm();
      await modalPage.submit();
    });

    it('should launch an edit contact form when edit_id is provided in content', async () => {
      expect(await tasksPage.getTasks()).to.have.length(4);
      const task = await tasksPage.getTaskByContactAndForm(chwContact.name, 'Edit Person');
      await task.click();

      expect(await genericForm.getFormTitle()).to.equal('Edit person');
      expect(await browser.getUrl()).to.include(`/contacts/${chwContact._id}/edit`);
      await genericForm.cancelForm();
      await modalPage.submit();
    });
  });
});
