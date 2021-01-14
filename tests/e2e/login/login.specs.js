const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');

describe('Login tests : ', () => {
  const wrongUsername = 'fakeuser';
  const wrongPassword = 'fakepass';

  it('should have a title', async () => {
    await commonElements.goToLoginPage();
    expect(await browser.getTitle()).toEqual('Medic Mobile');
  });

  it('should try to sign in with blank password and verify that credentials were incorrect', async () => {
    await commonElements.goToLoginPage();
    await browser.sleep(10000);
    await browser.refresh();
    await loginPage.login(wrongUsername, '', true);
  });

  it('should try to sign in with blank username and password and verify that credentials were incorrect', async () => {
    await commonElements.goToLoginPage();
    await browser.sleep(10000);
    await browser.refresh();
    await loginPage.login('', '', true);
  });

  it('should try to sign in and verify that credentials were incorrect', async () => {
    await commonElements.goToLoginPage();
    await browser.sleep(10000);
    await browser.refresh();
    await loginPage.login(wrongUsername, wrongPassword, true);
    await loginPage.login(auth.username, auth.password);
  });
});
