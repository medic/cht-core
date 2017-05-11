const helper = require('../../helper');

const getUsernameField = () => {
  return element(by.id('name'));
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

const getUserTypeField = () => {
  return element(by.id('type'));
};

const getPasswordField = () => {
  return element(by.id('password'));
};

const getConfirmPasswordField = () => {
  return element(by.id('password-confirm'));
};
const getSubmitButton = () => {
  return element(by.className('btn submit btn-primary'));
};

const getCancelButton = () => {
  return element(by.className('btn cancel'));
};

module.exports = {
  submit: function () {
    helper.waitUntilReady(getSubmitButton());
    getSubmitButton().click();
  },

  cancel: function () {
    helper.waitUntilReady(getCancelButton());
    getCancelButton().click();
  },

  fillForm: function ( username, fullName) {
    getUsernameField().sendKeys(username);
    getFullNameField().sendKeys(fullName);
    getEmailField().sendKeys('bede@mobile.org');
    getPhoneField().sendKeys('0064212134566');
    helper.selectDropdownByText(getLanguageField(), 'English', 2);
    helper.selectDropdownByText(getUserTypeField(), 'Full access');
    getPasswordField().sendKeys('pass');
    getConfirmPasswordField().sendKeys('pass');
  }
};

