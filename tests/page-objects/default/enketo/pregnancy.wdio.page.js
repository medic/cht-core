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
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

const GESTATION_AGE = {lmp: 'method_lmp', lmpApprox: 'method_approx', edd: 'method_edd', none: 'none'};
const FIRST_PREGNANCY_VALUE = {yes: 'primary', no: 'secondary'};

const FORM = 'form[data-form-id="pregnancy"]';
const SUMMARY_SECTION = `${FORM} section[name="/pregnancy/summary"]`;
const KNOWN_FUTURE_VISITS =
  'input[data-name="/pregnancy/anc_visits_hf/anc_visits_hf_next/anc_next_visit_date/appointment_date_known"]';
const FIRST_PREGNANCY = 'input[data-name="/pregnancy/risk_factors/risk_factors_history/first_pregnancy"]';
const MISCARRIAGE = 'input[name="/pregnancy/risk_factors/risk_factors_history/previous_miscarriage"]';
const ADDITIONAL_FACTORS = 'input[name="/pregnancy/risk_factors/risk_factors_present/additional_risk_check"]';
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
  `:not(label.disabled):not(label.or-appearance-h3) span[data-itext-id*="/pregnancy/summary/r_risk"]`);
const dangerSignsSummary = () => $$(`${SUMMARY_SECTION} ` +
  `:not(label.disabled) span[data-itext-id*="/pregnancy/summary/r_danger_sign_"]`);

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

// The selector for the 'riskFactors' is different depending on the option selected in the 'first pregnancy' question
const selectAllRiskFactors = async (value = FIRST_PREGNANCY_VALUE.no) => {
  const cbRisks = await riskFactors(value);
  for (const risk of cbRisks) {
    if (await risk.getAttribute('value') !== 'none') {
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
    riskFactorsSumm: await riskFactorsSummary().length,
    dangerSignsSumm: await dangerSignsSummary().length,
  };
};

const submitPregnancy = async ({
  gestationalAge: gestationalAgeValue = GESTATION_AGE.edd,
  deliveryDate: deliveryDateValue = moment().add(1, 'month').format('YYYY-MM-DD'),
  ancVisitPast: ancVisitPastValue = 0,
  knowFutureVisits: knowFutureVisitsValue = 'yes',
  futureVisitDate: futureVisitDateValue = moment().add(1, 'day').format('YYYY-MM-DD'),
  firstPregnancy: firstPregnancyValue = 'no',
  miscarriage: miscarriageValue = 'yes',
  firstPregnancySelected: firstPregnancySelectedValue = FIRST_PREGNANCY_VALUE.no,
  aditionalFactors: aditionalFactorsValue = 'no',
  vaginalBleeding: vaginalBleedingValue = 'yes',
  fits: fitsValue = 'yes',
  abdominalPain: abdominalPainValue = 'yes',
  headache: headacheValue = 'yes',
  veryPale: veryPaleValue = 'yes',
  fever: feverValue = 'yes',
  reduceFetalMov: reduceFetalMovValue = 'yes',
  breakingWater: breakingWaterValue = 'yes',
  easilyTired: easilyTiredValue = 'yes',
  swellingHands: swellingHandsValue = 'yes',
  breathlessness: breathlessnessValue = 'yes',
  llin: llinValue = 'yes',
  ironFolate: ironFolateValue = 'yes',
  dewormingMedication: dewormingMedicationValue = 'yes',
  hivTested: hivTestedValue = 'yes'
} = {}) => {
  await commonPage.openFastActionReport('pregnancy');
  await selectGestationAge(gestationalAgeValue);
  await genericForm.nextPage();
  await setDeliveryDate(deliveryDateValue);
  await genericForm.nextPage();
  await genericForm.nextPage();
  await setANCVisitsPast(ancVisitPastValue);
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(KNOWN_FUTURE_VISITS, knowFutureVisitsValue);
  await setFutureVisitDate(futureVisitDateValue);
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(FIRST_PREGNANCY, firstPregnancyValue);
  await genericForm.selectYesNoOption(MISCARRIAGE, miscarriageValue);
  await genericForm.nextPage();
  await selectAllRiskFactors(firstPregnancySelectedValue);
  await genericForm.selectYesNoOption(ADDITIONAL_FACTORS, aditionalFactorsValue);
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(dangerSignPage.vaginalBleeding('pregnancy'), vaginalBleedingValue);
  await genericForm.selectYesNoOption(dangerSignPage.fits('pregnancy'), fitsValue);
  await genericForm.selectYesNoOption(dangerSignPage.abdominalPain('pregnancy'), abdominalPainValue);
  await genericForm.selectYesNoOption(dangerSignPage.headache('pregnancy'), headacheValue);
  await genericForm.selectYesNoOption(dangerSignPage.veryPale('pregnancy'), veryPaleValue);
  await genericForm.selectYesNoOption(dangerSignPage.fever('pregnancy'), feverValue);
  await genericForm.selectYesNoOption(dangerSignPage.reduceFetalMov('pregnancy'), reduceFetalMovValue);
  await genericForm.selectYesNoOption(dangerSignPage.breakingOfWater('pregnancy'), breakingWaterValue);
  await genericForm.selectYesNoOption(dangerSignPage.easilyTired('pregnancy'), easilyTiredValue);
  await genericForm.selectYesNoOption(dangerSignPage.swellingHands('pregnancy'), swellingHandsValue);
  await genericForm.selectYesNoOption(dangerSignPage.breathlessness('pregnancy'), breathlessnessValue);
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(LLIN, llinValue);
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(IRON_FOLATE, ironFolateValue);
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(DEWORMING_MEDICATION, dewormingMedicationValue);
  await genericForm.nextPage();
  await genericForm.nextPage();
  await genericForm.selectYesNoOption(HIV_TESTED, hivTestedValue);
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  GESTATION_AGE,
  FIRST_PREGNANCY_VALUE,
  KNOWN_FUTURE_VISITS,
  FIRST_PREGNANCY,
  MISCARRIAGE,
  ADDITIONAL_FACTORS,
  LLIN,
  IRON_FOLATE,
  DEWORMING_MEDICATION,
  HIV_TESTED,
  selectGestationAge,
  setDeliveryDate,
  getConfirmationDetails,
  setANCVisitsPast,
  setFutureVisitDate,
  selectAllRiskFactors,
  submitPregnancy,
  getSummaryDetails,
};
