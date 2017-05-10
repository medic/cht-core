const helper = require('../../helper');

const incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
const passwordBlankText = 'Can\'t be blank.';
const getUsernameField = () => {
  return element(by.id('user'));
};
const getPasswordField = () => {
  return element(by.id('password'));
};

const getLoginButton = () => {
  return element(by.id('login'));
};

module.exports = {
  login: function (username, password) {
    helper.waitUntilReady(getUsernameField());
    getUsernameField().clear();
    getPasswordField().clear();
    getUsernameField().sendKeys(username);
    getPasswordField().sendKeys(password);
    getLoginButton().click();
    browser.waitForAngular();
  },

  getIncorrectCredeantialsError: () => {
    return element(by.className('error incorrect'));
  },

  getIncorrectCredentialsText: () => {
    return incorrectCredentialsText;
  },

  getPasswordBlankText: () => {
    return passwordBlankText;
  }
};
