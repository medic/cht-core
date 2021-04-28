const helper = require('../../helper');
const utils = require('../../utils');

const addLanguageButton = element(by.css('button.btn.btn-primary'));
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

module.exports = {
  goToLanguagesTab,
  openAddLanguageModal,
  addNewLanguage,
  languageDisplayed
};

