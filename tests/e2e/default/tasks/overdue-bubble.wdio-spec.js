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

describe('Task overdue bubble counter', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter = places.get('health_center');
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
  const patient = personFactory.build({
    name: 'Patient One',
    patient_id: 'patient_one',
    parent: clinic,
    reported_date: new Date().getTime(),
  });

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
    await utils.updateSettings(settings, { ignoreReload: 'api', sync, refresh: sync, revert: true });
    await browser.waitUntil(async () => await isBubbleDisplayed());
  };

  before(async () => {
    await utils.saveDocs([...places.values(), chwContact, patient]);
    await utils.createUsers([chw]);
    await sentinelUtils.waitForSentinel();
    await loginPage.login(chw);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
    await commonPage.sync({ expectReload: true, reload: true });
  });

  it('should display bubble with count of overdue tasks', async () => {
    await compileBubbleTasks('overdue-bubble-config.js');


    // Check that bubble is displayed on tasks tab
    expect(await isBubbleDisplayed()).to.be.true;

    // Should show 3 overdue tasks
    const bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(3);
  });

  it('should update bubble count when task is completed', async () => {
    await commonPage.goToMessages();
    await compileBubbleTasks('overdue-bubble-config.js');

    // Verify initial count
    let bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(3);

    // Go to tasks and complete one task
    await commonPage.goToTasks();
    const tasks = await tasksPage.getTasks();
    expect(tasks).to.have.length.at.least(3);

    // Click on first overdue task
    await tasks[0].click();
    await tasksPage.waitForTaskContentLoaded('task_overdue_1');
    await genericForm.submitForm();

    // Wait for task to be removed and sync
    await browser.pause(1000);
    await commonPage.sync({ expectReload: true });

    // Go back to messages tab to check bubble
    await commonPage.goToMessages();
    await browser.pause(500);

    // Bubble count should decrease to 2
    bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(2);
  });

  it('should not display bubble when there are no overdue tasks', async () => {
    await compileBubbleTasks('no-overdue-tasks-config.js');

    await commonPage.goToMessages();
    await browser.pause(500);

    // Bubble should not be displayed
    expect(await isBubbleDisplayed()).to.be.false;
  });

  it('should hide bubble when all overdue tasks are completed', async () => {
    await compileBubbleTasks('overdue-bubble-config.js');

    // Verify bubble is initially displayed
    await commonPage.goToMessages();
    await browser.pause(500);
    expect(await isBubbleDisplayed()).to.be.true;
    expect(await getTasksBubbleCount()).to.equal(3);

    // Complete all overdue tasks
    await commonPage.goToTasks();
    const tasksToComplete = ['task_overdue_1', 'task_overdue_2', 'task_overdue_3'];

    for (const taskName of tasksToComplete) {
      const tasks = await tasksPage.getTasks();
      // Find and complete the overdue task
      for (const task of tasks) {
        const info = await tasksPage.getTaskInfo(task);
        if (info.overdue) {
          await task.click();
          await tasksPage.waitForTaskContentLoaded(taskName);
          await genericForm.submitForm();
          await browser.pause(500);
          break;
        }
      }
    }

    // Sync changes
    await commonPage.sync({ expectReload: true });

    // Check that bubble is no longer displayed
    await commonPage.goToMessages();
    await browser.pause(500);
    expect(await isBubbleDisplayed()).to.be.false;
  });

  it('should display "100 +" when there are 100 or more overdue tasks', async () => {
    await compileBubbleTasks('many-overdue-tasks-config.js');

    await commonPage.goToMessages();
    await browser.pause(500);

    expect(await isBubbleDisplayed()).to.be.true;

    // Should show 100+ for large counts
    const bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.be.at.least(100);

    // Verify the bubble actually displays "100 +"
    const tasksTab = await commonPage.tabsSelector.taskTab();
    const bubble = await tasksTab.$('.mm-badge');
    const bubbleText = await bubble.getText();
    expect(bubbleText).to.include('+');
  });

  it('should only count overdue tasks in bubble, not all tasks', async () => {
    await compileBubbleTasks('mixed-tasks-config.js');

    await commonPage.goToMessages();
    await browser.pause(500);

    // Should only show overdue count (2), not all tasks
    const bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(2);

    // Verify there are more total tasks
    await commonPage.goToTasks();
    const tasks = await tasksPage.getTasks();
    expect(tasks.length).to.be.greaterThan(2);
  });

  it('should update bubble immediately after task status changes', async () => {
    await compileBubbleTasks('overdue-bubble-config.js');

    await commonPage.goToMessages();
    await browser.pause(500);

    let bubbleCount = await getTasksBubbleCount();
    const initialCount = bubbleCount;
    expect(initialCount).to.equal(3);

    // Complete a task
    await commonPage.goToTasks();
    const task = await tasksPage.getTasks().then(tasks => tasks[0]);
    await task.click();
    await tasksPage.waitForTaskContentLoaded('task_overdue_1');
    await genericForm.submitForm();

    // Sync to update state
    await browser.pause(1000);
    await commonPage.sync({ expectReload: true });

    // Check bubble updated
    await commonPage.goToMessages();
    await browser.pause(500);
    bubbleCount = await getTasksBubbleCount();
    expect(bubbleCount).to.equal(initialCount - 1);
  });
});
