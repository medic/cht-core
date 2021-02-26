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
  const settings = {
    token_login: {
      message: 'token_login_sms',
      enabled: true
    },
    app_url: utils.getOrigin()
  };
  return utils.updateSettings(settings, true);
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

describe('Token login', () => {
  beforeEach(async () => {
    user = {
      username: 'testusername',
      roles: ['national_admin'],
      phone: '+40766565656',
      token_login: true,
      known: true,
    };
    await browser.manage().deleteAllCookies();
  });

  afterEach(async () => {
    await utils.deleteUsers([user]);
    await utils.revertDb([], true);
  });

  afterAll(async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await commonElements.calmNative();
    await utils.revertDb();
  });

  const waitForLoaderToDisappear = async () => {
    try {
      await helper.waitElementToDisappear(by.css('.loader'));
    } catch(err) {
      // element can go stale
    }
  };

  it('should redirect the user to the app if already logged in', async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(auth.username, auth.password);
    await commonElements.calmNative();
    await browser.driver.get(getUrl('this is a random string'));
    await waitForLoaderToDisappear();
    await browser.waitForAngular();
    await helper.waitUntilReadyNative(element(by.id('message-list')));
  });

  it('should display an error when token login is disabled', async () => {
    await browser.driver.get(getUrl('this is a random string'));
    await waitForLoaderToDisappear();
    expect(await helper.isTextDisplayed(ERROR)).toBe(true);
    expect(await helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(await loginPage.returnToLogin().isDisplayed()).toBe(true);
  });

  it('should display an error with incorrect url', async () => {
    await setupTokenLoginSettings();
    await browser.driver.get(`${utils.getOrigin()}/medic/login/token`);
    await waitForLoaderToDisappear();
    await helper.waitUntilReadyNative(loginPage.returnToLogin());
    expect(await helper.isTextDisplayed(MISSING)).toBe(true);
    expect(await helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(await loginPage.returnToLogin().isDisplayed()).toBe(true);
  });

  it('should display an error when accessing with random strings', async () => {
    await setupTokenLoginSettings();
    await browser.driver.get(getUrl('this is a random string'));
    await waitForLoaderToDisappear();
    await helper.waitUntilReadyNative(loginPage.returnToLogin());
    expect(await helper.isTextDisplayed(INVALID)).toBe(true);
    expect(await helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(await loginPage.returnToLogin().isDisplayed()).toBe(true);
  });

  it('should display an error when token is expired', async () => {
    await setupTokenLoginSettings();
    const response = await createUser(user);
    const userDoc = await getUser(response.user.id);
    const url = await getTokenUrl(userDoc);
    await expireToken(userDoc);
    await browser.driver.get(url);
    await waitForLoaderToDisappear();
    await helper.waitUntilReadyNative(loginPage.returnToLogin());
    expect(await helper.isTextDisplayed(EXPIRED)).toBe(true);
    expect(await helper.isTextDisplayed(TOLOGIN)).toBe(true);
    expect(await loginPage.returnToLogin().isDisplayed()).toBe(true);
  });

  it('should log the user in when token is correct', async () => {
    await setupTokenLoginSettings();
    const response = await createUser(user);
    const userDoc = await getUser(response.user.id);
    const url = await getTokenUrl(userDoc);
    await browser.driver.get(url);
    await browser.waitForAngular();
    await helper.waitUntilReadyNative(commonElements.messagesList);
    expect(await commonElements.messagesList.isDisplayed()).toBe(true);
  });
});
