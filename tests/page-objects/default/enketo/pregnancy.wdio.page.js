const moment = require('moment');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');

const GEST_AGE = {lmp: 'method_lmp', lmpApprox: 'method_approx', edd: 'method_edd', none: 'none'};
const FIRST_PREGNANCY_VALUE = {yes: 'primary', no: 'secondary'};

const FORM = 'form[data-form-id="pregnancy"]';
const SUMMARY_SECTION = `${FORM} section[name="/pregnancy/summary"]`;
const KNOW_FUTURE_VISITS = 
  'input[data-name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"]';
const FIRST_PREGNANCY = 'input[data-name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy"]';
const MISCARRIAGE = 'input[name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage"]';
const ADITIONAL_FACTORS = 'input[name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check"]';
const VAGINAL_BLEEDING = 'input[name="/pregnancy/danger_signs/vaginal_bleeding"]';
const FITS = 'input[name="/pregnancy/danger_signs/fits"]';
const ABDOMINAL_PAIN = 'input[name="/pregnancy/danger_signs/severe_abdominal_pain"]';
const HEADACHE = 'input[name="/pregnancy/danger_signs/severe_headache"]';
const VERY_PALE = 'input[name="/pregnancy/danger_signs/very_pale"]';
const FEVER = 'input[name="/pregnancy/danger_signs/fever"]';
const REDUCE_FETAL_MOV = 'input[name="/pregnancy/danger_signs/reduced_or_no_fetal_movements"]';
const BREAKING_OF_WATER = 'input[name="/pregnancy/danger_signs/breaking_water"]';
const EASILY_TIRED = 'input[name="/pregnancy/danger_signs/easily_tired"]';
const SWELLING_HANDS = 'input[name="/pregnancy/danger_signs/face_hand_swelling"]';
const BREATHLESSNESS = 'input[name="/pregnancy/danger_signs/breathlessness"]';
const LLIN = 'input[name="/pregnancy/safe_pregnancy_practices/malaria/uses_llin"]';
const IRON_FOLATE = 'input[name="/pregnancy/safe_pregnancy_practices/iron_folate/iron_folate_daily"]';
const DEWORMING_MEDICATION = 'input[name="/pregnancy/safe_pregnancy_practices/deworming/deworming_med"]';
const HIV_TESTED = 'input[name="/pregnancy/safe_pregnancy_practices/hiv_status/hiv_tested"]';

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
const riskFactors = (value) => $$(`${FORM} ` +
  `input[name="/pregnancy/risk_factors/risk_factors_present/${value}_condition"]`);
const patientNameSummary = () => $(`${SUMMARY_SECTION} span[data-value=" /pregnancy/patient_name "]`);
const weeksPregnantSummary = () => $(`${SUMMARY_SECTION} span[data-value=" /pregnancy/weeks_since_lmp_rounded "]`);
const eddSummary = () => $(`${SUMMARY_SECTION} span[data-value=" /pregnancy/summary/edd_summary "]`);
const riskFactorsSummary = () => $$(`${SUMMARY_SECTION} ` +
  `:not(label.disabled) span[data-itext-id*="/pregnancy/summary/r_risk"]`);
const dangerSignsSummary = () => $$(`${SUMMARY_SECTION} ` +
  `:not(label.disabled) span[data-itext-id*="/pregnancy/summary/r_danger_sign_"]`);

const selectGestationAge = async (value = GEST_AGE.edd) => {
  const getAge = await gestationalAge(value);
  await getAge.waitForDisplayed();
  await getAge.click();
};

const setDeliveryDate = async (value = moment().add(1, 'month').format('YYYY-MM-DD')) => {
  const date = await deliveryDate();
  await date.waitForDisplayed();
  await date.setValue(value);
};

