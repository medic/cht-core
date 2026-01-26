const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');
const { reports, contact } = require('./data/generateReportData');

describe('Reports List & Report Details functionality test', () => {
  const docs = [contact, ...reports];

  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await commonElements.waitForLoaders();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('should test Reports list functionality, open the first report and capture screenshots', async () => {
    await resizeWindowForScreenshots();

    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    await reportsPage.openFirstReport();
    await commonElements.waitForLoaders();

    await generateScreenshot('report', 'reports-list');
  });
});
