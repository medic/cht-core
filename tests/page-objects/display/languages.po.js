const { browser }=require('protractor');
const helper = require('../../helper');
const utils = require('../../utils');

const submitButton = element(by.css('div.form-actions button.btn.btn-primary.ng-scope'));
const addLanguageButton = element(by.css('i.fa.fa-plus'));
const addLanguageModal = element(by.css('body.ng-scope.modal-open'));
const languageCodeInput = element(by.model('language.code'));
const languageNameInput  = element(by.model('language.name'));
const languageSubmitButton  = element(by.css('a.btn.submit.ng-scope.ng-binding.btn-primary'));
const goToLanguagesTab = async () => {
  await browser.get(utils.getAdminBaseUrl() + 'display/languages');
  await utils.resetBrowserNative(addLanguageButton);
  await helper.waitElementToBeVisibleNative(addLanguageButton);
};

const openAddLanguageModal = async () => {
  await helper.clickElementNative(addLanguageButton);
  await helper.waitElementToBeVisibleNative(addLanguageModal);
};

const addNewLanguage = async (code, name) =>{
  await helper.clickElementNative(addLanguageButton);
  await helper.waitElementToBeVisibleNative(addLanguageModal);
  await languageCodeInput.sendKeys(code);
  await languageNameInput.sendKeys(name);
  await languageSubmitButton.click();
  await helper.waitElementToBeVisibleNative(addLanguageButton);
};

const languageDisplayed = async (code, name) =>{
  const languageName = await helper.getTextFromElementNative(element(by.css(`#locale-${code}`)
    .element(by.css('a.ng-binding.collapsed'))));
  return languageName === name;
};
const defaultLanguageDropdown=element(by.css('#locale'));
const setDefaultLanguage = async (language) => {
  await helper.selectDropdownByText(defaultLanguageDropdown, language);
  await helper.clickElementNative(submitButton);
  await helper.waitElementToBeClickable(submitButton);
};

const outgoingLanguageDropdown=element(by.css('#locale-outgoing'));
const setOutgoingMessageLanguage = async (language) => {
  await helper.selectDropdownByText(outgoingLanguageDropdown, language);
  await helper.clickElementNative(submitButton);
  await helper.waitElementToBeClickable(submitButton);
};

const isLanguageSelected = async (selector, code) => {
  await helper.clickElementNative(element(by.css(selector)));
  const option = await element(by.css(`option[value="string:${code}"]`));
  expect(option.getAttribute('selected')).toBe('selected');
  browser.actions().sendKeys(protractor.Key.ESCAPE).perform();
};

module.exports = {
  goToLanguagesTab,
  openAddLanguageModal,
  addNewLanguage,
  languageDisplayed,
  setDefaultLanguage,
  setOutgoingMessageLanguage,
  isLanguageSelected
};

