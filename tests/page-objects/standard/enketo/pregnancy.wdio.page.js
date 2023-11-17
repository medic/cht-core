const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const APROX_LMP = { up2Months: 61, up3Months: 91, up4Months: 122, b5To6Months: 183, b7To8Months: 244 };

const FORM = enketoCommonPage.form('pregnancy');
const { ACTIVE } = enketoCommonPage;

const knowLMP = (value) => $(`${FORM} input[name="/pregnancy/group_lmp/g_lmp_method"][value="${value}"]`);
const aproxLMP = (value) => $(`${FORM} input[name="/pregnancy/group_lmp/g_lmp_approx"][value="${value}"]`);
const getEstDeliveryDate = () => {
  return $(`${FORM} span[data-itext-id="/pregnancy/group_lmp/g_display_edd:label"]${ACTIVE}`);
};
const risksFac = () => $$(`${FORM} [name="/pregnancy/group_risk_factors"] label:not(:first-child) > [type="checkbox"]`);
const dangerSigns = () => $$(`${FORM} input[name="/pregnancy/group_danger_signs/g_danger_signs"]`);
const smsNote = () => $(`${FORM} ${enketoCommonPage.smsNote('pregnancy')}`);
const patientNameSummary = () => {
  const nameSum = enketoCommonPage.patientNameSummary('pregnancy');
  return $(`${FORM} span[data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"]${ACTIVE} ${nameSum}`);
};
const patientIdSummary = () => {
  const idSum = enketoCommonPage.patientIdSummary('pregnancy', 'review');
  return $(`${FORM} span[data-itext-id="/pregnancy/group_review/r_pregnancy_details:label"]${ACTIVE} ${idSum}`);
};
const riskFactorsSummary = () => {
  const parent = ':not(label.disabled):not(label.or-appearance-yellow)';
  return $$(`${FORM} ${parent}  > span[data-itext-id*="/pregnancy/group_review/r_risk_factor"]${ACTIVE}`);
};
const dangerSignsSummary = () => {
  return $$(`${FORM} span[data-itext-id*="/pregnancy/group_review/r_danger_sign"]${ACTIVE}`);
};
const followUpSmsNote1 = () => $(`${FORM} ${enketoCommonPage.followUpSmsNote1('pregnancy', 'review')}`);
const followUpSmsNote2 = () => $(`${FORM} ${enketoCommonPage.followUpSmsNote2('pregnancy', 'review')}`);

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

const getSummaryDetails = async () => {
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
  getSummaryDetails,
  submitPregnancy,
};
