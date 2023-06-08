const commonElements = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');

const INVALID = 'Your link is invalid.';
const EXPIRED = 'Your link has expired.';
const MISSING = 'Your link is missing required information';
const TOLOGIN = 'If you know your username and password, click on the following link to load the login page.';
const UNKNOWN = 'Something went wrong when processing your request';

let user;

const getUrl = token => `/medic/login/token/${token}`;
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
      roles: ['program_officer'],
      phone: '+40766565656',
      token_login: true,
      known: true,
    };
    await browser.deleteCookies();
  });

  afterEach(async () => {
    await utils.deleteUsers([user]);
    await utils.revertDb([/^form:/], true);
  });

  it('should redirect the user to the app if already logged in', async () => {
    await loginPage.cookieLogin();
    await browser.url(getUrl('this is a random string'));
    await commonElements.waitForLoaderToDisappear();
    expect(await commonElements.isMessagesListPresent()).to.be.true;
  });

  it('should display an error when token login is disabled', async () => {
    await browser.url(getUrl('this is a random string'));
    expect(await loginPage.getTokenError('unknown')).to.contain(UNKNOWN);
    expect(await loginPage.getToLoginLinkText()).to.equal(TOLOGIN);
  });

  it('should display an error with incorrect url', async () => {
    await setupTokenLoginSettings();
    await browser.url(`/medic/login/token`);
    expect(await loginPage.getTokenError('missing')).to.contain(MISSING);
    expect(await loginPage.getToLoginLinkText()).to.equal(TOLOGIN);
  });

  it('should display an error when accessing with random strings', async () => {
    await setupTokenLoginSettings();
    await browser.url(getUrl('this is a random string'));
    expect(await loginPage.getTokenError('invalid')).to.contain(INVALID);
    expect(await loginPage.getToLoginLinkText()).to.equal(TOLOGIN);
  });

  it('should display an error when token is expired', async () => {
    await setupTokenLoginSettings();
    const response = await createUser(user);
    const userDoc = await getUser(response.user.id);
    const url = await getTokenUrl(userDoc);
    await expireToken(userDoc);
    await browser.url(url);
    expect(await loginPage.getTokenError('expired')).to.contain(EXPIRED);
    expect(await loginPage.getToLoginLinkText()).to.equal(TOLOGIN);
  });

  it('should log the user in when token is correct', async () => {
    await setupTokenLoginSettings();
    const response = await createUser(user);
    const userDoc = await getUser(response.user.id);
    const url = await getTokenUrl(userDoc);
    await browser.url(url);
    await commonElements.waitForLoaderToDisappear();
    expect(await commonElements.isMessagesListPresent()).to.be.true;
  });
});
