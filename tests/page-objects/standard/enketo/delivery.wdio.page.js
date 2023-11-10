const utils = require('@utils');
const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const OUTCOME = { liveBirth: 'healthy', stillBirth: 'still_birth', miscarriage: 'miscarriage' };
const LOCATION = { facility: 'f', homeAttendant: 's', homeNoAttendant: 'ns' };

const FORM = enketoCommonPage.form('delivery');
const pregnancyOutcome = (value) => $(FORM +
  ` input[name="/delivery/group_delivery_summary/g_pregnancy_outcome"][value="${value}"]`);
const pregnancyOutcomeLabel = (value) => $(FORM +
  ` span[data-itext-id="/delivery/group_delivery_summary/g_pregnancy_outcome/${value}:label"]` +
  enketoCommonPage.ACTIVE);
const deliveryLocation = (value) => $(FORM +
  ` input[name="/delivery/group_delivery_summary/g_delivery_code"][value="${value}"]`);
const deliveryLocationLabel = (value) => $(FORM +
  ` span[data-itext-id="/delivery/group_delivery_summary/g_delivery_code/${value}:label"]` +
  enketoCommonPage.ACTIVE_OPTION_LABEL);
const deliveryDate = () => $(`${FORM} div.widget.date input`);
const smsNote = () => $(`${FORM} ${enketoCommonPage.smsNote('delivery')}`);
const patientNameSummary = () => $(FORM +
  ` span[data-itext-id="/delivery/group_summary/r_patient_info:label"]${enketoCommonPage.ACTIVE} ` +
  enketoCommonPage.patientNameSummary('delivery'));
const patientIdSummary = () => $(FORM +
  ` span[data-itext-id="/delivery/group_summary/r_patient_info:label"]${enketoCommonPage.ACTIVE} ` +
  enketoCommonPage.patientIdSummary('delivery'));
const outcomeSummary = () => $(FORM +
  ` span[data-itext-id="/delivery/group_summary/r_pregnancy_outcome:label"]${enketoCommonPage.ACTIVE}` +
  ' span[data-value=" /delivery/group_delivery_summary/display_delivery_outcome "]');
const locationSummary = () => $(FORM +
  ` span[data-itext-id="/delivery/group_summary/r_birth_date:label"]${enketoCommonPage.ACTIVE}` +
  ' span[data-value=" /delivery/group_summary/r_delivery_location "]');
const followUpSmsNote1 = () => $(`${FORM} ${enketoCommonPage.followUpSmsNote1('pregnancy')}`);
const followUpSmsNote2 = () => $(`${FORM} ${enketoCommonPage.followUpSmsNote2('pregnancy')}`);

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
  return utils.isMinimumChromeVersion()
    ? await (await deliveryLocationLabel(value)).getAttribute('innerHTML')
    : await (await deliveryLocationLabel(value)).getText();
};

const setDeliveryDate = async (value) => {
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
    followUpSmsNote1: await followUpSmsNote1().getText(),
    followUpSmsNote2: await followUpSmsNote2().getText(),
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
