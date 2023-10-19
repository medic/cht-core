const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const APROX_LMP = {up2Months: 61, up3Months: 91, up4Months: 122, b5To6Months: 183, b7To8Months: 244};

const FORM = 'form[data-form-id="pregnancy"]';
const knowLMP = (value) => $(`${FORM} input[name="/pregnancy/group_lmp/g_lmp_method"][value="${value}"]`);
const aproxLMP = (value) => $(`${FORM} input[name="/pregnancy/group_lmp/g_lmp_approx"][value="${value}"]`);
const getEstDeliveryDate = () => $(`${FORM} span[data-itext-id="/pregnancy/group_lmp/g_display_edd:label"].active`);
const risksFac = () => $$(`${FORM} [name="/pregnancy/group_risk_factors"] label:not(:first-child) > [type="checkbox"]`);
const dangerSigns = () => $$(`${FORM} input[name="/pregnancy/group_danger_signs/g_danger_signs"]`);
const smsNote = () => $(`${FORM} textarea[name="/pregnancy/group_note/g_chw_sms"]`);
const patientNameSummary = () => $(FORM +
  ' span[data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"].active' +
  ' span[data-value=" /pregnancy/patient_name "]');
const patientIdSummary = () => $(FORM +
  ' span[data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"].active' +
  ' span[data-value=" /pregnancy/group_review/r_patient_id "]');
const riskFactorsSummary = () => $$(`${FORM} :not(label.disabled):not(label.or-appearance-yellow)  > ` +
  `span[data-itext-id*="/pregnancy/group_review/r_risk_factor"].active`);
const dangerSignsSummary = () => $$(`${FORM} span[data-itext-id*="/pregnancy/group_review/r_danger_sign"].active`);
const followUpSmsNote1 = () => $(`${FORM} span[data-itext-id="/pregnancy/group_review/r_followup_note1:label"].active`);
const followUpSmsNote2 = () => $(`${FORM} span[data-itext-id="/pregnancy/group_review/r_followup_note2:label"].active` +
 ' [data-value=" /pregnancy/chw_sms "]');

const selectKnowLMP = async (value = 'approx') => {
  const lmpOption = await knowLMP(value);
  await lmpOption.waitForDisplayed();
  await lmpOption.click();
};

const selectAproxLMP = async (value = APROX_LMP.up2Months) => {
  const aproxLMPOption = await aproxLMP(value);
  await aproxLMPOption.waitForDisplayed();
  await aproxLMPOption.click();
};

// Select all the risk factors except the first one, because there is a constraint in the code.
const selectAllRiskFactors = async () => {
  const riskFactors = await risksFac();
  for (const rfactor of riskFactors) {
    await rfactor.click();
  }
  return riskFactors;
};

const selectAllDangerSigns = async () => {
  const dangerSig = await dangerSigns();
  for (const dangerSign of dangerSig) {
    await dangerSign.click();
  }
  return dangerSig;
};

const setNote = async (text = 'Test note') => {
  const note = await smsNote();
  await note.waitForDisplayed();
  await note.setValue(text);
};

const getSumamryDetails = async () => {
  return {
    patientName: await patientNameSummary().getText(),
    patientId: await patientIdSummary().getText(),
    countRiskFactors: await riskFactorsSummary().length,
    countDangerSigns: await dangerSignsSummary().length,
    followUpSmsNote1: await followUpSmsNote1().getText(),
    followUpSmsNote2: await followUpSmsNote2().getText(),
  };
};

const submitPregnancy = async () => {
  await commonPage.openFastActionReport('pregnancy');
  await selectKnowLMP();
  await selectAproxLMP(APROX_LMP.b7To8Months);
  await genericForm.nextPage();
  await selectAllRiskFactors();
  await genericForm.nextPage();
  await selectAllDangerSigns();
  await genericForm.nextPage();
  await setNote('Test note');
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  APROX_LMP,
  selectKnowLMP,
  selectAproxLMP,
  getEstDeliveryDate,
  selectAllRiskFactors,
  selectAllDangerSigns,
  setNote,
  riskFactorsSummary,
  dangerSignsSummary,
  getSumamryDetails,
  submitPregnancy,
};
