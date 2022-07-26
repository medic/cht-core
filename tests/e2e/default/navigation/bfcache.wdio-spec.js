const commonPage = require('../../../page-objects/common/common.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const usersAdminPage = require('../../../page-objects/admin/user.wdio.page');
const auth = require('../../../auth')();

describe('bfcache', async () => {
  beforeEach(async () => {
    await loginPage.login({
      username: auth.username,
      password: auth.password,
      createUser: true,
    });
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.url('/');
  });

  describe('login page', () => {
    it('should redirect to the app page when session is valid', async () => {
      await commonPage.goToBase();
      expect(await browser.getUrl()).to.contain('/messages');
      await browser.back();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/messages'));
    });
  });

  describe('webapp', () => {
    it('should redirect to login page when session is expired', async () => {
      await commonPage.goToPeople();
      await browser.deleteCookies('AuthSession');
      await commonPage.goToMessages();
      const redirectToLoginBtn = await $('#session-expired .btn.submit.btn-primary');
      await redirectToLoginBtn.click();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='), { timeout: 1000 });
      await browser.back();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='));
    });
  });

  describe('admin app', () => {
    it('should redirect to login page when session is expired', async () => {
      await usersAdminPage.goToAdminUser();
      await browser.deleteCookies('AuthSession');
      await usersAdminPage.goToAdminUpgrade();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='), { timeout: 1000 });
      await browser.back();
      await browser.waitUntil(async () => (await browser.getUrl()).includes('/login?redirect='));
    });
  });
});
