const OUTCOME = {liveBirth: 'healthy', stillBirth: 'still_birth', miscarriage: 'miscarriage'};
const LOCATION = {facility: 'f', homeAttendant: 's', homeNoAttendant: 'ns'};

const FORM = 'form[data-form-id="delivery"]';
const pregnancyOutcome = (value) => $(FORM +
  `input[name="/delivery/group_delivery_summary/g_pregnancy_outcome"][value="${value}"`);
const pregnancyOutcomeLabel = (value) => $(FORM +
  `span[data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/${value}:label"]`);
const deliveryLocation = (value) => $(FORM +
  `input[name="/delivery/group_delivery_summary/g_delivery_code"][value="${value}"`);
const deliveryLocationLabel = (value) => $(FORM +
  `span[data-itext-id="/delivery/group_delivery_summary/g_delivery_code/${value}:label"]`);
const deliveryDate = () => $(`${FORM} div.widget.date input`);
const smsNote = () => $(`${FORM} textarea[name="/delivery/group_note/g_chw_sms"]`);
const outcomeSummary = () => $(FORM + 
  `span[data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]`);
const locationSummary = () => $(`${FORM} span[data-value=" /delivery/group_summary/r_delivery_location "]`);
const followUpSMS = () => $(`${FORM} span[data-value=" /delivery/chw_sms "]`);

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

const getOutcomeSummary = async () => {
  const outcome = await outcomeSummary();
  await outcome.waitForDisplayed();
  return await outcome.getText();
};

const getLocationSummary = async () => {
  const location = await locationSummary();
  await location.waitForDisplayed();
  return await location.getText();
};

const getFollowUpSMS = async () => {
  const sms = await followUpSMS();
  await sms.waitForDisplayed();
  return sms.getText();
};

module.exports = {
  OUTCOME,
  LOCATION,
  selectPregnancyOutcome,
  selectDeliveryLocation,
  setDeliveryDate,
  setNote,
  getOutcomeSummary,
  getLocationSummary,
  getFollowUpSMS,
};
