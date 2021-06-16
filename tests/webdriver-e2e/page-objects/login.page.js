const utils = require('../../utils');

const loginButton = () => $('#login');
const userField = () => $('#user');
const passwordField = () => $('#password');
const labelForUser = () => $('label[for="user"]');
const labelForPassword = () => $('label[for="password"]');
const errorMessageField = () => $('p.error.incorrect');


const login = async (username, password) => {
  await (await userField()).setValue(username);
  await (await passwordField()).setValue(password);
  await (await loginButton()).click();
};

const cookieLogin = async (username, password) => {
  const opts = {
    path: '/medic/login',
    body: { user: username, password: password },
    method: 'POST',
    simple: false,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const resp = await utils.request(opts);
  const cookieArray = utils.parseCookieResponse(resp.headers['set-cookie']);

  await browser.setCookies(cookieArray);
  await utils.setupUserDoc(username);
  await browser.url('/');
};

const open = () => {
  return browser.url();
};

const getLanguage = async (selector) => {
  const lang = await Promise.all((await $$(selector)).map(async loc => {
    return {
      code: await loc.getAttribute('name'),
      name: await loc.getText(),
    };
  }));
  return lang;
};

const changeLocale = async locale => {
  if (!locale) {
    return;
  }
  return (await $(`.locale[name="${locale}"]`)).click();
};

const changeLanguage = async (languageCode) => {
  await changeLocale(languageCode);
  return {
    user: await (await labelForUser()).getText(),
    pass: await (await labelForPassword()).getText(),
    error: await (await errorMessageField()).getText()
  };
};


module.exports = {
  open,
  login,
  cookieLogin,
  getAllLocales: async () => await getLanguage('.locale'),
  changeLanguage,
};
