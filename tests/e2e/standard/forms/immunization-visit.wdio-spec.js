const utils = require('../../../utils');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const commonPage = require('../../../page-objects/common/common.wdio.page');
const contactPage = require('../../../page-objects/contacts/contacts.wdio.page');
const reportsPage = require('../../../page-objects/reports/reports.wdio.page');
const analyticsPage = require('../../../page-objects/analytics/analytics.wdio.page');
const genericForm = require('../../../page-objects/forms/generic-form.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const gatewayApiUtils = require('../../../gateway-api.utils');
const immunizationVisitForm = require('../../../page-objects/forms/immunization-visit-form.wdio.page');

describe ('Immunization Visit', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.find(place => place.type === 'health_center');
  const user = userFactory.build({ place: healthCenter._id, roles: ['district_admin'] });
  const babyName = 'Baby1';
  let babyMedicID = '';
  let countAppliedVaccines = 0;

  before (async() => {
    await utils.saveDocs([...places]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();

    await commonPage.goToPeople(healthCenter._id);
    await contactPage.addHealthPrograms('imm');
  });

  it ('Add a new child under 2 years old - SMS CW form', async () => {
    const messageValue = `CW 60 ${babyName}`;
    
    await gatewayApiUtils.api.postMessage({
      id: 'CW-id',
      from: user.phone,
      content: messageValue
    });

    await commonPage.goToPeople(user.place);
    const allRHSPeople = await contactPage.getAllRHSPeopleNames();
    expect(allRHSPeople.length).to.equal(2);
    expect(allRHSPeople).to.include.members([babyName, user.contact.name]);

    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(babyName);
    expect(firstReport.form).to.equal('New Child Registration (SMS)');
  });
  
  it ('Submit immunization visit - webapp', async() => {        
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(babyName);
    babyMedicID = await contactPage.getContactMedicID();
    await contactPage.createNewAction('Immunization Visit');

    await immunizationVisitForm.selectAllVaccines();
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.BCG_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.CHOLERA_VACCINE, 'CH');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.HEPATITIS_A_VACCINE, 'HA');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.HEPATITIS_B_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.HPV_VACCINE, 'HPV');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.FLU_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.JAP_ENCEPHALITIS_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.MENINGOCOCCAL_VACCINE, 'MN');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.MMR_VACCINE, 'MMR');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.MMRV_VACCINE, 'MMRV');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.POLIO_VACCINE, 'PV');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.PENTAVALENT_VACCINE, 'DT');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.DPT_BOOSTER_VACCINE, 'DPT');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.PNEUMOCOCCAL_VACCINE, 'PCV');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.ROTAVIRUS_VACCINE, 'RV');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.TYPHOID_VACCINE, 'TY');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.VITAMIN_A_VACCINE, 'yes');
    await genericForm.nextPage();
    countAppliedVaccines += await immunizationVisitForm.selectAppliedVaccines(immunizationVisitForm.YELLOW_FEVER_VACCINE, 'yes');
    await genericForm.nextPage();
    await immunizationVisitForm.addNotes();
    await genericForm.nextPage();

    expect(await immunizationVisitForm.getPatientNameSummaryPage()).to.equal(babyName);
    expect(countAppliedVaccines).to.equal(await immunizationVisitForm.getAppliedVaccinesSummary() - 1);
    expect(await immunizationVisitForm.getFollowUpSMS()).to.include(babyName && babyMedicID && await immunizationVisitForm.getNotes());

    await genericForm.submitForm();
  });

  it ('Verify immunization card', async () => {
    const vaccinesValues = await contactPage.getImmCardVaccinesValues();
    for (const value of vaccinesValues) {
      if (value.includes('of')) {
        const totalVaccines = value.split(' of ')[1];
        expect(value).to.equal(`${totalVaccines} of ${totalVaccines}`);
      } else {
        expect(value).to.equal('Yes');
      }
    }
  });

  it ('Verify immunization report', async () => {
    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());

    expect(firstReport.heading).to.equal(babyName);
    expect(firstReport.form).to.equal('Immunization Visit');
  });

  it ('Submit immunization visit - SMS IMM form', async () => {
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

  it ('Verify the targets page', async () => {
    await commonPage.logout();
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    const targets = await analyticsPage.getTargets();
    
    expect(targets).to.have.deep.members([
      { title: 'Active pregnancies', count: '0' }, 
      { title: 'New pregnancies', count: '0' }, 
      { title: 'Births', count: '0' }, 
      { title: 'Deliveries with 1+ visit', percent: '0%', percentCount: '(0 of 0)' }, 
      { title: 'Deliveries with 4+ visits', percent: '0%', percentCount: '(0 of 0)' }, 
      { title: 'Deliveries at facility', percent: '0%', percentCount: '(0 of 0)' }, 
      { title: 'Children under 5', count: '1' }, 
      { title: 'Children registered', count: '1' }, 
      { title: 'Vaccines given', count: '2' }, 
      { title: 'Children vaccinated', count: '1' }, 
      { title: 'Children with no vaccines reported', count: '0' }, 
      { title: 'Children with BCG reported', percent: '100%', percentCount: '(1 of 1)' }, 
      { title: '<5 children screened for growth monitoring', percent: '0%', percentCount: '(0 of 1)' }, 
      { title: '<5 Underweight Growth Monitoring', count: '0' }, 
      { title: 'Active MAM cases', count: '0' }, 
      { title: 'Active SAM cases', count: '0' }, 
      { title: 'Active OTP cases', count: '0' }, 
      { title: 'Active SFP cases', count: '0' } 
    ]);
  });

});