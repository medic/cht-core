const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

const userFactory = require('@factories/cht/users/users');
const user = userFactory.build();

const LOAD_TIMEOUT = 40000;

describe('reports', () => {
  before(async () => {
    await loginPage.login({ ...user, loadPage: false, createUser: false });
    pagePerformance.track('replicate with tasks');
    await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure reports initial load', async () => {
    await commonElements.goToReports('', false);
    pagePerformance.track('reports first');
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure reports second load', async () => {
    await commonElements.goToReports('', false);
    pagePerformance.track('reports second');
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure reports third load', async () => {
      await commonElements.goToReports('', false);
      pagePerformance.track('reports third');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }

  it('measure loading report first', async () => {
    await commonElements.goToReports('', false);
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    await reportsPage.leftPanelSelectors.firstReport().click();
    pagePerformance.track('report load first');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure loading home-place second', async () => {
    await commonElements.goToReports('', false);
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    await reportsPage.leftPanelSelectors.firstReport().click();
    pagePerformance.track('report load second');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure loading home-place third', async () => {
      await commonElements.goToReports('', false);
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      await reportsPage.leftPanelSelectors.firstReport().click();
      pagePerformance.track('report load third');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }
});
