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
  });

  beforeEach(async () => {
    await loginPage.login(chw);
    await commonPage.waitForPageLoaded();
  });

  afterEach(async () => {
    await commonPage.logout();
    await utils.revertSettings(true);
  });

  it('should remove task from list when CHW completes a task successfully', async () => {
    await tasksPage.compileTasks('tasks-breadcrumbs-config.js', true);

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

  it('should add a task when CHW completes a task successfully, and that task creates another task', async () => {
    await tasksPage.compileTasks('tasks-breadcrumbs-config.js', false);

    await commonPage.goToTasks();
    let list = await tasksPage.getTasks();
    expect(list).to.have.length(2);
    let task = await tasksPage.getTaskByContactAndForm('Megan Spice', 'person_create');
    await task.click();
    await tasksPage.waitForTaskContentLoaded('Home Visit');
    const taskElement = await tasksPage.getOpenTaskElement();
    await genericForm.submitForm();
    await taskElement.waitForDisplayed();
    await commonPage.sync({ expectReload: true });
    task = await tasksPage.getTaskByContactAndForm('Megan Spice', 'person_create_follow_up');
    list = await tasksPage.getTasks();
    expect(list).to.have.length(3);
  });

  it('should load multiple pages of tasks on infinite scrolling', async () => {
    await tasksPage.compileTasks('tasks-multiple-config.js', true);

    await commonPage.goToTasks();
    const list = await tasksPage.getTasks();
    const infos = await tasksPage.getTasksListInfos(list);
    expect(infos).to.have.length(134);
    for (let i = 0; i < (infos.length/2); i++) {
      expect(infos).to.include.deep.members([
        {
          contactName: 'Megan Spice',
          formTitle: `person_create_${i + 1}`,
          lineage: '',
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
    await commonPage.loadNextInfiniteScrollPage();
    expect(await tasksPage.isTaskElementDisplayed('p', 'No more tasks')).to.be.true;
  });

  it('Should show error message for bad config', async () => {
    await tasksPage.compileTasks('tasks-error-config.js', true);
    await commonPage.goToTasks();

    const { errorMessage, url, username, errorStack } = await commonPage.getErrorLog();

    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching tasks');
    expect(await errorStack.isDisplayed()).to.be.true;
    expect(await errorStack.getText()).to
      .include('TypeError: Cannot read properties of undefined (reading \'name\')');

    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocs.length).to.equal(1);
    expect(feedbackDocs[0].info.message).to.include('Cannot read properties of undefined (reading \'name\')');
    await chtDbUtils.clearFeedbackDocs();
  });
});
