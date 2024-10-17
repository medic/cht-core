const { v4: uuid } = require('uuid');
const path = require('path');

const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtDbUtils = require('@utils/cht-db');

const compileTasks = async (tasksFileName) => {
  await chtConfUtils.initializeConfigDir();
  const tasksFilePath = path.join(__dirname, `config/${tasksFileName}`);
  return await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
};

describe('Tasks', () => {

  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter1 = places.get('health_center');
  const districtHospital = places.get('district_hospital');
  const healthCenter2 = placeFactory.place().build({
    name: 'health_center_2',
    type: 'health_center',
    parent: { _id: districtHospital._id },
  });
  const chwContact = {
    _id: 'fixture:user:user1',
    name: 'chw',
    phone: '+12068881234',
    type: 'person',
    place: healthCenter1._id,
    parent: {
      _id: healthCenter1._id,
      parent: healthCenter1.parent
    },
  };
  const supervisorContact = {
    _id: 'fixture:user:user2',
    name: 'supervisor',
    phone: '+12068881235',
    type: 'person',
    place: districtHospital._id,
    parent: {
      _id: districtHospital._id,
    },
  };
  const chw = userFactory.build({
    username: 'offlineuser_tasks',
    isOffline: true,
    place: healthCenter1._id,
    contact: chwContact._id,
  });
  const supervisor = userFactory.build({
    username: 'supervisor_tasks',
    roles: [ 'chw_supervisor' ],
    place: districtHospital._id,
    contact: supervisorContact._id,
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
  const contactWithManyPlaces = personFactory.build({ parent: healthCenter1 });
  const userWithManyPlaces = {
    _id: 'org.couchdb.user:offline_many_facilities',
    language: 'en',
    known: true,
    type: 'user-settings',
    roles: [ 'chw' ],
    facility_id: [ healthCenter1._id, healthCenter2._id ],
    contact_id: contactWithManyPlaces._id,
    name: 'offline_many_facilities'
  };
  const userWithManyPlacesPass = uuid();

  before(async () => {
    await utils.saveDocs([
      ...places.values(), healthCenter2, chwContact, supervisorContact, patient, patient2,
      contactWithManyPlaces, userWithManyPlaces,
    ]);
    await utils.request({
      path: `/_users/${userWithManyPlaces._id}`,
      method: 'PUT',
      body: { ...userWithManyPlaces, password: userWithManyPlacesPass, type: 'user' },
    });
    await utils.createUsers([ chw, supervisor ]);
    await sentinelUtils.waitForSentinel();

    await chtConfUtils.initializeConfigDir();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

  });

  beforeEach(async () => {
    await loginPage.login(chw);
    await commonPage.waitForPageLoaded();
  });

  afterEach(async () => {
    await commonPage.logout();
    await utils.revertSettings(true);
  });

  after(async () => {
    await utils.deleteUsers([chw]);
    await utils.revertDb([/^form:/], true);
    await browser.deleteCookies();
    await browser.refresh();
  });

  it('should load multiple pages of tasks on infinite scrolling', async () => {
    const settings = await compileTasks('tasks-multiple-config.js');
    await utils.updateSettings(settings, { ignoreReload: 'api', sync: true });

    await commonPage.goToTasks();
    const list = await tasksPage.getTasks();
    const infos = await tasksPage.getTasksListInfos(list);
    expect(infos).to.have.length(201);
    for (let i = 0; i < (infos.length/3); i++) {
      expect(infos).to.include.deep.members([
        {
          contactName: 'Mary Smith',
          formTitle: `person_create_${i + 1}`,
          lineage: '',
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient1',
          formTitle: `person_create_${i + 1}`,
          lineage: 'clinic2',
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient2',
          formTitle: `person_create_${i + 1}`,
          lineage: '',
          dueDateText: 'Due today',
          overdue: true
        },
      ]);
    }
    await tasksPage.scrollToLastTaskItem();
    expect(await commonEnketoPage.isElementDisplayed('p', 'No more tasks', 'div#tasks-list')).to.be.true;
  });

  it('should remove task from list when CHW completes a task successfully', async () => {
    const settings = await compileTasks('tasks-breadcrumbs-config.js');
    await utils.updateSettings(settings, { ignoreReload: 'api', sync: true });
    
    await commonPage.goToTasks();
    let list = await tasksPage.getTasks();
    expect(list).to.have.length(3);
    const task = await tasksPage.getTaskByContactAndForm('patient1', 'person_create');
    await task.click();
    await tasksPage.waitForTaskContentLoaded('Home Visit');
    const taskElement = await tasksPage.getOpenTaskElement();
    await genericForm.submitForm();
    await taskElement.waitForDisplayed({ reverse: true });
    list = await tasksPage.getTasks();
    expect(list).to.have.length(2);
  });

  // WIP
  it('should add a task when CHW completes a task successfully, and that task creates another task', async () => {
    const settings = await compileTasks('tasks-breadcrumbs-config.js');
    await utils.updateSettings(settings, { ignoreReload: 'api', sync: true });
    
    await commonPage.goToTasks();
    let list = await tasksPage.getTasks();
    expect(list).to.have.length(2);
    const task = await tasksPage.getTaskByContactAndForm('patient2', 'person_create');
    await task.click();
    await tasksPage.waitForTaskContentLoaded('Home Visit');
    const taskElement = await tasksPage.getOpenTaskElement();
    await genericForm.submitForm();
    await taskElement.waitForDisplayed({ reverse: true });
    list = await tasksPage.getTasks();
    expect(list).to.have.length(1);
    // validate new task is created = taskList length should still be 2
  });

  it('Should show error message for bad config', async () => {
    const settings = await compileTasks('tasks-error-config.js');
    await utils.updateSettings(settings, { ignoreReload: 'api', sync: true });
    await commonPage.goToTasks();

    const { errorMessage, url, username, errorStack } = await commonPage.getErrorLog();

    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching tasks');
    expect(await (await errorStack.isDisplayed())).to.be.true;
    expect(await (await errorStack.getText())).to
      .include('TypeError: Cannot read properties of undefined (reading \'name\')');

    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocs.length).to.equal(1);
    expect(feedbackDocs[0].info.message).to.include('Cannot read properties of undefined (reading \'name\')');
    await chtDbUtils.clearFeedbackDocs();
  });
});
