const { browser } = require('protractor');
const helper = require('../../../helper');

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

const labelForUser =  element(by.css('#form > label[for="user"]'));

const labelForPassword = element(by.css('#form > label[for="password"]'));

const errorMessageField = element(by.css('p.error.incorrect'));

const getselectedLanguage = () => element(by.css('.locale.selected'));
const getLanguage = async (selector) => {
  const lang = await element.all(by.css(selector)).map(loc => {
    return {
      code: loc.getAttribute('name'),
      name: loc.getText(),
    };
  });
  return lang;
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
      await browser.wait(() => helper.isTextDisplayed(incorrectCredentialsText), 2000);
    }
  },

  returnToLogin: () => element(by.css('.btn[href="/medic/login"]')),

  getAllLocales: async () => await getLanguage('.locale'),

  labelForUser: async () => await helper.getTextFromElementNative(labelForUser),
  labelForPassword: async () => await helper.getTextFromElementNative(labelForPassword),
  getselectedLanguage: async () => await getLanguage('.locale.selected'),

  changeLanguage: async (code) => {
    await changeLocale(code);
    await getLoginButton().click();
    await helper.waitUntilReadyNative(getselectedLanguage());
    return {
      user: await helper.getTextFromElementNative(labelForUser),
      pass: await helper.getTextFromElementNative(labelForPassword),
      error:await helper.getTextFromElementNative(errorMessageField)
    };
  },
};
