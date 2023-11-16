const utils = require('@utils');

const searchPage = require('@page-objects/default/search/search.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const smsPregnancyFactory = require('@factories/cht/reports/sms-pregnancy');

describe('Reports Search', () => {
  const sittuHospital = placeFactory.place().build({ name: 'Sittu Hospital', type: 'district_hospital' });
  const potuHospital = placeFactory.place().build({ name: 'Potu Hospital', type: 'district_hospital' });

  const sittuPerson = personFactory.build({
    name: 'Sittu',
    patient_id: 'sittu-patient',
    parent: { _id: sittuHospital._id, parent: sittuHospital.parent },
  });
  const potuPerson = personFactory.build({
    name: 'Potu',
    patient_id: 'potu-patient',
    parent: { _id: potuHospital._id, parent: potuHospital.parent },
  });

  const reports = [
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: sittuPerson.patient_id } }),
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: potuPerson.patient_id } }),
    pregnancyFactory.build({ fields: { patient_id: sittuPerson.patient_id, case_id: 'case-12' } }),
    pregnancyFactory.build({ fields: { patient_id: potuPerson.patient_id, case_id: 'case-12' } }),
  ];
  let reportDocs;

  before(async () => {
    await utils.saveDocs([ sittuHospital, sittuPerson, potuHospital, potuPerson ]);
    reportDocs = await utils.saveDocs(reports);
    await loginPage.cookieLogin();
  });

  it('should return results matching the search term and then return all data when clearing search', async () => {
    const [ sittuSMSPregnancy, potuSMSPregnancy, sittuPregnancy, potuPregnancy ] = reportDocs;
    await commonPage.goToReports();
    // Asserting first load reports
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);

    await searchPage.performSearch('sittu');
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsListDetails()).length).to.equal(2);
    expect(await (await reportsPage.reportByUUID(sittuSMSPregnancy.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(sittuPregnancy.id)).isDisplayed()).to.be.true;

    await searchPage.clearSearch();
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);
    expect(await (await reportsPage.reportByUUID(sittuSMSPregnancy.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(potuSMSPregnancy.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(sittuPregnancy.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(potuPregnancy.id)).isDisplayed()).to.be.true;
  });

  it('should return results when searching by case_id', async () => {
    const sittuPregnancy = reportDocs[2];
    const potuPregnancy = reportDocs[3];
    await commonPage.goToReports();
    // Asserting first load reports
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);

    await reportsPage.openReport(sittuPregnancy.id);
    await reportsPage.clickOnCaseId();
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsListDetails()).length).to.equal(2);
    expect(await (await reportsPage.reportByUUID(sittuPregnancy.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(potuPregnancy.id)).isDisplayed()).to.be.true;
  });
});
