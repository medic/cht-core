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

const changeLocale = locale => {
  if (!locale) {
    return;
  }
  element(by.css(`.locale[name="${locale}"]`)).click();
};
const getInboxPage=()=>element(by.css('.inbox.page'));

module.exports = {
  login: (username, password, shouldFail, locale) => {
    helper.waitUntilReady(getUsernameField());
    getUsernameField().clear();
    getPasswordField().clear();
    getUsernameField().sendKeys(username);
    getPasswordField().sendKeys(password);
    changeLocale(locale);
    getLoginButton().click();
    browser.waitForAngular();
    if (shouldFail) {
      expect(helper.isTextDisplayed(incorrectCredentialsText)).toBe(true);
    }
  },
  waitForPageToLoad:()=>helper.waitUntilReady(getInboxPage),
};
