const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');

describe('Bulk delete reports functionality test', () => {
  // Create test contact and reports
  const contact = personFactory.build({
    _id: '3305E3D0-2970-7B0E-AB97-C3239CD22D32',
  });

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
        reported_date: Date.now() - (13 * 60 * 60 * 1000),
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
        reported_date: Date.now() - (13 * 60 * 60 * 1000),
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
        reported_date: Date.now() - (13 * 60 * 60 * 1000),
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
        reported_date: Date.now() - (13 * 60 * 60 * 1000),
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
        reported_date: Date.now() - (13 * 60 * 60 * 1000),
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
        reported_date: Date.now() - (13 * 60 * 60 * 1000),
        from: 'Unknown sender',
      }),
  ];

  const docs = [contact, ...reports];
  const savedUuids = [];
  const reportUuids = [];

  before(async () => {
    // Set up the window for screenshots
    await resizeWindowForScreenshots();

    // Login and save test data
    await loginPage.cookieLogin();
    const results = await utils.saveDocs(docs);
    results.forEach(result => {
      savedUuids.push(result.id);
      // Store only report IDs separately
      if (result.id !== contact._id) {
        reportUuids.push(result.id);
      }
    });

    // Wait for indexing
    await browser.pause(3000);
  });


  it('should select 3 reports by ID and capture screenshots', async () => {
    await commonElements.goToReports();
    await commonElements.waitForLoaders();
    await browser.pause(2000);
  
    // Capture initial state
    await generateScreenshot('bulk-delete', 'initial-reports-list');
  
    // Select 3 reports by their IDs
    const selectedIds = reportUuids.slice(0, 3);
  
    const windowSize = await browser.getWindowSize();
    const isMobile = windowSize.width <= 768;

    const reportsPageObj = isMobile
      ? require('@page-objects/default-mobile/reports/reports.wdio.page')
      : reportsPage;
  
    const selectSomeResult = await reportsPageObj.selectReports(selectedIds);
  
    // On mobile, selectedCount/countLabel may be different or undefined, so just check checkboxes
    if (!isMobile) {
      expect(selectSomeResult.selectedCount).to.equal(3);
    } else {
      // Optionally, check that 3 checkboxes are checked
      const checked = await reportsPageObj.reportsPageDefault.leftPanelSelectors.selectedReportsCheckboxes();
      expect(checked.length).to.equal(3);
    }
  
    await generateScreenshot('bulk-delete', 'three-reports-selected');
  });

});