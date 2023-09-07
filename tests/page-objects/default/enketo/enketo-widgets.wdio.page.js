const FORM = 'form[data-form-id="enketo_widgets"]';

const formTitle = () => $(`${FORM} #form-title`);
const selectMultipleDropdown = () => $(`${FORM} select[name="/enketo_widgets/enketo_test_select/select_spinner"]`);
const selectOneDropdown = () => $(`${FORM} select[name="/enketo_widgets/enketo_test_select/select1_spinner"]`);
const countryRadio = (value) => $(FORM +
  ` input[name="/enketo_widgets/cascading_widgets/group1/country"][value="${value}"]`);
const cityRadio = (value) => $(FORM +
  ` input[name="/enketo_widgets/cascading_widgets/group1/city"][value="${value}"]`);
const neighborhoodRadio = (value) => $(FORM +
  ` input[name="/enketo_widgets/cascading_widgets/group1/neighborhood"][value="${value}"]`);
const countryDropdown = () => $(`${FORM} select[name="/enketo_widgets/cascading_widgets/group2/country2"]`);
const cityDropdown = () => $(`${FORM} select[name="/enketo_widgets/cascading_widgets/group2/city2"]`);
const neighborhoodDropdown = () => $(`${FORM} select[name="/enketo_widgets/cascading_widgets/group2/neighborhood2"]`);
const patientUuid = () => $(`${FORM} input[name="/enketo_widgets/inputs/contact/_id"]`);
const patientId = () => $(`${FORM} input[name="/enketo_widgets/inputs/contact/patient_id"]`);
const patientName = () => $(`${FORM} input[name="/enketo_widgets/inputs/contact/name"]`);
const patientNameErrorLabel = () => $(`${FORM} label.invalid-constraint`);
const phoneField = () => $('input.ignore[type="tel"]:has(+ input[name="/enketo_widgets/enketo_test_select/phone"])');
const phoneFieldRequiredMessage = () =>
  $('input[name="/enketo_widgets/enketo_test_select/phone"] ~ .or-required-msg.active');
const phoneFieldConstraintMessage = () =>
  $('input[name="/enketo_widgets/enketo_test_select/phone"] ~ .or-constraint-msg.active');

const getFormTitle = async () => {
  const title = await formTitle();
  await title.waitForDisplayed();
  return await title.getText();
};

const selectCountryRadio = async (value = 'nl') => {
  const country = await countryRadio(value);
  await country.waitForDisplayed();
  await country.waitForClickable();
  await country.click();
};

const selectCityRadio = async (value = 'rot') => {
  const city = await cityRadio(value);
  await city.waitForDisplayed();
  await city.waitForClickable();
  await city.click();
};

const selectNeighborhoodRadio = async (value = 'centrum') => {
  const neighborhood = await neighborhoodRadio(value);
  await neighborhood.waitForDisplayed();
  await neighborhood.waitForClickable();
  await neighborhood.click();
};

const openDropdown = async (element) => {
  const dropdownButton = element.nextElement().$('.dropdown-toggle');
  await dropdownButton.waitForClickable();
  await dropdownButton.click();
};

const getDropdownValue = async (element) => {
  const dropdownValue = element.nextElement().$('.dropdown-toggle .selected');
  await dropdownValue.waitForDisplayed();
  return dropdownValue.getText();
};

const getDropdownTotalOptions = async (element) => {
  const dropdownOptions = element.nextElement().$$('.dropdown-menu > li');
  return await dropdownOptions.length;
};

const selectDropdownOptions = async (element, type, value) => {
  const dropdownOption = element.nextElement().$(`.dropdown-menu input[type="${type}"][value="${value}"]`);
  await dropdownOption.waitForClickable();
  await dropdownOption.click();
};

const setPatientUuid = async (value = '123 456 789') => {
  const uuid = await patientUuid();
  await uuid.waitForDisplayed();
  await uuid.setValue(value);
};

const setPatientId = async (value = '12345') => {
  const id = await patientId();
  await id.waitForDisplayed();
  await id.setValue(value);
};

const setPatientName = async (value = 'Emilio') => {
  const name = await patientName();
  await name.waitForDisplayed();
  await name.setValue(value);
};

const setPhoneNumber = async (value) => {
  await phoneField().waitForDisplayed();
  await (await phoneField()).setValue(value);
};

module.exports = {
  getFormTitle,
  selectMultipleDropdown,
  selectOneDropdown,
  countryDropdown,
  cityDropdown,
  neighborhoodDropdown,
  selectCountryRadio,
  selectCityRadio,
  selectNeighborhoodRadio,
  openDropdown,
  getDropdownValue,
  getDropdownTotalOptions,
  selectDropdownOptions,
  setPatientUuid,
  setPatientId,
  setPatientName,
  patientNameErrorLabel,
  setPhoneNumber,
  phoneFieldRequiredMessage,
  phoneFieldConstraintMessage,
};
