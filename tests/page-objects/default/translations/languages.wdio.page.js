const utils = require('../../../utils');

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
  await (await addLanguageButton()).waitForDisplayed();
};

const addNewLanguage = async (code, name) => {
  await (await addLanguageButton()).click();
  await (await addLanguageModal()).waitForDisplayed();
  await (await languageCodeInput()).waitForDisplayed();
  await (await languageCodeInput()).setValue(code);
  await (await languageNameInput()).setValue(name);
  await (await languageSubmitButton()).click();
  await (await languageSubmitButton()).waitForDisplayed({reverse:true});

  // add language to app_settings
  const { languages } = await utils.getSettings();
  languages.push({
    locale: code,
    enabled: true,
  });
  await utils.updateSettings({ languages }, true);
};

const languageDisplayed = async (code) => {
  const languageDiv = () => $(`#locale-${code}`);
  const languageName = await (await languageDiv()).getText();
  return languageName;
};

const selectLanguage = async (element, code) => {
  await (await element()).selectByAttribute('value', `string:${code}`);
  await (await submitButton()).click();
  await (await $('.loader.inline')).waitForDisplayed({reverse:true});
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
  addNewLanguage,
  languageDisplayed,
  selectLanguage,
  goToApplication
};

