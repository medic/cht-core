const loginPage = require('@page-objects/default/login/login.wdio.page');
const pagePerformance = require('@utils/performance');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const userFactory = require('@factories/cht/users/users');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const user = userFactory.build();
const utils = require('@utils');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

const LOAD_TIMEOUT = 120000;

describe('reports', () => {
  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/app/large_cha`));
    await loginPage.login({ ...user, loadPage: false, createUser: false });
    pagePerformance.track('initial replication with tasks');
    await commonElements.waitForAngularLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  beforeEach(async () => {
    await commonElements.goToAboutPage();
  });

  it('measure reports initial load', async () => {
    await commonElements.goToReports('', false);
    pagePerformance.track('reports - first load');
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - first scroll');
    await commonPage.loadNextInfiniteScrollPage('reports', LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - second scroll');
    await commonPage.loadNextInfiniteScrollPage('reports', LOAD_TIMEOUT);
    pagePerformance.record();
  });

  it('measure reports second load', async () => {
    await commonElements.goToReports('', false);
    pagePerformance.track('reports - second load');
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - first scroll');
    await commonPage.loadNextInfiniteScrollPage('reports', LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - second scroll');
    await commonPage.loadNextInfiniteScrollPage('reports', LOAD_TIMEOUT);
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

  describe('filter', () => {
    it('measure filter by date', async () => {
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      await reportsPage.openSidebarFilterDateAccordion();
      pagePerformance.track('reports - filter by date - first');
      await reportsPage.setSidebarFilterFromDate();
      await reportsPage.setSidebarFilterToDate();
      await commonPage.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();

      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      await reportsPage.openSidebarFilterDateAccordion();
      pagePerformance.track('reports - filter by date - second');
      await reportsPage.setSidebarFilterFromDate();
      await reportsPage.setSidebarFilterToDate();
      await commonPage.waitForPageLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure filter by form', async () => {
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by form - first');
      await reportsPage.filterByForm('Pregnancy home visit');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();

      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by form - second');
      await reportsPage.filterByForm('Pregnancy home visit');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure filter by place', async () => {
      const userDoc = await utils.getUserDoc(user.username);
      const facility = await utils.getDoc(userDoc.facility_id[0]);

      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by place - first');
      await reportsPage.filterByFacility(facility.name, facility.name);
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();

      await commonElements.goToAboutPage();
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by place - second');
      await reportsPage.filterByFacility(facility.name, facility.name);
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure filter by status', async () => {
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by status - first');
      await reportsPage.filterByStatus('Not reviewed');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();

      await commonElements.goToAboutPage();
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by status - second');
      await reportsPage.filterByStatus('Not reviewed');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });

    it('measure filter by form and status', async () => {
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await reportsPage.openSidebarFilter();
      pagePerformance.track('reports - filter by form and status');
      await reportsPage.filterByForm('Pregnancy home visit');
      await reportsPage.filterByStatus('Not reviewed');
      await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
      pagePerformance.record();
    });
  });

  it('measure search', async () => {
    await commonPage.goToReports();
    await reportsPage.waitForReportsLoaded();

    pagePerformance.track('reports - search - first');
    await searchPage.performSearch('pregnancy_home_visit', LOAD_TIMEOUT);
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();

    pagePerformance.track('reports - search - second');
    await searchPage.performSearch('pregnancy', LOAD_TIMEOUT);
    await reportsPage.waitForReportsLoaded(LOAD_TIMEOUT);
    pagePerformance.record();
  });

  describe('forms', () => {
    it('measure opening big form', async () => {
      await commonPage.goToReports();
      await reportsPage.waitForReportsLoaded();

      await commonElements.clickFastActionFlat({ actionId: 'large_cha' });
      pagePerformance.track('reports - open big form');
      await commonElements.waitForPageLoaded(LOAD_TIMEOUT);
      await $('#form-title').waitForDisplayed();
      pagePerformance.record();

      await commonEnketoPage.selectCheckBox('Danger signs present', 'Not breathing normally');
      await commonEnketoPage.selectCheckBox('Danger signs present', 'Vomits everything');

      await commonEnketoPage.selectRadioButton('Was the patient referred immediately?', 'No');
      pagePerformance.track('reports - next page big form');
      await genericForm.nextPage();
      pagePerformance.record();
    });
  });
});
