const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

const userFactory = require('@factories/cht/users/users');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const user = userFactory.build();

const LOAD_TIMEOUT = 40000;

describe('reports', () => {
  before(async () => {
    await loginPage.login({ ...user, loadPage: false, createUser: false });
    pagePerformance.track('initial replication with tasks');
    await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure reports initial load', async () => {
    await commonElements.goToReports('', false);
    pagePerformance.track('reports - first load');
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - first scroll');
    await commonPage.loadNextInfiniteScrollPage();
    pagePerformance.record();

    pagePerformance.track('reports - second scroll');
    await commonPage.loadNextInfiniteScrollPage();
    pagePerformance.record();
  });

  it('measure reports second load', async () => {
    await commonElements.goToReports('', false);
    pagePerformance.track('reports - second load');
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - first scroll');
    await commonPage.loadNextInfiniteScrollPage();
    pagePerformance.record();

    pagePerformance.track('reports - second scroll');
    await commonPage.loadNextInfiniteScrollPage();
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure reports third load', async () => {
      await commonElements.goToReports('', false);
      pagePerformance.track('reports - third load');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }

  it('measure loading report first', async () => {
    await commonElements.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().click();
    pagePerformance.track('reports - open report first load');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure loading reports second', async () => {
    await commonElements.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().click();
    pagePerformance.track('reports - open report second load');
    await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  for (let i = 0; i < 5; i++) {
    it('measure loading reports third', async () => {
      await commonElements.goToReports();
      await reportsPage.leftPanelSelectors.firstReport().click();
      pagePerformance.track('reports - open report third load');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  }
});
