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
  return element(by.css(`.locale[name="${locale}"]`)).click();
};

module.exports = {
  login: async (username, password, shouldFail, locale) => {
    await helper.waitUntilReady(getUsernameField());
    await getUsernameField().clear();
    await getPasswordField().clear();
    await getUsernameField().sendKeys(username);
    await getPasswordField().sendKeys(password);
    await changeLocale(locale);
    await getLoginButton().click();
    await browser.waitForAngular();
    if (shouldFail) {
      expect(helper.isTextDisplayed(incorrectCredentialsText)).toBe(true);
    }
  },

  loginNative: async (username, password, shouldFail, locale) => {
    await helper.waitUntilReadyNative(await getUsernameField());
    await getUsernameField().clear();
    await getPasswordField().clear();
    await getUsernameField().sendKeys(username);
    await getPasswordField().sendKeys(password);
    await changeLocale(locale);
    await helper.clickElementNative(getLoginButton());
    if (shouldFail) {
      browser.wait(helper.isTextDisplayed(incorrectCredentialsText), 2000);
    }
  },
  returnToLogin: () => element(by.css('.btn[href="/medic/login"]'))
};
