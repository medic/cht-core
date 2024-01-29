const FORM = 'form[data-form-id="enketo_widgets"]';

const selectMultipleDropdown = () => $(`${FORM} select[name="/enketo_widgets/enketo_test_select/select_spinner"]`);
const selectOneDropdown = () => $(`${FORM} select[name="/enketo_widgets/enketo_test_select/select1_spinner"]`);
const countryDropdown = () => $(`${FORM} select[name="/enketo_widgets/cascading_widgets/group2/country2"]`);
const cityDropdown = () => $(`${FORM} select[name="/enketo_widgets/cascading_widgets/group2/city2"]`);
const neighborhoodDropdown = () => $(`${FORM} select[name="/enketo_widgets/cascading_widgets/group2/neighborhood2"]`);
const patientNameErrorLabel = () => $(`${FORM} label.invalid-constraint`);
const phoneFieldRequiredMessage = () => {
  return $('input[name="/enketo_widgets/enketo_test_select/phone"] ~ .or-required-msg.active');
};
const phoneFieldConstraintMessage = () => {
  return $('input[name="/enketo_widgets/enketo_test_select/phone"] ~ .or-constraint-msg.active');
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

module.exports = {
  selectMultipleDropdown,
  selectOneDropdown,
  countryDropdown,
  cityDropdown,
  neighborhoodDropdown,
  openDropdown,
  getDropdownValue,
  getDropdownTotalOptions,
  selectDropdownOptions,
  patientNameErrorLabel,
  phoneFieldRequiredMessage,
  phoneFieldConstraintMessage,
};
