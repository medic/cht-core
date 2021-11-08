const utils = require('../../utils');

const submitButton = () => $('div.form-actions button.btn.btn-primary.ng-scope');
const addLanguageButton = () => $('i.fa.fa-plus');
const addLanguageModal = () => $('body.ng-scope.modal-open');
const languageCodeInput = () => $('[ng-model="language.code"]');
const languageNameInput  = () => $('[ng-model="language.name"]');
const languageSubmitButton  = () => $('a.btn.submit.ng-scope.ng-binding.btn-primary');
const applicationLink = () => $('i.fa.fa-fw.fa-home');
const defaultLocaleOption = () => $('#locale');
const outgoingLocaleOption = () => $('#locale-outgoing');

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
  //await (await addLanguageModal()).click();
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
const defaultLanguageDropdown = () => $('#locale');
const setDefaultLanguage = async (language) => {
  await (await defaultLanguageDropdown()).selectByVisibleText(language);
  await (await submitButton()).click();
  await (await submitButton()).waitForClickable();
};

const outgoingLanguageDropdown = () => $('#locale-outgoing');
const setOutgoingMessageLanguage = async (language) => {
  await (await outgoingLanguageDropdown()).selectByVisibleText(language);
  await (await submitButton()).click();
  await (await submitButton()).waitForClickable();
};

const isLanguageSelected = async (el, code) => {
  await (await el()).click();
  const option = await $(`option[value="string:${code}"]`);
  return await option.getAttribute('selected') === 'selected';
};

const goToApplication = async () => {
  await (await applicationLink()).click();
};

module.exports = {
  defaultLocaleOption,
  outgoingLocaleOption,
  goToLanguagesTab,
  openAddLanguageModal,
  addNewLanguage,
  languageDisplayed,
  setDefaultLanguage,
  setOutgoingMessageLanguage,
  isLanguageSelected,
  goToApplication
};

