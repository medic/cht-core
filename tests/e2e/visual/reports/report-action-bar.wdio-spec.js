const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const { generateScreenshot, resizeWindowForScreenshots, isMobile } = require('@utils/screenshots');

describe('Visual: Reports - More Options Menu & Floating Action Button', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const contact = personFactory.build({
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  const reports = [
    reportFactory.report().build({ form: 'P', content_type: 'xml', fields: { foo: 'bar' } }, { submitter: contact }),
    reportFactory.report().build({ form: 'V', content_type: 'xml', fields: { baz: 'qux' } }, { submitter: contact }),
  ];

  let savedUuids = [];

  before(async () => {
    await utils.saveDocs([...places.values(), contact]);
    const savedReports = await utils.saveDocs(reports);
    savedUuids = savedReports.map(report => report.id);
    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('should capture screenshots of more options menu on desktop and mobile', async () => {
    await resizeWindowForScreenshots();
    await commonElements.goToReports();
    await reportsPage.leftPanelSelectors.reportList().waitForDisplayed();

    const mobile = await isMobile();

    if (mobile) {
      // For mobile: open a report and show more options menu
      await reportsPage.leftPanelSelectors.reportByUUID(savedUuids[0]).click();
      await reportsPage.rightPanelSelectors.reportBodyDetails().waitForDisplayed();
      await commonElements.openMoreOptionsMenu();
      await generateScreenshot('report', 'more-options-menu');
    } else {
      // For desktop: show more options menu from reports list
      await commonElements.openMoreOptionsMenu();
      await generateScreenshot('report', 'more-options-menu');
    }
  });

  // it('should click FAB button and capture screenshots', async () => {
  //   await resizeWindowForScreenshots();
  //   await commonElements.goToReports();
  //   await commonElements.waitForLoaders();
    
  //   // Initial state screenshot
  //   await generateScreenshot('fab-button', 'before-fab-click');
    
  //   // Get FAB button and click
  //   const fabButton = await $('.fast-action-fab-button');
  //   await fabButton.waitForDisplayed();
  //   await fabButton.click();
  //   await browser.pause(1000); // Wait for animation
    
  //   // Take screenshot after FAB is opened
  //   await generateScreenshot('fab-button', 'after-fab-click');
    
  //   // If you want to test specific actions in the FAB menu
  //   const fabActions = await $$('.fab-action-item');
  //   if (fabActions.length > 0) {
  //     // Optionally click first action
  //     await fabActions[0].click();
  //     await browser.pause(1000);
  //     await generateScreenshot('fab-button', 'after-action-click');
  //   }
  // });

  it('should test FAB button responsiveness', async () => {
    // Test FAB on mobile viewport
    await browser.setWindowSize(375, 667); // iPhone SE viewport
    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    
    const fabButton = await $('.fast-action-fab-button');
    await fabButton.waitForDisplayed();
    await generateScreenshot('fab-button', 'mobile-fab-button');
    
    // Click and capture expanded state
    await fabButton.click();
    await browser.pause(1000);
    await generateScreenshot('fab-button', 'mobile-fab-expanded');
  });

});