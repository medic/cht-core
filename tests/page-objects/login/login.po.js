const helper = require('../../helper');

const incorrectCredentialsText =
  'Incorrect user name or password. Please try again.';
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
  login: (username, password, shouldFail) => {
    helper.waitUntilReady(getUsernameField());
    getUsernameField().clear();
    getPasswordField().clear();
    getUsernameField().sendKeys(username);
    getPasswordField().sendKeys(password);
    getLoginButton().click();
    browser.waitForAngular();
    if (shouldFail) {
      expect(helper.isTextDisplayed(incorrectCredentialsText));
    }
  },
};
