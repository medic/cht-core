const { expect } = require('chai');
const utils = require('@utils');

const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default-mobile/reports/reports.wdio.page');

const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');

describe('Navigation', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ username: 'offline-user-nav', roles: [ 'chw' ], place: healthCenter._id });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const reports = [
    deliveryFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name },
    }),
    pregnancyFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name },
    }),
    pregnancyFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name },
    }),
  ];

  let patientDocs;
  let reportDocs;

  before(async () => {
    await utils.saveDocs([ ...places.values() ]);
    reportDocs = await utils.saveDocs(reports);
    patientDocs = await utils.saveDocs([ patient ]);
    await utils.createUsers([ offlineUser ]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
  });

  it('should load reports list when navigating from a report that was opened from a contact page', async () => {
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.selectRHSRowById(patientDocs[0].id);

    await contactPage.openReport();
    await commonPage.waitForLoaders();
    const report = await reportsPage.reportsPageDefault.getOpenReportInfo();
    expect(report.patientName).to.equal('Mary Smith');
    await reportsPage.closeReport();

    await commonPage.goToReports();
    const list = await reportsPage.reportsPageDefault.allReports();
    expect(list.length).to.equal(3);
  });

  it('should load reports list when navigating from a report that was opened from reports tab', async () => {
    await commonPage.goToReports();
    await (await reportsPage.reportsPageDefault.firstReport()).waitForDisplayed();

    await reportsPage.reportsPageDefault.openReport(reportDocs[1].id);
    await commonPage.waitForLoaders();
    const report = await reportsPage.reportsPageDefault.getOpenReportInfo();
    expect(report.patientName).to.equal('Mary Smith');
    await reportsPage.closeReport();

    await commonPage.goToReports();
    const list = await reportsPage.reportsPageDefault.allReports();
    expect(list.length).to.equal(3);
  });
});
