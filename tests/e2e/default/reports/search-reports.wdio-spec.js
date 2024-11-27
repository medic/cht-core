const utils = require('@utils');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const smsPregnancyFactory = require('@factories/cht/reports/sms-pregnancy');
const userFactory = require('@factories/cht/users/users');

describe('Reports Search', () => {
  const sittuHospital = placeFactory.place().build({ name: 'Sittu Hospital', type: 'district_hospital' });
  const potuHealthCenter = placeFactory.place().build({
    name: 'Potu Health Center',
    type: 'health_center',
    parent: { _id: sittuHospital._id }
  });

  const sittuPerson = personFactory.build({
    name: 'Sittu',
    patient_id: 'sittu-patient',
    parent: { _id: sittuHospital._id, parent: sittuHospital.parent },
  });
  const potuPerson = personFactory.build({
    name: 'Potu',
    patient_id: 'potu-patient',
    parent: { _id: potuHealthCenter._id, parent: potuHealthCenter.parent },
  });

  const reports = [
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: sittuPerson.patient_id } }),
    smsPregnancyFactory.pregnancy().build({ fields: { patient_id: potuPerson.patient_id } }),
    pregnancyFactory.build({ fields: { patient_id: sittuPerson.patient_id, case_id: 'case-12' } }),
    pregnancyFactory.build({ fields: { patient_id: potuPerson.patient_id, case_id: 'case-12' } }),
  ];

  const offlineUser = userFactory.build({
    username: 'offline-search-user',
    place: sittuHospital._id,
    roles: ['chw_supervisor'],
    contact: sittuPerson._id
  });
  const onlineUser = userFactory.build({
    username: 'online-search-user',
    place: sittuHospital._id,
    roles: ['program_officer'],
    contact: sittuPerson._id
  });

  before(async () => {
    await utils.saveDocs([ sittuHospital, sittuPerson, potuHealthCenter, potuPerson ]);
    await utils.saveDocs(reports);
    await utils.createUsers([offlineUser, onlineUser]);
  });

  after(() => utils.deleteUsers([offlineUser, onlineUser]));

  [
    ['online', onlineUser, [reports[0], reports[2]], reports],
    ['offline', offlineUser, [reports[2]], [reports[2], reports[3]]],
  ].forEach(([userType, user, filteredReports, allReports]) => describe(`Logged in as an ${userType} user`, () => {
    before(() => loginPage.login(user));

    after(commonPage.logout);

    it('should return results matching the search term and then return all data when clearing search', async () => {
      await commonPage.goToReports();
      // Asserting first load reports
      expect((await reportsPage.reportsListDetails()).length).to.equal(allReports.length);

      await searchPage.performSearch('sittu');
      await commonPage.waitForLoaders();
      expect((await reportsPage.reportsListDetails()).length).to.equal(filteredReports.length);
      for (const report of filteredReports) {
        expect(await (await reportsPage.leftPanelSelectors.reportByUUID(report._id)).isDisplayed()).to.be.true;
      }

      await searchPage.clearSearch();
      expect((await reportsPage.reportsListDetails()).length).to.equal(allReports.length);
      for (const report of allReports) {
        expect(await (await reportsPage.leftPanelSelectors.reportByUUID(report._id)).isDisplayed()).to.be.true;
      }
    });

    it('should return results when searching by case_id', async () => {
      const sittuPregnancy = reports[2];
      const potuPregnancy = reports[3];
      await commonPage.goToReports();
      // Asserting first load reports
      expect((await reportsPage.reportsListDetails()).length).to.equal(allReports.length);

      await reportsPage.openReport(sittuPregnancy._id);
      await reportsPage.clickOnCaseId();
      await commonPage.waitForLoaders();
      expect((await reportsPage.reportsListDetails()).length).to.equal(2);
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(sittuPregnancy._id)).isDisplayed()).to.be.true;
      expect(await (await reportsPage.leftPanelSelectors.reportByUUID(potuPregnancy._id)).isDisplayed()).to.be.true;
    });
  }));
});
