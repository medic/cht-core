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

const getUrl = token => `${utils.getOrigin()}/medic/login/token/${token}`;
const setupTokenLoginSettings = () => {
  // we're configuring app_url here because we're serving api on a port, and in express4 req.hostname strips the port
  // https://expressjs.com/en/guide/migrating-5.html#req.host
  const settings = { token_login: {message: 'token_login_sms', enabled: true }, app_url: utils.getOrigin() };
  const waitForApiUpdate = utils.waitForLogs('api.e2e.log', /Settings updated/);
  return utils.updateSettings(settings, 'api').then(() => waitForApiUpdate.promise);
};

const createUser = (user) => {
  return utils.request({ path: '/api/v1/users', method: 'POST', body: user });
};

const getUser = id => utils.request({ path: `/_users/${id}`});

const getTokenUrl = ({ token_login: { token } } = {}) => {
  const id = `token:login:${token}`;
  return utils.getDoc(id).then(doc => {
    return doc.tasks[1].messages[0].message;
  });
};

const expireToken = (user) => {
  return utils.request(`/_users/${user._id}`).then(userDoc => {
    const rightNow = new Date().getTime();
    userDoc.token_login.expiration_date = rightNow - 1000; // token expired a second ago
    return utils.request({ path: `/_users/${user._id}`, method: 'PUT', body: userDoc });
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

  const waitForLoaderToDisappear = () => {
    try {
      helper.waitElementToDisappear(by.css('.loader'));
    } catch(err) {
      // element can go stale
    }
  };

  it('should redirect the user to the app if already logged in', () => {
    commonElements.goToLoginPage();
    loginPage.login(auth.username, auth.password);
    browser.driver.get(getUrl('this is a random string'));
    browser.waitForAngular();
    waitForLoaderToDisappear();
    browser.waitForAngular();
    helper.waitUntilReady(element(by.id('message-list')));
  });

  it('should display an error when token login is disabled', () => {
    browser.driver.get(getUrl('this is a random string'));
    waitForLoaderToDisappear();
    expect(helper.isTextDisplayed(ERROR)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should display an error with incorrect url', () => {
    browser.wait(() => setupTokenLoginSettings().then(() => true));
    browser.driver.get(`${utils.getOrigin()}/medic/login/token`);
    waitForLoaderToDisappear();
    expect(helper.isTextDisplayed(MISSING)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should display an error when accessing with random strings', () => {
    browser.wait(() => setupTokenLoginSettings().then(() => true));
    browser.driver.get(getUrl('this is a random string'));
    waitForLoaderToDisappear();
    expect(helper.isTextDisplayed(INVALID)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should display an error when token is expired', () => {
    browser.wait(() => {
      return setupTokenLoginSettings()
        .then(() => createUser(user))
        .then(response => getUser(response.user.id))
        .then(user => Promise.all([
          getTokenUrl(user),
          expireToken(user),
        ]))
        .then(([ url ]) => browser.driver.get(url))
        .then(() => true);
    });
    waitForLoaderToDisappear();
    expect(helper.isTextDisplayed(EXPIRED)).toBe(true);
    expect(helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(element(by.css('.btn[href="/medic/login"]')).isDisplayed()).toBe(true);
  });

  it('should log the user in when token is correct', () => {
    browser.wait(() => {
      return setupTokenLoginSettings()
        .then(() => createUser(user))
        .then(response => getUser(response.user.id))
        .then(user => getTokenUrl(user))
        .then(url => browser.driver.get(url))
        .then(() => true);
    });
    browser.waitForAngular();
    helper.waitUntilReady(element(by.id('message-list')));
  });
});
