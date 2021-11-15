const utils = require('../../utils');

const submitButton = () => $('div.form-actions button.btn.btn-primary.ng-scope');
const addLanguageButton = () => $('i.fa.fa-plus');
const addLanguageModal = () => $('body.ng-scope.modal-open');
const languageCodeInput = () => $('[ng-model="language.code"]');
const languageNameInput  = () => $('[ng-model="language.name"]');
const languageSubmitButton  = () => $('a.btn.submit.ng-scope.ng-binding.btn-primary');
const applicationLink = () => $('i.fa.fa-fw.fa-home');
const defaultLanguageDropdown = () => $('#locale');
const outgoingLanguageDropdown = () => $('#locale-outgoing');

const goToLanguagesTab = async () => {
  await browser.url(utils.getAdminBaseUrl() + 'display/languages');
  await browser.refresh();
  await (await addLanguageButton()).waitForDisplayed();
};

const openAddLanguageModal = async () => {
  await (await addLanguageButton()).click();
  await (await addLanguageModal()).waitForDisplayed();
};

const addNewLanguage = async (code, name) =>{
  await (await addLanguageButton()).click();
  await (await addLanguageModal()).waitForDisplayed();
  await (await languageCodeInput()).waitForDisplayed();
  await (await languageCodeInput()).setValue(code);
  await (await languageNameInput()).setValue(name);
  await (await languageSubmitButton()).click();
  await (await languageSubmitButton()).waitForDisplayed({reverse:true});
};

const languageDisplayed = async (code) =>{
  const languageDiv = () => $(`#locale-${code}`);
  const languageName = await (await languageDiv()).getText();
  return languageName;
};

const selectLanguage = async (element, code) => {
  await (await element()).selectByAttribute('value', `string:${code}`);
  await (await submitButton()).click();
  await browser.waitUntil(async () => (await $('.success.ng-binding.ng-scope').getText()) === 'Saved');
  const newLanguage = await $(`[value="string:${code}"]`);
  return await newLanguage.isSelected();
};

const goToApplication = async () => {
  await (await applicationLink()).click();
};

module.exports = {
  outgoingLanguageDropdown,
  defaultLanguageDropdown,
  goToLanguagesTab,
  openAddLanguageModal,
  addNewLanguage,
  languageDisplayed,
  selectLanguage,
  goToApplication
};

