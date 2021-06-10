const loginPage = require('../page-objects/login.page');
const commonPage = require('../page-objects/common.page');

describe('Login and logout tests', () => {
  beforeEach(async () => {
    await loginPage.cookieLogin('medic','Secret_1');
  });

  it('should show a warning before log out', async () => {
    const warning = await commonPage.logout();
    expect(warning).toBe('Are you sure you want to log out?'); 
  });
});


