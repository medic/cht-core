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
  return element(by.css('.btn.submit.btn-primary:not(.ng-hide)'));
};

const getCancelButton = () => {
  return element(by.className('btn cancel'));
};

module.exports = {
  submit: () => {
    helper.waitUntilReady(getSubmitButton());
    getSubmitButton().click();
  },

  cancel: () => {
    helper.waitUntilReady(getCancelButton());
    getCancelButton().click();
  },

  fillForm: (username, fullName) => {
    helper.waitUntilReady(getSubmitButton()); // wait for form to load
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

