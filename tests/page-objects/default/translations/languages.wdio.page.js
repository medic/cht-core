const utils = require('@utils');

const submitButton = () => $('div.form-actions button.btn.btn-primary');
const addLanguageButton = () => $('span=Add new language');
const addLanguageModal = () => $('body.ng-scope.modal-open');
const languageCodeInput = () => $('[ng-model="language.code"]');
const languageNameInput  = () => $('[ng-model="language.name"]');
const languageSubmitButton  = () => $('a.btn.submit.ng-scope.ng-binding.btn-primary');
const applicationLink = () => $('span=Application');
const defaultLanguageDropdown = () => $('#locale');
const outgoingLanguageDropdown = () => $('#locale-outgoing');

const goToLanguagesTab = async () => {
  await browser.url(utils.getAdminBaseUrl() + 'display/languages');
  await browser.refresh();
  await  addLanguageButton().waitForDisplayed();
};

const addNewLanguage = async (code, name) => {
  await  addLanguageButton().click();
  await  addLanguageModal().waitForDisplayed();
  await  languageCodeInput().waitForDisplayed();
  await  languageCodeInput().setValue(code);
  await  languageNameInput().setValue(name);
  await  languageSubmitButton().click();
  await  languageSubmitButton().waitForDisplayed({reverse: true});
};

const languageDisplayed = async (code) => {
  const languageDiv = () => $(`#locale-${code}`);
  return await  languageDiv().getText();
};

const selectLanguage = async (element, code) => {
  await  element().selectByAttribute('value', `string:${code}`);
  await  submitButton().click();
  await  $('.loader.inline').waitForDisplayed({reverse: true});
  const newLanguage = await $(`[value="string:${code}"]`);
  return await newLanguage.isSelected();
};

const goToApplication = async () => {
  await  applicationLink().click();
};

module.exports = {
  outgoingLanguageDropdown,
  defaultLanguageDropdown,
  goToLanguagesTab,
  addNewLanguage,
  languageDisplayed,
  selectLanguage,
  goToApplication
};

