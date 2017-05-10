var helper = require('../../helper');

var incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
var passwordBlankText = 'Can\'t be blank.';
var usernameField = element(by.id('user'));
var passwordField = element(by.id('password'));
var loginButton = element(by.id('login'));
var incorrectCredeantialsError = element(by.className('error incorrect'));

module.exports = {
  login: function (username, password) {
    helper.waitUntilReady(usernameField);
    usernameField.clear();
    passwordField.clear();
    usernameField.sendKeys(username);
    passwordField.sendKeys(password);
    loginButton.click();
    browser.waitForAngular();
  },

  getIncorrectCredentialsText: function () {
    return incorrectCredentialsText;
  },

  getIncorrectCredeantialsError: function () {
    return incorrectCredeantialsError;
  },

  getPasswordBlankText: function () {
    return passwordBlankText;
  },

  getUsernameField: function () {
    return usernameField;
  },

  getPasswordField: function () {
    return passwordField;
  },
  
  getLoginButton: function () {
    return loginButton;
  }
};
