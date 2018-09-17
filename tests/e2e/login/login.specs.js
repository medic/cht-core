const helper = require('../../helper'),
      utils = require('../../utils.js'),
      auth = require('../../auth')(),
      commonElements = require('../../page-objects/common/common.po.js'),
      loginPage = require('../../page-objects/login/login.po.js');

describe('Login tests : ', () => {
  const wrongUsername = 'fakeuser',
    wrongPassword = 'fakepass';

  it('should have a title', () => {
    expect(browser.getTitle()).toEqual('Medic Mobile');
  });

  it('should try to sign in and verify that credentials were incorrect', () => {
    commonElements.goToLoginPage();
    loginPage.login(wrongUsername, wrongPassword, true);
    loginPage.login(auth.user, auth.pass);
  });
});
