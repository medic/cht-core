const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const FORM = enketoCommonPage.form('pregnancy_visit');
const dangerSig = () => $$(`${FORM} input[name="/pregnancy_visit/group_danger_signs/g_danger_signs"]`);
const smsNote = () => $(`${FORM} ${enketoCommonPage.smsNote('pregnancy_visit')}`);
const dangerSignSummary = () => $$(FORM +
  ` span[data-itext-id*="/pregnancy_visit/group_review/r_danger_sign"]${enketoCommonPage.ACTIVE}`);
const patientNameSummary = () => $(FORM +
  ` span[data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"]${enketoCommonPage.ACTIVE} ` +
  enketoCommonPage.patientNameSummary('pregnancy_visit'));
const patientIdSummary = () => $(FORM +
  ` span[data-itext-id="/pregnancy_visit/group_review/r_pregnancy_details:label"]${enketoCommonPage.ACTIVE} ` +
  enketoCommonPage.patientIdSummary('pregnancy_visit'));
const followUpSmsNote1 = () => $(`${enketoCommonPage.followUpSmsNote1('pregnancy_visit')}`);
const followUpSmsNote2 = () => $(`${enketoCommonPage.followUpSmsNote2('pregnancy_visit')}`);

const selectAllDangerSigns = async () => {
  const dangerSigns = await dangerSig();
  for (const dangerSign of dangerSigns) {
    await dangerSign.click();
  }
  return dangerSigns;
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
    countDangerSigns: await dangerSignSummary().length,
    followUpSmsNote1: await followUpSmsNote1().getText(),
    followUpSmsNote2: await followUpSmsNote2().getText(),
  };
};

const submitPregnancyVisit = async () => {
  await commonPage.openFastActionReport('pregnancy_visit');
  await selectAllDangerSigns();
  await genericForm.nextPage();
  await setNote('Test note');
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  selectAllDangerSigns,
  setNote,
  dangerSignSummary,
  getSummaryDetails,
  submitPregnancyVisit,
};
