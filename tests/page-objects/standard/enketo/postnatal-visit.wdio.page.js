const assessingTo = (value) => $(`input[name="/postnatal_visit/group_who_assessed/g_who_assessed"][value="${value}"]`);
const smsNote = () => $('textarea[name="/postnatal_visit/group_note/g_chw_sms"]');
const dangerSigns = (person) => $$(
  `input[name="/postnatal_visit/group_danger_signs_${person}/g_danger_signs_${person}"]`
);
const otherDangerSign = (person) => $(
  `input[name="/postnatal_visit/group_danger_signs_${person}/danger_signs_${person}_other"]`
);
const patientNameSummary = () => $(
  'span[data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label"].active ' +
  'span[data-value=" /postnatal_visit/patient_name "]'
);
const patientIdSummary = () => $(
  'span[data-itext-id="/postnatal_visit/group_review/r_postnatal_details:label"].active ' +
  'span[data-value=" /postnatal_visit/group_review/r_patient_id "]'
);
const visitInformation = () => $(
  'label:not(.disabled) span[data-itext-id*="/postnatal_visit/group_review/r_visit_"].active'
);
const dangerSignsSummary = (person) => $$(
  `span[data-itext-id*="/postnatal_visit/group_review/r_${person}_danger_sign"].active`
);
const followUpSmsNote1 = () => $(
  'span[data-itext-id="/postnatal_visit/group_review/r_followup_note1:label"].active'
);
const followUpSmsNote2 = () => $(
  'span[data-itext-id="/postnatal_visit/group_review/r_followup_note2:label"].active ' +
  'span[data-value=" /postnatal_visit/chw_sms "]'
);

const selectAssessingTo = async (value = 'both') => {
  const whom = await assessingTo(value);
  await whom.waitForClickable();
  await whom.click();
};

const selectAllDangerSigns = async (person) => {
  const signs = await dangerSigns(person);
  for (const dangerSign of signs) {
    await dangerSign.click();
  }
  return signs.length;
};

const setOtherDangerSign = async (person, sign) => {
  const otherSign = await otherDangerSign(person);
  await otherSign.waitForDisplayed();
  await otherSign.setValue(sign);
};

const setSmsNote = async (noteValue) => {
  const note = await smsNote();
  await note.waitForDisplayed();
  await note.setValue(noteValue);
};

const getSummaryDetails = async () => {
  return {
    patientName: await patientNameSummary().getText(),
    patientId: await patientIdSummary().getText(),
    visitInformation: await visitInformation().getText(),
    // subtracting 1 element that corresponds to the title
    countDangerSignsMom: await dangerSignsSummary('mom').length - 1,
    // subtracting 1 element that corresponds to the title
    countDangerSignsBaby: await dangerSignsSummary('baby').length - 1,
    followUpSmsNote1: await followUpSmsNote1().getText(),
    followUpSmsNote2: await followUpSmsNote2().getText(),
  };
};

module.exports = {
  selectAssessingTo,
  selectAllDangerSigns,
  setOtherDangerSign,
  setSmsNote,
  getSummaryDetails,
};
