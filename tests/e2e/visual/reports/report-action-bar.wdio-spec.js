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


});