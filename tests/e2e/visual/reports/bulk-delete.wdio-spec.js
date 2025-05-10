const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPageMobile = require('@page-objects/default-mobile/reports/reports.wdio.page');
const { resizeWindowForScreenshots, generateScreenshot, isMobile } = require('@utils/screenshots');
const { reports, contact } = require('./data/generateReportData');

describe('Bulk delete reports functionality test', () => {
  let savedUuids = [];

  before(async () => {
    await utils.saveDocs([contact]);
    const savedReports = await utils.saveDocs(reports);
    savedUuids = [...savedReports.map(report => report.id)];
    await loginPage.cookieLogin();
    await browser.pause(3000);
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('should select 3 reports by ID and capture screenshots', async () => {
    await resizeWindowForScreenshots();

    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    await browser.pause(2000);
  
    // Capture initial state
    await generateScreenshot('bulk-delete', 'initial-reports-list');
  
    // Select 3 reports by their IDs
    const selectedIds = savedUuids.slice(0, 3);
  
    const isMobileDevice = await isMobile();

    const reportsPageObj = isMobileDevice
      ? reportsPageMobile
      : reportsPage;
  
    const selectSomeResult = await reportsPageObj.selectReports(selectedIds);
  
    if (!isMobileDevice) {
      expect(selectSomeResult.selectedCount).to.equal(3);
    } else {
      const checked = await reportsPageObj.reportsPageDefault.leftPanelSelectors.selectedReportsCheckboxes();
      expect(checked.length).to.equal(3);
    }
  
    await generateScreenshot('bulk-delete', 'three-reports-selected');
  });

});