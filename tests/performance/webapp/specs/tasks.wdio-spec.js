//const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');

const userFactory = require('@factories/cht/users/users');
const user = userFactory.build();

const LOAD_TIMEOUT = 120000;

describe('tasks', () => {
  describe('with initial calculation', () => {
    before(async () => {
      await loginPage.login({ ...user, loadPage: false, createUser: false });
      pagePerformance.track('replicate');
      await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks initial load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks first load with calculation');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks second load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks second');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    for (let i = 0; i < 5; i++) {
      it('measure tasks third load', async () => {
        await commonElements.goToTasks(false);
        pagePerformance.track('tasks third');
        await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
        await tasksPage.getTasks(LOAD_TIMEOUT);
        pagePerformance.record();
      });
    }

    after(async () => {
      await commonElements.reloadSession();
    });
  });

  describe('without initial calculation', () => {
    before(async () => {
      await loginPage.login({ ...user, loadPage: false, createUser: false });
      pagePerformance.track('replicate with tasks');
      await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks initial load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks first load without calculation');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure tasks second load', async () => {
      await commonElements.goToTasks(false);
      pagePerformance.track('tasks second');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await tasksPage.getTasks(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    for (let i = 0; i < 5; i++) {
      it('measure tasks third load', async () => {
        await commonElements.goToTasks(false);
        pagePerformance.track('tasks third');
        await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
        await tasksPage.getTasks(LOAD_TIMEOUT);
        pagePerformance.record();
      });
    }
  });
});
