const utils = require('@utils');

const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default-mobile/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const searchPage = require('@page-objects/default-mobile/search/search.wdio.page');

const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const smsPregnancyFactory = require('@factories/cht/reports/sms-pregnancy');

describe('Search Reports', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospitalPatient = personFactory.build({ parent: places.get('district_hospital'), patient_id: '1a' });
  const healthCenterPatient = personFactory.build({ parent: places.get('health_center'), patient_id: '2a' });

  const reports = [
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: districtHospitalPatient.patient_id } }),
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: healthCenterPatient.patient_id } }),
    pregnancyFactory.build({ fields: { patient_id: districtHospitalPatient.patient_id, case_id: 'case-12' } }),
    pregnancyFactory.build({ fields: { patient_id: healthCenterPatient.patient_id, case_id: 'case-12' } }),
  ];
  let reportDocs;

  before(async () => {
    await utils.saveDocs([ ...places.values(), districtHospitalPatient, healthCenterPatient ]);
    reportDocs = await utils.saveDocs(reports);
    await loginPage.cookieLogin();
  });

  it('should return results matching the search term and then return all data when clearing search', async () => {
    const [ hospitalSMS, healthCenterSMS, hospitalReport, healthCenterReport ] = reportDocs;
    await commonPage.goToReports();
    // Asserting first load reports
    expect((await reportsPage.reportsPageDefault.reportsListDetails()).length).to.equal(reportDocs.length);

    await searchPage.performSearch('+64275555556');
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsPageDefault.reportsListDetails()).length).to.equal(2);
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(healthCenterSMS.id)).isDisplayed()).to.be.true;

    await searchPage.searchPageDefault.clearSearch();
    expect((await reportsPage.reportsPageDefault.reportsListDetails()).length).to.equal(reportDocs.length);
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(healthCenterSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(healthCenterReport.id)).isDisplayed()).to.be.true;
  });

  it('should navigate back to list view and return results when searching by case_id', async () => {
    const hospitalReport = reportDocs[2];
    const healthCenterReport = reportDocs[3];
    await commonPage.goToReports();
    // Asserting first load reports
    expect((await reportsPage.reportsPageDefault.reportsListDetails()).length).to.equal(reportDocs.length);

    await reportsPage.reportsPageDefault.openReport(hospitalReport.id);
    await reportsPage.reportsPageDefault.clickOnCaseId();
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsPageDefault.reportsListDetails()).length).to.equal(2);
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportsPageDefault.reportByUUID(healthCenterReport.id)).isDisplayed()).to.be.true;
  });
});
