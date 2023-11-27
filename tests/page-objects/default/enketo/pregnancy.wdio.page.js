const moment = require('moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const setFutureVisitDate = async (value = moment().add(1, 'day').format('YYYY-MM-DD')) => {
  const date = await $('section[name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date"] ' +
    'input.ignore.input-small');
  await date.waitForDisplayed();
  await date.setValue(value);
};

const submitDefaultPregnancy = async () => {
  await commonPage.openFastActionReport('pregnancy');
  await commonEnketoPage.selectRadioButton('How would you like to report the pregnancy?',
    'Expected date of delivery (EDD)');
  await genericForm.nextPage();
  await commonEnketoPage.setDateValue('Please enter the expected date of delivery.',
    moment().add(8, 'days').format('YYYY-MM-DD'));
  await genericForm.nextPage();
  await genericForm.nextPage();
  await commonEnketoPage.setInputValue('How many times has the woman been to the health facility for ANC?', '0');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('If the woman has a specific upcoming ANC appointment date, ' +
    'enter it here. You will receive a task three days before to remind her to attend.', 'Enter date');
  await setFutureVisitDate(moment().add(2, 'day').format('YYYY-MM-DD'));
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Is this the woman\'s first pregnancy?', 'No');
  await commonEnketoPage.selectRadioButton('Has the woman had any miscarriages or stillbirths?', 'Yes');
  await genericForm.nextPage();
  await commonEnketoPage.selectCheckBox('Previous difficulties in childbirth');
  await commonEnketoPage.selectCheckBox('Has delivered four or more children');
  await commonEnketoPage.selectCheckBox('Last baby born less than one year ago');
  await commonEnketoPage.selectCheckBox('Heart condition');
  await commonEnketoPage.selectCheckBox('Asthma');
  await commonEnketoPage.selectCheckBox('High blood pressure');
  await commonEnketoPage.selectCheckBox('Diabetes');
  await commonEnketoPage.selectRadioButton(
    'Are there additional factors that could make this pregnancy high-risk?',
    'No'
  );
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
  await commonEnketoPage.selectRadioButton('Fits', 'Yes');
  await commonEnketoPage.selectRadioButton('Severe abdominal pain', 'Yes');
  await commonEnketoPage.selectRadioButton('Severe headache', 'Yes');
  await commonEnketoPage.selectRadioButton('Very pale', 'Yes');
  await commonEnketoPage.selectRadioButton('Fever', 'Yes');
  await commonEnketoPage.selectRadioButton('Reduced or no fetal movements', 'Yes');
  await commonEnketoPage.selectRadioButton('Breaking of water', 'Yes');
  await commonEnketoPage.selectRadioButton('Getting tired easily', 'Yes');
  await commonEnketoPage.selectRadioButton('Swelling of face and hands', 'Yes');
  await commonEnketoPage.selectRadioButton('Breathlessness', 'Yes');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Does the woman use a long-lasting insecticidal net (LLIN)?', 'Yes');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Is the woman taking iron folate daily?', 'Yes');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Has the woman received deworming medication?', 'Yes');
  await genericForm.nextPage();
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Has the woman been tested for HIV in the past 3 months?', 'Yes');
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  setFutureVisitDate,
  submitDefaultPregnancy,
};
