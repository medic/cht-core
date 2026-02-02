const path = require('path');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Task overdue bubble counter', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const chwContact = personFactory.build({
    name: 'CHW User',
    phone: '+12068881234',
    place: healthCenter._id,
    parent: healthCenter,
  });
  const chw = userFactory.build({
    username: 'offlineuser_bubble',
    isOffline: true,
    place: healthCenter._id,
    contact: chwContact._id,
  });
  const patients = Array.from({ length: 3 }).map((_, i) => personFactory.build({
    name: `Number${i}`,
    patient_id: `patient_${i}`,
    parent: places.get('clinic'),
    reported_date: new Date().getTime(),
  }));

  const CONFIGURED_OVERDUE_TASKS = 3;

  const getTaskBubble = async () => {
    const tasksTab = await commonPage.tabsSelector.taskTab();
    return await tasksTab.$('.mm-badge');
  };

  const getTasksBubbleCount = async () => {
    const bubble = await getTaskBubble();

    if (!(await bubble.isExisting())) {
      return 0;
    }

    const bubbleText = await bubble.getText();
    // Handle "100 +" format
    if (bubbleText.includes('+')) {
      return 100;
    }
    return parseInt(bubbleText, 10);
  };

  const isBubbleDisplayed = async () => {
    const bubble = await getTaskBubble();
    return await bubble.isDisplayed();
  };

  const compileBubbleTasks = async (tasksFileName, sync = true) => {
    await chtConfUtils.initializeConfigDir();
    const tasksFilePath = path.join(__dirname, `config/${tasksFileName}`);
    const settings = await chtConfUtils.compileConfig({ tasks: tasksFilePath });
    settings.permissions = await utils.getUpdatedPermissions(['chw'], [], ['can_view_tasks_group']);

    await commonPage.goToMessages();
    await utils.updateSettings(settings, { ignoreReload: 'api', sync, refresh: sync, revert: true });
  };

  const submitForm = async (patientName, taskTitle) => {
    const initialTasks = (await tasksPage.getTasks()).length;
    const taskElement = await tasksPage.getTaskByContactAndForm(patientName, taskTitle);
    await taskElement.click();
    await tasksPage.waitForTaskContentLoaded('Home Visit');
    await genericForm.submitForm();

    await browser.waitUntil(async () => (await tasksPage.getTasks()).length < initialTasks);
  };

  const waitForBubble = async () => {
    await commonPage.goToMessages();
    await browser.waitUntil(async () => await isBubbleDisplayed());
  };

  before(async () => {
    await utils.saveDocs([...places.values(), chwContact, ...patients]);
    await utils.createUsers([chw]);
    await sentinelUtils.waitForSentinel();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    await loginPage.login(chw);
  });

  beforeEach(async () => {
    await commonPage.goToMessages();
  });

  it('should not display bubble when there are no overdue tasks', async () => {
    await compileBubbleTasks('no-overdue-tasks-config.js', true);

    await browser.pause(1000);

    // Bubble should not be displayed
    expect(await isBubbleDisplayed()).to.be.false;
  });

  it('should display bubble with count of overdue tasks', async () => {
    await compileBubbleTasks('overdue-bubble-config.js');
    await waitForBubble();

    // Check that bubble is displayed on tasks tab
    expect(await isBubbleDisplayed()).to.be.true;

    // Should show 3 overdue tasks
    const bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(patients.length * CONFIGURED_OVERDUE_TASKS);
  });

  it('should update bubble count when task is completed', async () => {
    await waitForBubble();

    let bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(patients.length * CONFIGURED_OVERDUE_TASKS);

    await commonPage.goToTasks();
    await submitForm(patients[0].name, 'task_overdue_1');

    await browser.waitUntil(async () => (await getTasksBubbleCount() !== bubbleCount));

    bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(6);
  });

  it('should update task bubble when task is externally updated', async () => {
    await waitForBubble();

    const bubbleCount = await getTasksBubbleCount();

    const homeVisitReport = {
      type: 'data_record',
      form: 'home_visit',
      content_type: 'xml',
      fields: {
        visited_contact_uuid: patients[1]._id,
        patient_uuid: patients[1]._id,
        patient_id: patients[1].patient_id,
      },
      contact: {
        _id: chwContact._id,
      },
      reported_date: new Date().getTime(),
    };
    await utils.saveDoc(homeVisitReport);
    await commonPage.sync();

    await commonPage.goToTasks();

    await browser.waitUntil(async () => (await getTasksBubbleCount() !== bubbleCount));
    expect(await getTasksBubbleCount()).to.equal(3);
  });

  it('should hide bubble when all overdue tasks are completed', async () => {
    await waitForBubble();

    expect(await getTasksBubbleCount()).to.equal(3);

    await commonPage.goToTasks();
    await submitForm(patients[2].name, 'task_overdue_1');

    await (await getTaskBubble()).waitForDisplayed({ reverse: true, timeout: 5000 });
  });
});
