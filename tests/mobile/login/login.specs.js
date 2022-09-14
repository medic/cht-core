const utils = require('../../utils');
const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');
const constants = require('../../constants');
let branding;

describe('Login tests : ', () => {
  const wrongUsername = 'fakeuser';
  const wrongPassword = 'fakepass';  
  beforeAll(async () => {
    branding = await utils.getDoc('branding');
  });

  it('should have a title', async () => {
    await commonElements.goToLoginPageNative();
    expect(await browser.getTitle()).toEqual(branding.title);
  });

  it('should try to sign in with blank password and verify that credentials were incorrect', async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(wrongUsername, '', true);
  });

  it('should try to sign in with blank username and password and verify that credentials were incorrect', async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative('', '', true);
  });

  it('should try to sign in and verify that credentials were incorrect', async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(wrongUsername, wrongPassword, true);
    await loginPage.loginNative(constants.USERNAME, constants.PASSWORD);
  });
});
