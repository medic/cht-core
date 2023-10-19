const OUTCOME = {liveBirth: 'healthy', stillBirth: 'still_birth', miscarriage: 'miscarriage'};
const LOCATION = {facility: 'f', homeAttendant: 's', homeNoAttendant: 'ns'};

const FORM = 'form[data-form-id="delivery"]';
const pregnancyOutcome = (value) => $(FORM +
  ` input[name="/delivery/group_delivery_summary/g_pregnancy_outcome"][value="${value}"]`);
const pregnancyOutcomeLabel = (value) => $(FORM +
  ` span[data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/${value}:label"].active`);
const deliveryLocation = (value) => $(FORM +
  ` input[name="/delivery/group_delivery_summary/g_delivery_code"][value="${value}"]`);
const deliveryLocationLabel = (value) => $(FORM +
  ` span[data-itext-id="/delivery/group_delivery_summary/g_delivery_code/${value}:label"].active`);
const deliveryDate = () => $(`${FORM} div.widget.date input`);
const smsNote = () => $(`${FORM} textarea[name="/delivery/group_note/g_chw_sms"]`);
const patientNameSummary = () => $(FORM +
  ' span[data-itext-id="/delivery/group_summary/r_patient_info:label"].active' +
  ' span[data-value=" /delivery/patient_name "]');
const patientIdSummary = () => $(FORM +
  ' span[data-itext-id="/delivery/group_summary/r_patient_info:label"].active' +
  ' span[data-value=" /delivery/group_summary/r_patient_id "]');
const outcomeSummary = () => $(FORM +
  ' span[data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label"].active' +
  ' span[data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]');
const locationSummary = () => $(FORM +
  ' span[data-itext-id="/delivery/group_summary/r_birth_date:label"].active' +
  ' span[data-value=" /delivery/group_summary/r_delivery_location "]');
const followUpNote1 = () => $(FORM +
  ' span[data-itext-id="/delivery/group_summary/r_followup_note1:label"].active');
const followUpNote2 = () => $(FORM +
  ' span[data-itext-id="/delivery/group_summary/r_followup_note2:label"].active' +
  ' span[data-value=" /delivery/chw_sms "]');

const selectPregnancyOutcome = async (value = OUTCOME.liveBirth) => {
  const outcome = await pregnancyOutcome(value);
  await outcome.waitForDisplayed();
  await outcome.click();
  return await pregnancyOutcomeLabel(value).getText();
};

const selectDeliveryLocation = async (value = LOCATION.facility) => {
  const location = await deliveryLocation(value);
  await location.waitForDisplayed();
  await location.click();
  return await deliveryLocationLabel(value).getText();
};

const setDeliveryDate =  async (value) => {
  const date = await deliveryDate();
  await date.waitForDisplayed();
  await date.setValue(value);
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
    outcome: await outcomeSummary().getText(),
    location: await locationSummary().getText(),
    followUpSmsNote1: await followUpNote1().getText(),
    followUpSmsNote2: await followUpNote2().getText(),
  };
};

module.exports = {
  OUTCOME,
  LOCATION,
  selectPregnancyOutcome,
  selectDeliveryLocation,
  setDeliveryDate,
  setNote,
  getSummaryDetails,
};
