var helper = require('../../helper');

var usernameField = element(by.id('name'));
var fullNameField = element(by.id('fullname'));
var emailField = element(by.id('email'));
var phoneField = element(by.id('phone'));
var languageField = element(by.id('language'));
var userTypeField = element(by.id('type'));
//var placeField = element(by.id('facility'));
//var contactField = element(by.id('contact'));
var passwordField = element(by.id('password'));
var confirmPasswordField = element(by.id('password-confirm'));
var submitButton = element(by.className('btn submit btn-primary'));
var cancelButton = element(by.className('btn cancel'));

module.exports = {
  submit: function () {
    helper.waitUntilReady(submitButton);
    submitButton.click();
   },

  cancel: function () {
    helper.waitUntilReady(cancelButton);
    cancelButton.click();
  },
  fillForm: function () {
    usernameField.sendKeys('bedeTester01');
    fullNameField.sendKeys('Bede Ngaruko');
    emailField.sendKeys('bede@mobile.org');
    phoneField.sendKeys('0064212134566');
    helper.selectDropdownByText(languageField, 'English', 2);
    helper.selectDropdownByText(userTypeField, 'Full access');
    passwordField.sendKeys('pass');
    confirmPasswordField.sendKeys('pass');
  }
};

