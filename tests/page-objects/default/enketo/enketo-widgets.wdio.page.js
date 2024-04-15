const FORM = 'form[data-form-id="enketo_widgets_test"]';

const selectMultipleDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/enketo_widgets_test/enketo_test_select/select_spinner"]`);
};

const selectOneDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/enketo_widgets_test/enketo_test_select/select1_spinner"]`);
};

const countryDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/enketo_widgets_test/cascading_widgets/group2/country2"]`);
};

const cityDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/enketo_widgets_test/cascading_widgets/group2/city2"]`);
};

const neighborhoodDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/enketo_widgets_test/cascading_widgets/group2/neighborhood2"]`);
};

const patientNameErrorLabel = (formId = FORM) => $(`${formId} label.invalid-constraint`);

const phoneFieldRequiredMessage = () => {
  return $('input[name="/enketo_widgets_test/enketo_test_select/phone"] ~ .or-required-msg.active');
};

const phoneFieldConstraintMessage = () => {
  return $('input[name="/enketo_widgets_test/enketo_test_select/phone"] ~ .or-constraint-msg.active');
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

const clickTimer = async (formId) => {
  const noteTimerSelector = `form[data-form-id="${formId}"] .current .or-appearance-countdown-timer canvas`;
  const triggerTimerSelector = `form[data-form-id="${formId}"] .current.or-appearance-countdown-timer canvas`;
  const timer = await $(`${noteTimerSelector}, ${triggerTimerSelector}`);
  await timer.waitForClickable();
  await timer.click();
};

const imagePreview = (formId) => $(`form[data-form-id="${formId}"] .file-picker .file-preview img`);

const selectImage = async (formId, filePath) => {
  const input = await $(`form[data-form-id="${formId}"] input[type=file]`);
  await input.addValue(filePath);
};

const reportImagePreview = () => $('.report-image');

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
  clickTimer,
  imagePreview,
  selectImage,
  reportImagePreview,
};
