const auth = require('../../auth')();
const commonElements = require('../../page-objects/common/common.po.js');
const loginPage = require('../../page-objects/login/login.po.js');

describe('Login tests : ', () => {
  const wrongUsername = 'fakeuser';
  const wrongPassword = 'fakepass';

  it('should have a title', () => {
    commonElements.goToLoginPage();
    expect(browser.getTitle()).toEqual('Medic Mobile');
  });

  xit('should try to sign in with blank password and verify that credentials were incorrect', () => {
    commonElements.goToLoginPage();
    loginPage.login(wrongUsername, '', true);
  });

  xit('should try to sign in with blank username and password and verify that credentials were incorrect', () => {
    commonElements.goToLoginPage();
    loginPage.login('', '', true);
  });

  xit('should try to sign in and verify that credentials were incorrect', () => {
    commonElements.goToLoginPage();
    loginPage.login(wrongUsername, wrongPassword, true);
    loginPage.login(auth.username, auth.password);
  });
});
