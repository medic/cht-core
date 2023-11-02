const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const constants = require('@constants');

describe('bfcache', () => {
  beforeEach(async () => {
    await loginPage.login({
      username: constants.USERNAME,
      password: constants.PASSWORD,
      createUser: true,
    });
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.url('/');
  });

  describe('login page', () => {
    it('should redirect to the app page when session is valid', async () => {
      await login();
      await commonPage.goToBase();
      expect(await browser.getUrl()).to.contain('/messages');
      await browser.back();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/messages'));
    });
  });

  describe('webapp', () => {
    it('should redirect to login page when session is expired', async () => {
      await login();
      await commonPage.goToPeople();
      await browser.deleteCookies('AuthSession');
      await commonPage.goToMessages();

      const modal = await modalPage.getModalDetails();
      expect(modal.header).to.equal('Session has expired');
      expect(modal.body).to.equal('Your session has expired and you have been logged out. Please login to continue.');
      await modalPage.submit();

      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='), { timeout: 1000 });
      await browser.back();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='));
    });
  });

  describe('admin app', () => {
    it('should redirect to login page when session is expired', async () => {
      await login();
      await usersAdminPage.goToAdminUser();
      await browser.deleteCookies('AuthSession');
      await usersAdminPage.goToAdminUpgrade();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='), { timeout: 1000 });
      await browser.back();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='));
    });
  });
});