const getConfirmationDetails = async () => {
  return {
    eddConfirm: await eddConfirmation().getText(),
    weeksPregnantConfirm: await weeksPregnantConfirmation().getText(),
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

const selectYesNoOption = async (selector, value = 'yes') => {
  const element = await $(`${FORM} ${selector}[value="${value}"]`);
  await element.waitForDisplayed();
  await element.click();
  return value === 'yes';
};

// The selector for the 'riskFactors' is different depending on the option selected in the 'first pregnancy' question
const selectAllRiskFactors = async (value = FIRST_PREGNANCY_VALUE.no) => {
  const cbRisks = await riskFactors(value);
  for (const risk of cbRisks) {
    if(await risk.getAttribute('value') !== 'none'){
      await risk.click();
    }
  }
  return cbRisks.length - 1; // Subtract 1 due to the 'none' option
};

const getSummaryDetails = async () => {
  return {
    patientNameSumm: await patientNameSummary().getText(),
    weeksPregnantSumm: await weeksPregnantSummary().getText(),
    eddSumm: await eddSummary().getText(),
    riskFactorsSumm: await riskFactorsSummary().length - 1, // Subtract 1 due to the title
    dangerSignsSumm: await dangerSignsSummary().length,
  };
};

const submitPregnancy = async () => {
  await contactPage.createNewAction('Pregnancy registration');
  await selectGestationAge();
  await genericForm.nextPage();
  await setDeliveryDate();
  await genericForm.nextPage();
  await genericForm.nextPage();
  await setANCVisitsPast();
  await genericForm.nextPage();
  await selectYesNoOption(KNOW_FUTURE_VISITS);
  await setFutureVisitDate();
  await genericForm.nextPage();
  await selectYesNoOption(FIRST_PREGNANCY, 'no');
  await selectYesNoOption(MISCARRIAGE);
  await genericForm.nextPage();
  await selectAllRiskFactors(FIRST_PREGNANCY_VALUE.no);
  await selectYesNoOption(ADITIONAL_FACTORS, 'no');
  await genericForm.nextPage();
  await selectYesNoOption(VAGINAL_BLEEDING);
  await selectYesNoOption(FITS);
  await selectYesNoOption(ABDOMINAL_PAIN);
  await selectYesNoOption(HEADACHE);
  await selectYesNoOption(VERY_PALE);
  await selectYesNoOption(FEVER);
  await selectYesNoOption(REDUCE_FETAL_MOV);
  await selectYesNoOption(BREAKING_OF_WATER);
  await selectYesNoOption(EASILY_TIRED);
  await selectYesNoOption(SWELLING_HANDS);
  await selectYesNoOption(BREATHLESSNESS);
  await genericForm.nextPage();
  await selectYesNoOption(LLIN);
  await genericForm.nextPage();
  await selectYesNoOption(IRON_FOLATE);
  await genericForm.nextPage();
  await selectYesNoOption(DEWORMING_MEDICATION);
  await genericForm.nextPage();
  await genericForm.nextPage();
  await selectYesNoOption(HIV_TESTED);
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  GEST_AGE,
  FIRST_PREGNANCY_VALUE,
  KNOW_FUTURE_VISITS,
  FIRST_PREGNANCY,
  MISCARRIAGE,
  ADITIONAL_FACTORS,
  VAGINAL_BLEEDING,
  FITS,
  ABDOMINAL_PAIN,
  HEADACHE,
  VERY_PALE,
  FEVER,
  REDUCE_FETAL_MOV,
  BREAKING_OF_WATER,
  EASILY_TIRED,
  SWELLING_HANDS,
  BREATHLESSNESS,
  LLIN,
  IRON_FOLATE,
  DEWORMING_MEDICATION,
  HIV_TESTED,
  selectGestationAge,
  setDeliveryDate,
  getConfirmationDetails,
  setANCVisitsPast,
  selectYesNoOption,
  setFutureVisitDate,
  selectAllRiskFactors,
  submitPregnancy,
  getSummaryDetails,
};
