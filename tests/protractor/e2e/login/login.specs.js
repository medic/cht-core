const helper = require('../../helper'),
  utils = require('../../utils.js'),
  auth = require('../../auth')(),
  loginPage = require('../../page-objects/login/login.po.js');

describe('Login tests : ', () => {
  const wrongUsername = 'fakeuser',
    wrongPassword = 'fakepass';

  it('should have a title', () => {
    expect(browser.getTitle()).toEqual('Medic Mobile');
  });

  it('should try to sign in and verify that credentials were incorrect', () => {
    browser.manage().deleteAllCookies();
    browser.driver.get(utils.getLoginUrl());
    loginPage.login(wrongUsername, wrongPassword);
    expect(helper.isTextDisplayed(loginPage.getIncorrectCredentialsText()));
    loginPage.login(auth.user, auth.pass);
  });
});
