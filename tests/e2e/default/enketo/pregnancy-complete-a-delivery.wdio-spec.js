const moment = require('moment');
const utils = require('@utils');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

describe('Contact Delivery Form', () => {
  const BABY_NAME = 'Benja';
  const BABY_DOB = moment().format('YYYY-MM-DD');
  const BABY_SEX = 'male';

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.hideSnackbar();
    await commonPage.goToPeople(pregnantWoman._id);
  });

  it('Complete a delivery: Process a delivery with a live child and facility birth.', async () => {
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.openFastActionReport('delivery');
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Severe headache', 'No');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'No');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setInputValue('date', 'Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('text', 'Name', BABY_NAME);
    await commonEnketoPage.selectRadioButton('Sex', 'Male');
    await commonEnketoPage.selectRadioButton('Birth weight', 'I don\'t know');
    await commonEnketoPage.selectRadioButton('Birth length', 'I don\'t know');
    await commonEnketoPage.selectRadioButton('What vaccines have they received?', 'None');
    await commonEnketoPage.selectRadioButton('Is the child exclusively breastfeeding?', 'Yes');
    await commonEnketoPage.selectRadioButton('Were they initiated on breastfeeding within on hour of delivery?', 'Yes');
    await commonEnketoPage.selectRadioButton('Infected umbilical cord', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await commonEnketoPage.selectRadioButton('Difficulty feeding or drinking', 'No');
    await commonEnketoPage.selectRadioButton('Vomits everything', 'No');
    await commonEnketoPage.selectRadioButton('Drowsy or unconscious', 'No');
    await commonEnketoPage.selectRadioButton('Body stiffness', 'No');
    await commonEnketoPage.selectRadioButton('Yellow skin color', 'No');
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Blue skin color (hypothermia)', 'No');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Health facility' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    await contactPage.openReport();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();
    const { patientName, reportName } = await reportPage.getOpenReportInfo();
    expect(patientName).to.equal(pregnantWoman.name);
    expect(reportName).to.equal('Delivery');
  });

  it('The past pregnancy card should show', async () => {
    await commonPage.goToPeople(pregnantWoman._id);
    await contactPage.getContactCardTitle();
    expect((await contactPage.getContactCardTitle())).to.equal('Past pregnancy');
  });

  it('The child registered during birth should be created and should display the proper information', async () => {
    await contactPage.selectLHSRowByText(BABY_NAME);
    expect((await contactPage.getContactInfoName())).to.equal(BABY_NAME);
    expect((await contactPage.getContactSummaryField('contact.sex')).toLocaleUpperCase())
      .to.equal(BABY_SEX.toLocaleUpperCase());
  });

  it('The targets page should be updated', async () => {
    await commonPage.goToAnalytics();
    await analyticsPage.goToTargets();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', goal: '20', count: '1', countNumberColor: TARGET_UNMET_COLOR },
      { title: 'Live births', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'In-facility deliveries', percent: '100%', percentCount: '(1 of 1)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR },
    ]);
  });
});
