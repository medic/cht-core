const FORM = 'form[data-form-id="enketo_widgets_test"]';

const selectMultipleDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/data/enketo_test_select/select_spinner"]`);
};

const selectOneDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/data/enketo_test_select/select1_spinner"]`);
};

const countryDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/data/cascading_widgets/group2/country2"]`);
};

const cityDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/data/cascading_widgets/group2/city2"]`);
};

const neighborhoodDropdown = (formId = FORM) => {
  return $(`${formId} select[name="/data/cascading_widgets/group2/neighborhood2"]`);
};

const patientNameErrorLabel = (formId = FORM) => $(`${formId} label.invalid-constraint`);

const openDropdown = async (element) => {
  await element.parentElement().$('.dropdown-toggle').click();
};

const getDropdownValue = async (element) => {
  const dropdownValue = await element.nextElement().$('.dropdown-toggle .selected');
  await dropdownValue.waitForDisplayed();
  return dropdownValue.getText();
};

const getDropdownTotalOptions = async (element) => {
  const dropdownOptions = await element.nextElement().$$('.dropdown-menu > li');
  return await dropdownOptions.length;
};

const selectDropdownOptions = async (element, type, value) => {
  const dropdownOption = await element.nextElement().$(`.dropdown-menu input[type="${type}"][value="${value}"]`);
  await dropdownOption.click();
};

const clickTimer = async (formId) => {
  const noteTimerSelector = `form[data-form-id="${formId}"] .current .or-appearance-countdown-timer canvas`;
  const triggerTimerSelector = `form[data-form-id="${formId}"] .current.or-appearance-countdown-timer canvas`;
  const timer = await $(`${noteTimerSelector}, ${triggerTimerSelector}`);
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
  clickTimer,
  imagePreview,
  selectImage,
  reportImagePreview,
};
