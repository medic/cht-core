const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');
const { reports, contact } = require('./data/generateReportData');

describe('Report Filter functionality test', () => {
  const docs = [contact, ...reports];

  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await browser.pause(3000);
  });

  after(async () => {
    await utils.revertDb([], true);
  });


  it('should test sidebar filter functionality and capture screenshots', async () => {
    await resizeWindowForScreenshots();

    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    await browser.pause(1000);

    await generateScreenshot('report', 'unfiltered-reports-list');

    await reportsPage.openSidebarFilter();
    await browser.pause(500);

    await generateScreenshot('report', 'filter-sidebar');

    await reportsPage.filterByStatus('Not reviewed');
    await browser.pause(1000);
    await generateScreenshot('report', 'status-filter-applied');

  });
});
