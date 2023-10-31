const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/standard/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const gatewayApiUtils = require('@utils/gateway-api');
const immVisitForm = require('@page-objects/standard/enketo/immunization-visit.wdio.page');
const { TARGET_MET_COLOR } = analyticsPage;

describe('Immunization Visit', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const user = userFactory.build({ place: healthCenter._id, roles: ['district_admin'] });
  const babyName = 'Baby1';
  let babyMedicID = '';
  let countAppliedVaccines = 0;

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.addHealthPrograms('imm');
    await commonPage.logout();
  });

  afterEach(async () => await commonPage.logout());

  it('Add a new child under 2 years old - SMS CW form', async () => {
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();

    const messageValue = `CW 60 ${babyName}`;

    await gatewayApiUtils.api.postMessage({
      id: 'CW-id',
      from: user.phone,
      content: messageValue
    });

    await commonPage.goToPeople(user.place);
    const allRHSPeople = await contactPage.contactPageDefault.getAllRHSPeopleNames();
    expect(allRHSPeople.length).to.equal(2);
    expect(allRHSPeople).to.include.members([babyName, user.contact.name]);

    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(babyName);
    expect(firstReport.form).to.equal('New Child Registration (SMS)');
  });

  it('Submit immunization visit - webapp', async () => {
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();

    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(babyName);
    babyMedicID = await contactPage.contactPageDefault.getContactMedicID();
    await commonPage.openFastActionReport('immunization_visit');

    await immVisitForm.selectAllVaccines();
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.BCG_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.CHOLERA_VACCINE, 'CH');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.HEPATITIS_A_VACCINE, 'HA');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.HEPATITIS_B_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.HPV_VACCINE, 'HPV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.FLU_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.JAP_ENCEPHALITIS_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.MENINGOCOCCAL_VACCINE, 'MN');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.MMR_VACCINE, 'MMR');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.MMRV_VACCINE, 'MMRV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.POLIO_VACCINE, 'PV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.PENTAVALENT_VACCINE, 'DT');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.DPT_BOOSTER_VACCINE, 'DPT');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.PNEUMOCOCCAL_VACCINE, 'PCV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.ROTAVIRUS_VACCINE, 'RV');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.TYPHOID_VACCINE, 'TY');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.VITAMIN_A_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immVisitForm.selectAppliedVaccines(immVisitForm.YELLOW_FEVER_VACCINE, 'yes');
    await genericForm.nextPage();
    await immVisitForm.addNotes();
    await genericForm.nextPage();

    expect(await immVisitForm.getPatientNameSummaryPage()).to.equal(babyName);
    expect(countAppliedVaccines).to.equal(await immVisitForm.getAppliedVaccinesSummary());
    expect(await immVisitForm.getFollowUpSMS()).to.include(babyName);
    expect(await immVisitForm.getFollowUpSMS()).to.include(babyMedicID);
    expect(await immVisitForm.getFollowUpSMS()).to.include(await immVisitForm.getNotes());

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    //Verify immunization card
    const vaccinesValues = await contactPage.getImmCardVaccinesValues();
    for (const value of vaccinesValues) {
      if (value.includes('of')) {
        const totalVaccines = value.split(' of ')[1];
        expect(value).to.equal(`${totalVaccines} of ${totalVaccines}`);
      } else {
        expect(value).to.equal('Yes');
      }
    }

    //Verify immunization report
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(babyName);
    expect(firstReportInfo.form).to.equal('Immunization Visit');

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    const openReportInfo = await reportsPage.getOpenReportInfo();
    expect(openReportInfo.patientName).to.equal(babyName);
    expect(openReportInfo.reportName).to.equal('Immunization Visit');
    expect(openReportInfo.senderName).to.equal(`Submitted by ${user.contact.name} `);
    expect(openReportInfo.senderPhone).to.equal(user.contact.phone);

    expect((await reportsPage.getDetailReportRowContent('chw_sms')).rowValues[0]).to.equal('Nice work, ! ' +
      `${babyName} (${babyMedicID}) attended their immunizations visit at the health facility. ` +
      'Keep up the good work. Thank you! Test notes');

    const { rowValues } = await reportsPage.getDetailReportRowContent('vaccines_received.');
    rowValues.forEach(value => expect(value).to.equal('yes'));
  });


  it('Submit immunization visit - SMS IMM form', async () => {
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();

    const messageValue = `IMM ${babyMedicID}`;

    await gatewayApiUtils.api.postMessage({
      id: 'IMM-id',
      from: user.phone,
      content: messageValue
    });

    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(babyName);
    expect(firstReport.form).to.equal('Immunization Visit (SMS)');
  });

  it('Verify the targets page', async () => {
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();
    await commonPage.sync();

    await commonPage.goToAnalytics();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Active pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Births', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Deliveries with 1+ visit', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Deliveries with 4+ visits', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Deliveries at facility', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Children under 5', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'Children registered', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'Vaccines given', count: '2', countNumberColor: TARGET_MET_COLOR },
      { title: 'Children vaccinated', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'Children with no vaccines reported', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Children with BCG reported', percent: '100%', percentCount: '(1 of 1)' },
      { title: '<5 children screened for growth monitoring', percent: '0%', percentCount: '(0 of 1)' },
      { title: '<5 Underweight Growth Monitoring', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active MAM cases', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active SAM cases', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active OTP cases', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active SFP cases', count: '0', countNumberColor: TARGET_MET_COLOR },
    ]);
  });

});
