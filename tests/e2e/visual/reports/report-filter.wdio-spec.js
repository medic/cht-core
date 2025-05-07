const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');
const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');

describe('Report Filter functionality test', () => {
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

  const docs = [contact, ...reports];
  const savedUuids = [];
  const reportUuids = [];

  before(async () => {
    const results = await utils.saveDocs(docs);
    results.forEach(result => {
      savedUuids.push(result.id);
      // Store only report IDs separately
      if (result.id !== contact._id) {
        reportUuids.push(result.id);
      }
    });
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
