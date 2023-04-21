const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');

const FORM = 'form[data-form-id="pregnancy_visit"]';
const dangerSig = () => $$(`${FORM} input[name="/pregnancy_visit/group_danger_signs/g_danger_signs"]`);
const smsNote = () => $(`${FORM} textarea[name="/pregnancy_visit/group_note/g_chw_sms"]`);
const dangerSignSummary = () => $$(`${FORM} span[data-itext-id*="/pregnancy_visit/group_review/r_danger_sign"].active`);
const followUpSMS = () => $(`${FORM} span[data-value=" /pregnancy_visit/chw_sms "]`);

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

const getFollowUpSMS = async () => {
  const sms = await followUpSMS();
  await sms.waitForDisplayed();
  return sms.getText();
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
  getFollowUpSMS,
  submitPregnancyVisit,
};
