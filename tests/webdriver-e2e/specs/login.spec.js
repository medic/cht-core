const loginPage = require('../page-objects/login.page');
const commonPage = require('../page-objects/common.page');
const auth = require('../../auth')();


describe('Login and logout tests', () => {
  beforeEach(async () => {
    await loginPage.cookieLogin(auth.username, auth.password);
  });

  it('should show a warning before log out', async () => {
    const warning = await commonPage.getLogoutMessage();
    expect(warning).toBe('Are you sure you want to log out?');
  });
});
