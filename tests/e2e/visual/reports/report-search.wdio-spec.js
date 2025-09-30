const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const { generateScreenshot } = require('@utils/screenshots');
const { reports, contact } = require('./data/generateReportData');

describe('Report Search functionality test', () => {
  const docs = [contact, ...reports];
  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await browser.pause(3000);
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('should filter and show reports using searchbar functionality and capture screenshots', async () => {
    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    await browser.pause(1000);

    const reportsWithoutFilter = await reportsPage.reportsListDetails();
    expect(reportsWithoutFilter.length).to.be.equals(6);
    await generateScreenshot('report', 'unsearch-reports-list');


    await searchPage.performSearch('Lena');
    await commonPage.waitForLoaders();
    await browser.pause(500);

    await generateScreenshot('report', 'search-reports-list');
    const reportsFiltered = await reportsPage.reportsListDetails();
    expect(reportsFiltered.length).to.be.equals(2);

  });

  it('should show label when does not find results using searchbar functionality and capture screenshots', async () => {

    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    await browser.pause(1000);

    const reportsWithoutFilter = await reportsPage.reportsListDetails();
    expect(reportsWithoutFilter.length).to.be.equals(6);
    await generateScreenshot('report', 'unsearch-reports-list-not-found');


    await searchPage.performSearch('Juan');
    await commonPage.waitForLoaders();
    await browser.pause(500);

    await generateScreenshot('report', 'search-reports-list-not-found');
    const reportsFiltered = await reportsPage.reportsListDetails();
    expect(reportsFiltered.length).to.be.equals(0);
    const statusLabel = await reportsPage.getReportListLoadingStatus();
    expect(statusLabel).to.be.equals('No reports found.');

  });
});
