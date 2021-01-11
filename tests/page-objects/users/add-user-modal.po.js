const helper = require('../../helper');
const utils = require('../../utils');

const getUsernameField = () => {
  return element(by.id('edit-username'));
};

const getFullNameField = () => {
  return element(by.id('fullname'));
};

const getPhoneField = () => {
  return element(by.id('phone'));
};

const getEmailField = () => {
  return element(by.id('email'));
};
const getLanguageField = () => {
  return element(by.id('language'));
};

const getRoleField = () => {
  return element(by.id('role'));
};

const getPasswordField = () => {
  return element(by.id('edit-password'));
};

const getConfirmPasswordField = () => {
  return element(by.id('edit-password-confirm'));
};
const getSubmitButton = () => {
  return element(by.css('.btn.submit.btn-primary:not(.ng-hide)'));
};

const getCancelButton = () => {
  return element(by.className('btn cancel'));
};

module.exports = {
  submit: async () => {
    utils.deprecated('submit','submitNative');
    await helper.waitUntilReady(getSubmitButton());
    await getSubmitButton().click();
  },
  submitNative: async () => {
    await helper.waitUntilReadyNative(getSubmitButton());
    await getSubmitButton().click();
  },

  cancel: () => {
    helper.waitUntilReady(getCancelButton());
    getCancelButton().click();
  },

  fillForm: async (username, fullName, password) => {
    utils.deprecated('fillForm', 'fillFormNative')
    await helper.waitUntilReady(getSubmitButton()); // wait for form to load
    await getUsernameField().sendKeys(username);
    await getFullNameField().sendKeys(fullName);
    await getEmailField().sendKeys('bede@mobile.org');
    await getPhoneField().sendKeys('0064212134566');
    await helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    await helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    await getPasswordField().sendKeys(password);
    await getConfirmPasswordField().sendKeys(password);
  },
  fillFormNative: async (username, fullName, password) => {
    await helper.waitUntilReadyNative(getSubmitButton()); // wait for form to load
    await getUsernameField().sendKeys(username);
    await getFullNameField().sendKeys(fullName);
    await getEmailField().sendKeys('bede@mobile.org');
    await getPhoneField().sendKeys('0064212134566');
    await helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    await helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    await getPasswordField().sendKeys(password);
    await getConfirmPasswordField().sendKeys(password);
  }
};
