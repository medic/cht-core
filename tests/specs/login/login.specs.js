const helper = require('../../framework/modules/helper'),
      utils = require('../../framework/modules/utils.js'),
      auth = require('../../framework/modules/auth')(),
      loginPage = require('.././login.po.js');

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
