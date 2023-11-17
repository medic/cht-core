const utils = require('@utils');
const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const OUTCOME = { liveBirth: 'healthy', stillBirth: 'still_birth', miscarriage: 'miscarriage' };
const LOCATION = { facility: 'f', homeAttendant: 's', homeNoAttendant: 'ns' };

const FORM = enketoCommonPage.form('delivery');
const { ACTIVE, ACTIVE_OPTION_LABEL } = enketoCommonPage;
const DELIV_SUM = '/delivery/group_delivery_summary/';
const GROUP_SUM = '/delivery/group_summary/';

const pregnancyOutcome = (value) => $(`${FORM} input[name="${DELIV_SUM}g_pregnancy_outcome"][value="${value}"]`);
const pregnancyOutcomeLabel = (value) => {
  return $(`${FORM} span[data-itext-id="${DELIV_SUM}g_pregnancy_outcome/${value}:label"]${ACTIVE}`);
};
const deliveryLocation = (value) => $(`${FORM} input[name="${DELIV_SUM}g_delivery_code"][value="${value}"]`);
const deliveryLocationLabel = (value) => {
  return $(`${FORM} span[data-itext-id="${DELIV_SUM}g_delivery_code/${value}:label"]${ACTIVE_OPTION_LABEL}`);
};
const deliveryDate = () => $(`${FORM} div.widget.date input`);
const smsNote = () => $(`${FORM} ${enketoCommonPage.smsNote('delivery')}`);
const patientNameSummary = () => {
  const nameSum = enketoCommonPage.patientNameSummary('delivery');
  return $(`${FORM} span[data-itext-id="${GROUP_SUM}r_patient_info:label"]${ACTIVE} ${nameSum}`);
};
const patientIdSummary = () => {
  const idSum = enketoCommonPage.patientIdSummary('delivery', 'summary');
  return $(`${FORM} span[data-itext-id="${GROUP_SUM}r_patient_info:label"]${ACTIVE} ${idSum}`);
};
const outcomeSummary = () => {
  const pregOutcomeLabel = `span[data-itext-id="${GROUP_SUM}r_pregnancy_outcome:label"]${ACTIVE}`;
  return $(`${FORM} ${pregOutcomeLabel} span[data-value=" ${DELIV_SUM}display_delivery_outcome "]`);
};
const locationSummary = () => {
  const birthDateLabel = `span[data-itext-id="${GROUP_SUM}r_birth_date:label"]${ACTIVE}`;
  return $(`${FORM} ${birthDateLabel} span[data-value=" ${GROUP_SUM}r_delivery_location "]`);
};
const followUpSmsNote1 = () => $(`${FORM} ${enketoCommonPage.followUpSmsNote1('delivery', 'summary')}`);
const followUpSmsNote2 = () => $(`${FORM} ${enketoCommonPage.followUpSmsNote2('delivery', 'summary')}`);

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
