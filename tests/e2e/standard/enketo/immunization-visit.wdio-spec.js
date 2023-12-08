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
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { TARGET_MET_COLOR } = analyticsPage;

describe('Immunization Visit', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const user = userFactory.build({ place: healthCenter._id, roles: ['district_admin'] });
  const babyName = 'Baby1';
  let babyMedicID = '';

  before(async () => {
    const allVaccines = ['BCG', 'Cholera', 'Hepatitis A', 'Hepatitis B', 'HPV (Human Papillomavirus)', 'Influenza',
      'Japanese Encephalitis', 'Meningococcal', 'MMR (Measles, Mumps, Rubella)',
      'MMRV (Measles, Mumps, Rubella, Varicella)', 'Inactivated Polio', 'Fractional inactivated polio',
      'Oral Polio', 'Pentavalent', 'Pneumococcal Pneumonia', 'Rotavirus', 'Typhoid', 'Vitamin A',
      'Yellow Fever', 'Diptheria, Pertussis, and Tetanus (DPT)'];

    await utils.saveDocs([...places.values()]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.addHealthPrograms('Immunizations', allVaccines);
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
    const note = 'Test notes - immunization visit';
    const allVaccines = ['BCG', 'Cholera', 'Hepatitis A', 'Hepatitis B', 'HPV (Human Papillomavirus)', 'Influenza',
      'Japanese Encephalitis', 'Meningococcal', 'MMR (Measles, Mumps, Rubella)',
      'MMRV (Measles, Mumps, Rubella, Varicella)', 'Polio', 'Pentavalent', 'Pneumococcal Pneumonia',
      'Rotavirus', 'Typhoid', 'Vitamin A', 'Yellow Fever', 'DPT Booster'];

    await loginPage.login(user);
    await commonPage.waitForPageLoaded();

    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(babyName);
    babyMedicID = await contactPage.contactPageDefault.getContactMedicID();
    await commonPage.openFastActionReport('immunization_visit');

    for (const vaccine of allVaccines) {
      await commonEnketoPage.selectCheckBox('Which vaccines would you like to report on today?', vaccine);
    }
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton(`Did ${babyName} receive the BCG vaccine?`, 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Cholera did ${babyName} receive?`, 'Cholera 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Cholera did ${babyName} receive?`, 'Cholera 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Cholera did ${babyName} receive?`, 'Cholera 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Hepatitis A did ${babyName} receive?`, 'Hepatitis A 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Hepatitis A did ${babyName} receive?`, 'Hepatitis A 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton(`Did ${babyName} receive Hepatitis B vaccine?`, 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of HPV did ${babyName} receive?`, 'HPV 1');
    await commonEnketoPage.selectCheckBox(`Which dose of HPV did ${babyName} receive?`, 'HPV 2');
    await commonEnketoPage.selectCheckBox(`Which dose of HPV did ${babyName} receive?`, 'HPV 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton(`Did ${babyName} receive the flu vaccine?`, 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton(`Did ${babyName} receive the Japanese Encephalitis vaccine?`, 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Meningococcal did ${babyName} receive?`, 'Meningococcal 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Meningococcal did ${babyName} receive?`, 'Meningococcal 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Meningococcal did ${babyName} receive?`, 'Meningococcal 3');
    await commonEnketoPage.selectCheckBox(`Which dose of Meningococcal did ${babyName} receive?`, 'Meningococcal 4');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of MMR did ${babyName} receive?`, 'MMR 1');
    await commonEnketoPage.selectCheckBox(`Which dose of MMR did ${babyName} receive?`, 'MMR 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of MMRV did ${babyName} receive?`, 'MMRV 1');
    await commonEnketoPage.selectCheckBox(`Which dose of MMRV did ${babyName} receive?`, 'MMRV 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Birth Polio');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Oral Polio 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Oral Polio 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Oral Polio 3');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Inactivated Polio 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Inactivated Polio 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Inactivated Polio 3');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Fractional IPV 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Polio did ${babyName} receive?`, 'Fractional IPV 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Pentavalent did ${babyName} receive?`, 'Pentavalent 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Pentavalent did ${babyName} receive?`, 'Pentavalent 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Pentavalent did ${babyName} receive?`, 'Pentavalent 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of DPT Booster did ${babyName} receive?`, 'DPT Booster 1');
    await commonEnketoPage.selectCheckBox(`Which dose of DPT Booster did ${babyName} receive?`, 'DPT Booster 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Pneumococcal Pneumonia did ${babyName} receive?`,
      'Pneumococcal 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Pneumococcal Pneumonia did ${babyName} receive?`,
      'Pneumococcal 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Pneumococcal Pneumonia did ${babyName} receive?`,
      'Pneumococcal 3');
    await commonEnketoPage.selectCheckBox(`Which dose of Pneumococcal Pneumonia did ${babyName} receive?`,
      'Pneumococcal 4');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Rotavirus did ${babyName} receive?`, 'Rotavirus 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Rotavirus did ${babyName} receive?`, 'Rotavirus 2');
    await commonEnketoPage.selectCheckBox(`Which dose of Rotavirus did ${babyName} receive?`, 'Rotavirus 3');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(`Which dose of Typhoid did ${babyName} receive?`, 'Typhoid 1');
    await commonEnketoPage.selectCheckBox(`Which dose of Typhoid did ${babyName} receive?`, 'Typhoid 2');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton(`Did ${babyName} receive a Vitamin A vaccine?`, 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton(`Did ${babyName} receive the Yellow Fever vaccine?`, 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      babyName,
      babyMedicID,
      'BCG',
      'Cholera 1', 'Cholera 2', 'Cholera 3',
      'Hepatitis A 1', 'Hepatitis A 2',
      'Hepatitis B',
      'HPV 1', 'HPV 2', 'HPV 3',
      'Flu',
      'Japanese Encephalitis',
      'Meningococcal 1', 'Meningococcal 2', 'Meningococcal 3', 'Meningococcal 4',
      'MMR 1', 'MMR 2',
      'MMRV 1', 'MMRV 2',
      'Birth Polio',
      'Oral Polio 1', 'Oral Polio 2', 'Oral Polio 3',
      'Inactivated Polio 1', 'Inactivated Polio 2', 'Inactivated Polio 3',
      'Fractional Inactivated Polio 1', 'Fractional Inactivated Polio 2',
      'Pentavalent 1', 'Pentavalent 2', 'Pentavalent 3',
      'DPT Booster 1', 'DPT Booster 2',
      'Pneumococcal 1', 'Pneumococcal 2', 'Pneumococcal 3', 'Pneumococcal 4',
      'Rotavirus 1', 'Rotavirus 2', 'Rotavirus 3',
      'Typhoid 1', 'Typhoid 2',
      'Vitamin A',
      'Yellow Fever'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      `Nice work, ! ${babyName} (${babyMedicID}) attended their immunizations visit at the health facility. ` +
      `Keep up the good work. Thank you! ${note}`)).to.be.true;

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    //Verify immunization card
    const vaccinesValues = await contactPage.getImmCardVaccinesValues();
    for (const value of vaccinesValues) {
      if (value.error) {
        continue;
      }

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
    expect(openReportInfo.senderName).to.equal(`Submitted by ${user.contact.name}`);
    expect(openReportInfo.senderPhone).to.equal(user.contact.phone);

    expect((await reportsPage.getDetailReportRowContent('chw_sms')).rowValues[0]).to.equal('Nice work, ! ' +
      `${babyName} (${babyMedicID}) attended their immunizations visit at the health facility. ` +
      `Keep up the good work. Thank you! ${note}`);

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
