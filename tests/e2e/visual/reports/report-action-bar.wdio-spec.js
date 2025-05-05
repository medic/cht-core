const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const { generateScreenshot, resizeWindowForScreenshots, isMobile } = require('@utils/screenshots');

describe('Reports - More Options Menu & Floating Action Button', () => {
  const places = placeFactory.generateHierarchy();
  const contact = personFactory.build();
  const REPORTED_DATE = Date.now() - (13 * 60 * 60 * 1000);
  const reports = [
    reportFactory
      .report()
      .build({
        fields: {
          patient_name: 'Jadena'
        },
        form: 'Health Facility ANC reminder',
        content_type: 'xml',
        contact: {
          _id: contact._id,
        },
        reported_date: REPORTED_DATE,
        from: 'Unknown sender',
      }),
    reportFactory
      .report()
      .build({
        fields: {
          patient_name: 'Zoe'
        },
        form: 'Health Facility ANC reminder',
        content_type: 'xml',
        contact: {
          _id: contact._id,
        },
        reported_date: REPORTED_DATE,
        from: 'Unknown sender',
      }),
    reportFactory
      .report()
      .build({
        fields: {
          patient_name: 'Shaila'
        },
        form: 'Postnatal danger sign follow-up',
        content_type: 'xml',
        contact: {

          _id: contact._id,
        },
        reported_date: REPORTED_DATE,
        from: 'Unknown sender',
      }),
    reportFactory
      .report()
      .build({
        fields: {
          patient_name: 'Kelly'
        },
        form: 'Postnatal danger sign follow-up',
        content_type: 'xml',
        contact: {

          _id: contact._id,
        },
        reported_date: REPORTED_DATE,
        from: 'Unknown sender',
      }),
    reportFactory
      .report()
      .build({
        fields: {
          patient_name: 'Lena'
        },
        form: 'Health Facility ANC reminder',
        content_type: 'xml',
        contact: {

          _id: contact._id,
        },
        reported_date: REPORTED_DATE,
        from: 'Unknown sender',
      }),
    reportFactory
      .report()
      .build({
        fields: {
          patient_name: 'Lena'
        },
        form: 'Postnatal danger sign follow-up',
        content_type: 'xml',
        contact: {
          _id: contact._id,
        },
        reported_date: REPORTED_DATE,
        from: 'Unknown sender',
      }),
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

  it('should click FAB button and capture screenshots', async () => {

    await resizeWindowForScreenshots();
    const mobile = await isMobile();

    await commonElements.goToReports();
    await commonElements.waitForLoaders();

    if (mobile) {

      const fabButton = await $('.fast-action-fab-button');
      await fabButton.waitForDisplayed();
      await generateScreenshot('report', 'fab-button');

      await fabButton.click();
      await browser.pause(1000);
      await generateScreenshot('report', 'fab-expanded');
    } else {
      const flatButton = await $('.fast-action-flat-button');
      await flatButton.waitForDisplayed();
      await generateScreenshot('report', 'fab-button');
      await flatButton.click();
      await browser.pause(1000); 
      await generateScreenshot('report', 'fab-expanded');
    }

  });
});
