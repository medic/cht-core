const { browser } = require('protractor');
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

const getLabelForUser = () => {
  return element(by.css('#form > label:nth-child(2)'));
};
const getLabelForPassword = () => {
  return element(by.css('#form > label:nth-child(4)'));
};

const errorMessageField = element(by.css('p.error.incorrect'));

const getselectedLanguage = () => element(by.css('.locale.selected'));

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
  
  getAllLocales: async () => {
    const locales = await element.all(by.css('.locale')).map(loc => {
      return {
        code: loc.getAttribute('name'),
        name: loc.getText(),       
      };
    });
    return locales;
  },
  
  getLabelForPassword,
  labelForUser: async () => await helper.getTextFromElementNative(getLabelForUser),
  labelForPassword: async () => await helper.getTextFromElementNative(getLabelForPassword),
  getselectedLanguage: async () => {
    const lang = await element(by.css('.locale.selected')).map(loc => {
      return {
        code: loc.getAttribute('name'),
        name: loc.getText(),       
      };
    });
    return lang;
  },

  changeLanguage: async (code) => {
    await changeLocale(code);
    await getLoginButton().click();
    await browser.sleep(10000);
    await helper.waitUntilReadyNative(getselectedLanguage());
    return {
      user: await helper.getTextFromElementNative(getLabelForUser()),
      pass: await helper.getTextFromElementNative(getLabelForPassword()),
      error:await helper.getTextFromElementNative(errorMessageField)
    };
  },
};
