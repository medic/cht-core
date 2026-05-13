const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');

const userFactory = require('@factories/cht/users/users');
const utils = require('@utils');
const user = userFactory.build();

const LOAD_TIMEOUT = 120000;

describe('tasks', () => {
  after(async () => {
    await utils.updatePermissions(
      user.roles,
      [],
      ['can_view_tasks', 'can_view_analytics'],
      { ignoreReload: true }
    );
  });

  describe('with initial calculation', () => {
    before(async () => {
      await loginPage.login({ ...user, loadPage: false, createUser: false });
      pagePerformance.track('initial replication');
      await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks initial load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks - first load with calculation');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks second load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks - second load');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    for (let i = 0; i < 5; i++) {
      it('measure tasks third load', async () => {
        await commonElements.goToTasks(false);
        pagePerformance.track('tasks - third load');
        await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
        await tasksPage.getTasks(LOAD_TIMEOUT);
        pagePerformance.record();
      });
    }

    it('should sync tasks', async () => {
      // this needs to be in a test. I tried to sync in the `after` and the browser became unresponsive
      await commonElements.goToAboutPage();
      await commonElements.sync({ timeout: LOAD_TIMEOUT });
    });

    after(async () => {
      await commonElements.reloadSession();
    });
  });

  describe('without initial calculation', () => {
    before(async () => {
      await loginPage.login({ ...user, loadPage: false, createUser: false });
      pagePerformance.track('initial replication with tasks');
      await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks initial load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks - first load without calculation');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks second load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks - second load');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  });
});

