const utils = require('@utils');

const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const searchPage = require('@page-objects/default-mobile/search/search.wdio.page');

const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const smsPregnancyFactory = require('@factories/cht/reports/sms-pregnancy');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Search Reports', () => {
  // NOTE: this is a search word added to reports for searching purposes
  // the value was chosen such that it is a sub-string of the short_name which
  // gives double output from the couchdb view
  const searchWord = 'sittu';
  const places = placeFactory.generateHierarchy();
  const districtHospitalPatient = personFactory.build({
    parent: places.get('district_hospital'),
    patient_id: '1a'
  });
  const healthCenterPatient = personFactory.build({
    parent: places.get(CONTACT_TYPES.HEALTH_CENTER),
    patient_id: '2a'
  });

  const reports = [
    smsPregnancyFactory.pregnancy().build({
      fields: { patient_id: districtHospitalPatient.patient_id, note: searchWord }
    }),
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: healthCenterPatient.patient_id } }),
    pregnancyFactory.build({ fields: {
      patient_id: districtHospitalPatient.patient_id, case_id: 'case-12', note: searchWord }
    }),
    pregnancyFactory.build({ fields: { patient_id: healthCenterPatient.patient_id, case_id: 'case-12' } }),
  ];
  let reportDocs;

  before(async () => {
    await utils.saveDocs([ ...places.values(), districtHospitalPatient, healthCenterPatient ]);
    reportDocs = await utils.saveDocs(reports);
    await loginPage.cookieLogin();
  });

  after(async () =>  await utils.revertDb([/^form:/], true) );

  it('should return results matching the search term and then return all data when clearing search', async () => {
    const [ hospitalSMS, healthCenterSMS, hospitalReport, healthCenterReport ] = reportDocs;
    await commonPage.goToReports();
    // Asserting first load reports
    const reportsList = await reportsPage.reportsListDetails();
    expect(reportsList.length).to.equal(reportDocs.length);

    await searchPage.performSearch('+64275555556');
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsListDetails()).length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(healthCenterSMS.id).isDisplayed()).to.be.true;

    await searchPage.searchPageDefault.clearSearch();
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(healthCenterSMS.id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(healthCenterReport.id).isDisplayed()).to.be.true;
  });

  it('should navigate back to list view and return results when searching by case_id', async () => {
    const hospitalReport = reportDocs[2];
    const healthCenterReport = reportDocs[3];
    await commonPage.goToReports();
    // Asserting first load reports
    const reportsList = await reportsPage.reportsListDetails();
    expect(reportsList.length).to.equal(reportDocs.length);

    await reportsPage.openReport(hospitalReport.id);
    await reportsPage.clickOnCaseId();
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsListDetails()).length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(healthCenterReport.id).isDisplayed()).to.be.true;
  });

  it('should return no results when searching by a non-existent field value', async () => {
    const [ hospitalSMS, healthCenterSMS, hospitalReport, healthCenterReport ] = reportDocs;
    const randomWord = 'lorem-ipsum';
    await commonPage.goToReports();
    // Asserting first load reports
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);

    await searchPage.performSearch(randomWord);
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsListDetails()).length).to.equal(0);

    await searchPage.searchPageDefault.clearSearch();
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(healthCenterSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(healthCenterReport.id)).isDisplayed()).to.be.true;
  });

  it('should have unique results for when multiple fields match the same search text', async () => {
    const [ hospitalSMS, healthCenterSMS, hospitalReport, healthCenterReport ] = reportDocs;
    await commonPage.goToReports();

    // Asserting first load reports
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);

    await searchPage.performSearch(searchWord);
    await commonPage.waitForLoaders();
    expect((await reportsPage.reportsListDetails()).length).to.equal(2);
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;

    await searchPage.searchPageDefault.clearSearch();
    expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(healthCenterSMS.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.leftPanelSelectors.reportByUUID(healthCenterReport.id)).isDisplayed()).to.be.true;
  });

  it('should be able to do an exact match search by a field and then return all data when clearing search',
    async () => {
      const [ hospitalSMS, healthCenterSMS, hospitalReport, healthCenterReport ] = reportDocs;
      await commonPage.goToReports();

      // Asserting first load reports
      expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);

      await searchPage.performSearch(`note:${searchWord}`);
      await commonPage.waitForLoaders();
      expect((await reportsPage.reportsListDetails()).length).to.equal(2);
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;

      await searchPage.searchPageDefault.clearSearch();
      expect((await reportsPage.reportsListDetails()).length).to.equal(reportDocs.length);
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalSMS.id)).isDisplayed()).to.be.true;
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(healthCenterSMS.id)).isDisplayed()).to.be.true;
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(hospitalReport.id)).isDisplayed()).to.be.true;
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(healthCenterReport.id)).isDisplayed()).to.be.true;
    });
});
