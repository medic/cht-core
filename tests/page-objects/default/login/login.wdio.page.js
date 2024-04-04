const constants = require('@constants');
const utils = require('@utils');
const commonPage = require('../common/common.wdio.page');
const loginButton = () => $('#login');
const userField = () => $('#user');
const passwordField = () => $('#password');
const passwordToggleButton = () => $('#password-toggle');
const labelForUser = () => $('label[for="user"]');
const labelForPassword = () => $('label[for="password"]');
const errorMessageField = () => $('p.error.incorrect');
const localeByName = (locale) => $(`.locale[name="${locale}"]`);

const getErrorMessage = async () => {
  await (await errorMessageField()).waitForDisplayed();
  return await (await errorMessageField()).getText();
};

const login = async ({ username, password, createUser = false, locale, loadPage = true, privacyPolicy, adminApp }) => {
  if (utils.isMinimumChromeVersion) {
    await browser.url('/');
  }
  await setPasswordValue(password);
  await (await userField()).setValue(username);
  await changeLocale(locale);
  await (await loginButton()).click();

  if (createUser) {
    await browser.waitUntil(async () => {
      const cookies = await browser.getCookies('userCtx');
      return cookies.some(cookie => cookie.name === 'userCtx');
    });
    await utils.setupUserDoc(username);
  }

  if (loadPage) {
    const waitForPartialLoad = privacyPolicy || adminApp;
    waitForPartialLoad ? await commonPage.waitForLoaders() : await commonPage.waitForPageLoaded();
  }
};

const cookieLogin = async (options = {}) => {
  const {
    username = constants.USERNAME,
    password = constants.PASSWORD,
    createUser = true,
    locale = 'en',
  } = options;
  const opts = {
    path: '/medic/login',
    body: { user: username, password: password, locale },
    method: 'POST',
    simple: false,
  };
  const resp = await utils.request(opts);
  const cookieArray = utils.parseCookieResponse(resp.headers['set-cookie']);

  await browser.url('/');
  await browser.setCookies(cookieArray);
  if (createUser) {
    await utils.setupUserDoc(username);
  }
  await commonPage.goToBase();
};

const getLanguages = async () => {
  const langs = await $$('.locale');
  return langs.map(async localeElement => {
    return {
      code: await localeElement.getAttribute('name'),
      name: await localeElement.getText(),
    };
  });
};

const getCurrentLanguage = async () => {
  const localeElement = await $('.locale.selected');
  return {
    code: await localeElement.getAttribute('name'),
    name: await localeElement.getText(),
  };
};

const changeLocale = async locale => {
  if (!locale) {
    return;
  }
  return (await localeByName(locale)).click();
};

const changeLanguage = async (languageCode, userTranslation) => {
  await changeLocale(languageCode);
  await browser.waitUntil(async () => await (await labelForUser()).getText() === userTranslation);
  return {
    user: await (await labelForUser()).getText(),
    pass: await (await labelForPassword()).getText(),
    error: await (await errorMessageField()).getHTML(false),
  };
};

const returnToLoginButtonExists = async () => {
  return await (await $('.btn[href="/medic/login"]')).isExisting();
};

const tokenLoginError = (reason) => $(`.error.${reason}`);
const getTokenError = async (reason) => {
  await (await tokenLoginError(reason)).waitForDisplayed();
  return await (await tokenLoginError(reason)).getText();
};

const getToLoginLinkText = async () => {
  const message = await $('[translate="login.token.redirect.login.info"]');
  return await message.getText();
};

const togglePassword = async () => {
  await (await passwordField()).waitForDisplayed();
  await (await passwordToggleButton()).waitForClickable();
  await (await passwordToggleButton()).click();

  return {
    type: await (await passwordField()).getAttribute('type'),
    value: await (await passwordField()).getValue(),
  };
};

const setPasswordValue = async (password) => {
  await (await passwordField()).waitForDisplayed();
  await (await passwordField()).setValue(password);
};

module.exports = {
  login,
  cookieLogin,
  getAllLocales: () => getLanguages(),
  changeLanguage,
  labelForUser,
  loginButton,
  labelForPassword,
  returnToLoginButtonExists,
  getTokenError,
  getToLoginLinkText,
  getCurrentLanguage,
  getErrorMessage,
  togglePassword,
  setPasswordValue,
};
