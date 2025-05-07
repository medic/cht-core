const moment = require('moment');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');
const pregnancyVisitForm = require('@page-objects/default/enketo/pregnancy-visit.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { generateScreenshot, isMobile } = require('@utils/screenshots');
let checkMobile=false;
before(async () => {
  if(await isMobile()){
    checkMobile=true;
    await browser.setWindowSize(1440, 1024);
  }
});
describe('Report Creations that will show on Targets', () => {
  //data
  const BABY_NAME = 'Benja';
  const BABY_NAME_2='Daniel';
  const BABY_NAME_3 = 'David';
  const BABY_NAME_4 = 'Diana';
  const BABY_NAME_5 = 'Deigo';
  const BABY_NAME_6 = 'Dia';
  const BABY_NAME_7 = 'Anna';
  const BABY_DOB = moment().format('YYYY-MM-DD');
  const BABY_SEX = 'male';
  const pregnantWomanDateOfBirth = moment().subtract(25, 'years').format('YYYY-MM-DD');
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman2 = personFactory.build({
    patient_id: 'test_woman_2',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman3 = personFactory.build({
    patient_id: 'test_woman_3',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman4 = personFactory.build({
    patient_id: 'test_woman_4',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman5 = personFactory.build({
    patient_id: 'test_woman_5',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman6 = personFactory.build({
    patient_id: 'test_woman_6',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman7 = personFactory.build({
    patient_id: 'test_woman_7',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman8 = personFactory.build({
    patient_id: 'test_woman_8',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman9 = personFactory.build({
    patient_id: 'test_woman_9',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman10 = personFactory.build({
    patient_id: 'test_woman_10',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman11 = personFactory.build({
    patient_id: 'test_woman_11',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman12 = personFactory.build({
    patient_id: 'test_woman_12',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman13 = personFactory.build({
    patient_id: 'test_woman_13',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman14 = personFactory.build({
    patient_id: 'test_woman_14',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman15 = personFactory.build({
    patient_id: 'test_woman_15',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman16 = personFactory.build({
    patient_id: 'test_woman_16',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman17 = personFactory.build({
    patient_id: 'test_woman_17',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const pregnantWoman18 = personFactory.build({
    patient_id: 'test_woman_18',
    date_of_birth: pregnantWomanDateOfBirth,
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman , pregnantWoman2, pregnantWoman3 , pregnantWoman4, pregnantWoman5, pregnantWoman6, pregnantWoman7, pregnantWoman8, pregnantWoman9, pregnantWoman10, pregnantWoman11, pregnantWoman12, pregnantWoman13, pregnantWoman14, pregnantWoman15, pregnantWoman16, pregnantWoman17, pregnantWoman18]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });
  //form creations
  it('New  pregnancy form creation', async () => {
    //pregnacy form creation
    const edd = moment().add(8, 'days');
    const nextANCVisit = moment().add(2, 'day');

    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy(false);

    const summaryTexts = [
      pregnantWoman.name,
      '38', //weeks pregnant
      edd.format('D MMM, YYYY'),
      'Previous miscarriages or stillbirths',
      'Previous difficulties in childbirth',
      'Has delivered four or more children',
      'Last baby born less than one year ago',
      'Heart condition',
      'Asthma',
      'High blood pressure',
      'Diabetes',
      'Vaginal bleeding',
      'Fits',
      'Severe abdominal pain',
      'Severe headache',
      'Very pale',
      'Fever',
      'Reduced or no fetal movements',
      'Breaking of water',
      'Getting tired easily',
      'Swelling of face and hands',
      'Breathlessness'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
    //pregnancy visit form creation
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();


  });
  it('New Pregnancy form creation and Delivery in facility', async () => {
    //pregnacy form creation
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman2._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.openFastActionReport('delivery');
    //delivery form creation
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman2.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Health facility' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
  
    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();


  }); 
  it('New Pregnancy form creation and delivery form(without facility)', async () => {
    //pregnacy form creation
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman3._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.openFastActionReport('delivery');
    //delivery form creation
    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Home');
    await commonEnketoPage.selectRadioButton('Who conducted the delivery?', 'Skilled health care provider');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME_2);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman3.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Home' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();


  });   
  it('New  pregnancy form creation', async () => {
    //pregnacy form creation
    const edd = moment().add(8, 'days');
    const nextANCVisit = moment().add(2, 'day');

    await commonPage.goToPeople(pregnantWoman4._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy(false);

    const summaryTexts = [
      pregnantWoman4.name,
      '38', //weeks pregnant
      edd.format('D MMM, YYYY'),
      'Previous miscarriages or stillbirths',
      'Previous difficulties in childbirth',
      'Has delivered four or more children',
      'Last baby born less than one year ago',
      'Heart condition',
      'Asthma',
      'High blood pressure',
      'Diabetes',
      'Vaginal bleeding',
      'Fits',
      'Severe abdominal pain',
      'Severe headache',
      'Very pale',
      'Fever',
      'Reduced or no fetal movements',
      'Breaking of water',
      'Getting tired easily',
      'Swelling of face and hands',
      'Breathlessness'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
    

  });
  it('New  pregnancy form creation', async () => {
    //pregnacy form creation
    await commonPage.waitForPageLoaded();
    const edd = moment().add(8, 'days');
    const nextANCVisit = moment().add(2, 'day');

    await commonPage.goToPeople(pregnantWoman5._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy(false);

    const summaryTexts = [
      pregnantWoman5.name,
      '38', //weeks pregnant
      edd.format('D MMM, YYYY'),
      'Previous miscarriages or stillbirths',
      'Previous difficulties in childbirth',
      'Has delivered four or more children',
      'Last baby born less than one year ago',
      'Heart condition',
      'Asthma',
      'High blood pressure',
      'Diabetes',
      'Vaginal bleeding',
      'Fits',
      'Severe abdominal pain',
      'Severe headache',
      'Very pale',
      'Fever',
      'Reduced or no fetal movements',
      'Breaking of water',
      'Getting tired easily',
      'Swelling of face and hands',
      'Breathlessness'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
    


  });    
  it('New Pregnancy form creation and delivery form(without facility)', async () => {
    //pregnacy form creation
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman6._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.waitForPageLoaded();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    await commonPage.waitForPageLoaded();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    //delivery form creation
    await commonPage.openFastActionReport('delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Home');
    await commonEnketoPage.selectRadioButton('Who conducted the delivery?', 'Skilled health care provider');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME_3);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman6.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Home' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
  
  });  
  it('New Pregnancy form generations', async () => {
    //pregnacy form creation
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman7._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman8._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman9._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman10._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

  });  
  it('New Pregnancy form generations', async () => {
    //pregnacy form creation
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman11._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman12._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman13._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman14._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

  });   
  it('New Pregnancy form creation and Delivery in facility', async () => {
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman15._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.openFastActionReport('delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME_4);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman15.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Health facility' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
  
  });  
  it('New Pregnancy form creation and Delivery in facility', async () => {
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman16._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.openFastActionReport('delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME_5);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman16.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Health facility' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
  });  
  it('New Pregnancy form creation and delivery form(without facility)', async () => {
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman17._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.waitForPageLoaded();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();
    await commonPage.waitForPageLoaded();
    await commonPage.openFastActionReport('pregnancy_home_visit');
    await pregnancyVisitForm.submitDefaultPregnancyVisit();

    await commonPage.openFastActionReport('delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Home');
    await commonEnketoPage.selectRadioButton('Who conducted the delivery?', 'Skilled health care provider');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME_6);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman17.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Home' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
  
  });
  it('New Pregnancy form creation and delivery form(without facility)', async () => {
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman18._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();

    await commonPage.openFastActionReport('delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsDelivery('No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Home');
    await commonEnketoPage.selectRadioButton('Who conducted the delivery?', 'Skilled health care provider');
    await commonEnketoPage.setDateValue('Date of delivery', BABY_DOB);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME_7);
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
    await commonEnketoPage.selectCheckBox('Which PNC visits have taken place so far?', 'None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman18.name,
      '25', //age
      'Alive and well', //woman's condition
      BABY_DOB,
      'Home' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    await browser.pause(3000);
    if(checkMobile){
      await browser.setWindowSize(375, 850);
    }

    await generateScreenshot('Targets','Overview');   
  });  

});
