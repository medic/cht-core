const helper = require('../../helper');
const utils = require('../../utils');

const submitButton = element(by.css('div.form-actions button.btn.btn-primary.ng-scope'));
const addLanguageButton = element(by.css('i.fa.fa-plus'));
const addLanguageModal = element(by.css('body.ng-scope.modal-open'));
const languageCodeInput = element(by.model('language.code'));
const languageNameInput  = element(by.model('language.name'));
const languageSubmitButton  = element(by.css('a.btn.submit.ng-scope.ng-binding.btn-primary'));
const applicationLink = element(by.css('i.fa.fa-fw.fa-home'));
const defaultLocaleOption = element(by.css('#locale'));
const outgoingLocaleOption = element(by.css('#locale-outgoing'));
const languages = () => element(by.css('#language-accordion > .panel'));

const goToLanguagesTab = async () => {
  await browser.get(utils.getAdminBaseUrl() + 'display/languages');
  await utils.resetBrowserNative(addLanguageButton);
  await helper.waitElementToBeVisibleNative(addLanguageButton);
  await helper.waitElementToBeVisible(languages());
};

const openAddLanguageModal = async () => {
  await helper.clickElementNative(addLanguageButton);
  await helper.waitElementToBeVisibleNative(addLanguageModal);
};

const addNewLanguage = async (code, name) => {
  await helper.clickElementNative(addLanguageButton);
  await helper.waitElementToBeVisibleNative(addLanguageModal);
  await languageCodeInput.sendKeys(code);
  await languageNameInput.sendKeys(name);
  await languageSubmitButton.click();
};

const languageDisplayed = async (code) => {
  const languageDiv = element(by.css(`#locale-${code}`));
  const languageName = await helper.getTextFromElementNative(languageDiv);
  return languageName;
};
const defaultLanguageDropdown = element(by.css('#locale'));
const setDefaultLanguage = async (language) => {
  await helper.selectDropdownByText(defaultLanguageDropdown, language);
  await helper.clickElementNative(submitButton);
  return helper.waitElementToBeClickable(submitButton);
};

const outgoingLanguageDropdown = element(by.css('#locale-outgoing'));
const setOutgoingMessageLanguage = async (language) => {
  await helper.selectDropdownByText(outgoingLanguageDropdown, language);
  await helper.clickElementNative(submitButton);
  await helper.waitElementToBeClickable(submitButton);
};

const isLanguageSelected = async (el, code) => {
  await helper.clickElementNative(el);
  const option = await element(by.css(`option[value="string:${code}"]`));
  return option.getAttribute('selected');
};

const goToApplication = async () => {
  await helper.clickElementNative(applicationLink);
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

