const constants = require('@constants');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const loginButton = () => $('#login');
const updatePasswordButton = () => $('#update-password');
const userField = () => $('#user');
const passwordField = () => $('#form[action="/medic/login"] #password');
const resetPasswordField = () => $('#form[action="/medic/password-reset"] #password');
const confirmPasswordField = () => $('#confirm-password');
const passwordToggleButton = () => $('#password-toggle');
const labelForUser = () => $('label[for="user"]');
const labelForPassword = () => $('label[for="password"]');
const errorMessageField = () => $('p.error.incorrect');
const localeByName = (locale) => $(`.locale[name="${locale}"]`);
const tokenLoginError = (reason) => $(`.error.${reason}`);
const passwordResetTitle = () => $('p.title');
const passwordResetHint = () => $('p.help-text');
const passwordResetMessageField = (errorMsg) => $(`p.error.${errorMsg}`);

const getErrorMessage = async () => {
  await (await errorMessageField()).waitForDisplayed();
  return await (await errorMessageField()).getText();
};

const getPasswordResetErrorMessage = async (errorMsg) => {
  await (await passwordResetMessageField(errorMsg)).waitForDisplayed();
  return await (await passwordResetMessageField(errorMsg)).getText();
};

const login = async ({
  username,
  password,
  createUser = false,
  locale, loadPage = true,
  privacyPolicy,
  adminApp,
  resetPassword = true
}) => {
  if (utils.isMinimumChromeVersion) {
    await browser.url('/');
  }
  await setPasswordValue(password);
  await setUsernameValue(username);
  await changeLocale(locale);
  await (await loginButton()).click();

  if (createUser) {
    await browser.waitUntil(async () => {
      const cookies = await browser.getCookies('userCtx');
      return cookies.some(cookie => cookie.name === 'userCtx');
    });
    await utils.setupUserDoc(username);
  }

  if (resetPassword) {
    await passwordReset(password, password);
  }

  if (!loadPage) {
    return;
  }

  const waitForPartialLoad = privacyPolicy || adminApp;
  if (waitForPartialLoad) {
    await commonPage.waitForLoaders();
    return;
  }

  await commonPage.waitForPageLoaded();
  await commonPage.hideSnackbar();
};

const loginRequest = async (username, password, locale) => {
  const opts = {
    path: '/medic/login',
    body: { user: username, password: password, locale },
    method: 'POST',
    simple: false,
  };
  return await utils.request(opts);
};

const passwordResetRequest = async (username, password) => {
  const opts = {
    path: '/medic/password-reset',
    body: {
      user: username,
      password: password,
      confirmPassword: password
    },
    method: 'POST',
    simple: false,
  };
  return await utils.request(opts);
};

const setCookiesFromResponse = async (response) => {
  const cookieArray = utils.parseCookieResponse(response.headers['set-cookie']);
  await browser.url('/');
  await browser.setCookies(cookieArray);
};

const cookieLogin = async (options = {}) => {
  const {
    username = constants.USERNAME,
    password = constants.PASSWORD,
    createUser = true,
    locale = 'en',
    resetPassword = false,
  } = options;

  const loginResp = await loginRequest(username, password, locale);
  await setCookiesFromResponse(loginResp);

  if (createUser) {
    await utils.setupUserDoc(username);
  }

  if (resetPassword) {
    const resetResp = await passwordResetRequest(username, password);
    await setCookiesFromResponse(resetResp);
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

const setConfirmPasswordValue = async (confirmPassword) => {
  await (await confirmPasswordField()).waitForDisplayed();
  await (await confirmPasswordField()).setValue(confirmPassword);
};

const setUsernameValue = async (username) => {
  await (await userField()).waitForDisplayed();
  await (await userField()).setValue(username);
};

const passwordReset = async (password, confirmPassword) => {
  await (await resetPasswordField()).waitForDisplayed();
  await (await resetPasswordField()).setValue(password);
  await setConfirmPasswordValue(confirmPassword);
  await (await updatePasswordButton()).click();
};

const getPasswordResetTranslations = async () => {
  return {
    passwordResetTitle: await (await passwordResetTitle()).getText(),
    passwordResetHint: await (await passwordResetHint()).getText(),
  };
};

module.exports = {
  login,
  cookieLogin,
  getAllLocales: () => getLanguages(),
  changeLanguage,
  labelForUser,
  loginButton,
  labelForPassword,
  getTokenError,
  getToLoginLinkText,
  getCurrentLanguage,
  getErrorMessage,
  togglePassword,
  setPasswordValue,
  setUsernameValue,
  setConfirmPasswordValue,
  passwordReset,
  updatePasswordButton,
  getPasswordResetTranslations,
  getPasswordResetErrorMessage,
};
