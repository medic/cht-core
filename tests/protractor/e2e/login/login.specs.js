const helper = require('../../helper'),
  utils = require('../../utils.js'),
  loginPage = require('../../page-objects/login/login.po.js');

describe('Login tests : ', function() {
  const wrongUsername = 'fakeuser';
  const wrongPassword = 'fakepass';
  beforeEach(function() {
    browser.driver.get(utils.getLoginUrl());
  });

  afterEach(function() {
    browser.manage().deleteAllCookies();
  });

  it('should have a title', function() {
    expect(browser.getTitle()).toEqual('Medic Mobile');
  });

  it('should try to sign in and verify that credentials were incorrect', function() {
     browser.manage().deleteAllCookies();
    browser.driver.get(utils.getLoginUrl());
    loginPage.login(wrongUsername, wrongPassword);
   expect(helper.isTextDisplayed(loginPage.getIncorrectCredentialsText()));
  });
});
