const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');
const utils = require('../../utils');


describe('Login and logout tests', () => {
  beforeEach(async () => await utils.beforeEach());

  afterEach(async () => await utils.afterEach());
  it('should show a warning before log out', async () => {
    const warning = await commonElements.logout();
    expect(warning).toBe('Are you sure you want to log out?');        
  });
});
