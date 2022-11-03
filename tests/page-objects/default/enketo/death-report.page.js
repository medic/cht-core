const moment = require('moment');
const genericForm = require('./generic-form.wdio.page');

const PLACE_OF_DEATH = {healthFacility: 'health_facility', home: 'home', other: 'other'};

const FORM = 'form[data-form-id="death_report"]';
const SUMMARY_SECTION = `${FORM} section[name="/death_report/group_review"]`;

const deathDate = () => $(`${FORM} section[name="/death_report/death_details"] input.ignore.input-small`);
const deathPlace = (value) => $(`${FORM} input[name="/death_report/death_details/place_of_death"][value="${value}"]`);
const deathInformation = () => $(`${FORM} textarea[name="/death_report/death_details/death_information"]`);
const patientNameSummary = () => $(SUMMARY_SECTION +
  ' span[data-itext-id="/death_report/group_review/r_patient_details:label"]' +
  ' span[data-value=" /death_report/patient_display_name "]');
const deathDateSummary = () => $(`${SUMMARY_SECTION} span[data-value=" /death_report/death_details/date_of_death "]`);
const deathInformationSummary = () => $(SUMMARY_SECTION +
  ' span[data-value=" /death_report/death_details/death_information "]');

const setDeathDate = async (value = moment().format('YYYY-MM-DD')) => {
  const date = await deathDate();
  await date.waitForDisplayed();
  await date.setValue(value);
};

const selectDeathPlace = async (value = PLACE_OF_DEATH.healthFacility) => {
  const place = await deathPlace(value);
  await place.waitForClickable();
  await place.click();
};

const setDeathInformation = async (text = 'Test note') => {
  const note = await deathInformation();
  await note.waitForDisplayed();
  await note.setValue(text);
};

const getSummaryDetails = async () => {
  return {
    patientName: await patientNameSummary().getText(),
    deathDate: await deathDateSummary().getText(),
    deathInformation: await deathInformationSummary().getText(),
  };
};

const submitDeathReport = async ({
  deathDate: deathDateValue,
  deathPlace: deathPlaceValue,
  deathInformation: deathInformationValue
} = {}) => {
  await selectDeathPlace(deathPlaceValue);
  await setDeathInformation(deathInformationValue);
  await setDeathDate(deathDateValue);
  await genericForm.nextPage();
  await genericForm.submitForm();

};

module.exports = {
  PLACE_OF_DEATH,
  setDeathDate,
  selectDeathPlace,
  setDeathInformation,
  getSummaryDetails,
  submitDeathReport,
};
