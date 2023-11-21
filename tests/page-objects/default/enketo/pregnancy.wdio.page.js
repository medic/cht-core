/**
 * Terminology.
 *  lmp: Last Menstrual Period
 *  lmpApprox: Approximate date of last cycle
 *  edd: Estimate delivery date
 *  LLIN: long-lasting insecticidal net
 */

const moment = require('moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const GESTATION_AGE = {lmp: 'method_lmp', lmpApprox: 'method_approx', edd: 'method_edd', none: 'none'};

const FORM = 'form[data-form-id="pregnancy"]';

const gestationalAge = (value) => $(`${FORM} input[name="/pregnancy/gestational_age/register_method/lmp_method"]` +
  `[value="${value}"]`);
const deliveryDate = () => $(`${FORM} section[name="/pregnancy/gestational_age/method_edd"] input.ignore.input-small`);
const ancVisitsPast = () => $(`${FORM} input[name="/pregnancy/anc_visits_hf/anc_visits_hf_past/visited_hf_count"]`);
const eddConfirmation = () => $(`${FORM} ` +
  `span[data-itext-id="/pregnancy/gestational_age/method_lmp_summary/u_edd_note:label"] ` +
  `span[data-value=" /pregnancy/gestational_age/g_edd "]`);
const weeksPregnantConfirmation = () => $(`${FORM} ` +
  `span[data-itext-id="/pregnancy/gestational_age/method_lmp_summary/lmp_note:label"] ` +
  `span[data-value=" /pregnancy/weeks_since_lmp_rounded "] `);
const futureVisitDate = () => $(`${FORM} ` +
  `section[name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date"] input.ignore.input-small`);

const selectGestationAge = async (value = GESTATION_AGE.edd) => {
  const getAge = await gestationalAge(value);
  await getAge.waitForDisplayed();
  await getAge.click();
};

const setDeliveryDate = async (value = moment().add(1, 'month').format('YYYY-MM-DD')) => {
  const date = await deliveryDate();
  await date.waitForDisplayed();
  await date.setValue(value);
  await (await $('#form-title')).click(); // defocus from date
};

const getConfirmationDetails = async () => {
  return {
    eddConfirm: await (await eddConfirmation()).getText(),
    weeksPregnantConfirm: await (await weeksPregnantConfirmation()).getText(),
  };
};

const setANCVisitsPast = async (value = 0) => {
  const visits = await ancVisitsPast();
  await visits.waitForDisplayed();
  await visits.setValue(value);
};

const setFutureVisitDate = async (value = moment().add(1, 'day').format('YYYY-MM-DD')) => {
  const date = await futureVisitDate();
  await date.waitForDisplayed();
  await date.setValue(value);
};

const submitDefaultPregnancy = async () => {
  await commonPage.openFastActionReport('pregnancy');
  //await selectGestationAge(GESTATION_AGE.edd);
  await commonEnketoPage.selectRadioButton('How would you like to report the pregnancy?',
    'Expected date of delivery (EDD)');
  await genericForm.nextPage();
  await setDeliveryDate(moment().add(1, 'month').format('YYYY-MM-DD'));
  await genericForm.nextPage();
  await genericForm.nextPage();
  await setANCVisitsPast(0);
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
  GESTATION_AGE,
  selectGestationAge,
  setDeliveryDate,
  getConfirmationDetails,
  setANCVisitsPast,
  setFutureVisitDate,
  submitDefaultPregnancy,
};
