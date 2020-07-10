const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');
const utils = require('../../utils');
const helper = require('../../helper');

const INVALID = 'Your link is invalid.';
const EXPIRED = 'Your link has expired.';
const MISSING = 'Your link is missing required information';
const TOLOGIN = 'If you know your username and password, click on the following link to load the login page.';
const ERROR = 'Something went wrong when processing your request';

let user;

const getUrl = (token, encrypt) => `${utils.getOrigin()}/medic/login/token/${token}/${encrypt}`;
const setupTokenLoginSettings = () => {
  const settings = { token_login: { app_url: utils.getOrigin(), message: 'token_login_sms', enabled: true } };
  const waitForApiUpdate = utils.waitForLogs('api.e2e.log', /Settings updated/);
  return utils.updateSettings(settings, 'api').then(() => waitForApiUpdate.promise);
};

const createUser = (user) => {
  return utils.request({ path: '/api/v1/users', method: 'POST', body: user });
};

const getTokenUrl = ({ token_login: { id } } = {}) => {
  return utils.getDoc(id).then(doc => {
    return doc.tasks[1].messages[0].message;
  });
};

const expireToken = ({ user: { id } } = {}) => {
  return utils.request(`/_users/${id}`).then(userDoc => {
    const rightNow = new Date().getTime();
    userDoc.token_login.expiration_date = rightNow - 1000; // token expired a second ago
    return utils.request({ path: `/_users/${id}`, method: 'PUT', body: userDoc });
  });
};

describe('token login', () => {
  beforeEach(() => {
    user = {
      username: 'testusername',
      roles: ['national_admin'],
      phone: '+40766565656',
      token_login: true,
      known: true,
    };
    browser.manage().deleteAllCookies();
  });
  afterEach(() => utils.deleteUsers([user]).then(() => utils.revertDb([], [])));

  afterAll(() => {
    commonElements.goToLoginPage();
    loginPage.login(auth.username, auth.password);
    return utils.revertDb();
  });

  it('should redirect the user to the app if already logged in', () => {
    commonElements.goToLoginPage();
    loginPage.login(auth.username, auth.password);
    browser.driver.get(getUrl('this is a', 'random string'));
    helper.waitElementToDisappear(by.css('.loader'));
    browser.waitForAngular();
    helper.waitUntilReady(element(by.id('message-list')));
  });

  it('should display an error when token login is disabled', () => {
    browser.driver.get(getUrl('this is a', 'random string'));
    helper.waitElementToDisappear(by.css('.loader'));
    expect(helper.isTextDisplayed(ERROR)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should display an error with incorrect url', () => {
    browser.wait(() => setupTokenLoginSettings().then(() => true));
    browser.driver.get(`${utils.getOrigin()}/medic/login/token/justtoken`);
    helper.waitElementToDisappear(by.css('.loader'));
    expect(helper.isTextDisplayed(MISSING)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should display an error when accessing with random strings', () => {
    browser.wait(() => setupTokenLoginSettings().then(() => true));
    browser.driver.get(getUrl('this is a', 'random string'));
    helper.waitElementToDisappear(by.css('.loader'));
    expect(helper.isTextDisplayed(INVALID)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should display an error when token is expired', () => {
    browser.wait(() => {
      return setupTokenLoginSettings()
        .then(() => createUser(user))
        .then(response => Promise.all([
          getTokenUrl(response),
          expireToken(response),
        ]))
        .then(([ url ]) => browser.driver.get(url))
        .then(() => true);
    });
    helper.waitElementToDisappear(by.css('.loader'));
    expect(helper.isTextDisplayed(EXPIRED)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should log the user in when token is correct', () => {
    browser.wait(() => {
      return setupTokenLoginSettings()
        .then(() => createUser(user))
        .then(response => getTokenUrl(response))
        .then(url => browser.driver.get(url))
        .then(() => true);
    });
    browser.waitForAngular();
    helper.waitUntilReady(element(by.id('message-list')));
  });
});
