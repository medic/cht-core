var helper = require('../../helper'),
  utils = require('../../utils.js');
  var loginPage = require('../../page-objects/login/login.po.js');

describe('Login tests : ', function () {
  var wrongUsername = 'fakeuser';
  var wrongPassword = 'fakepass';
  beforeEach(function () {
    browser.driver.get(utils.getLoginUrl());
  });

  afterEach(function () {
    browser.manage().deleteAllCookies();
  });

  it('should have a title', function () {
    expect(browser.getTitle()).toEqual('Medic Mobile');
  });

  it('should try to sign in and verify that credentials were incorrect', function () {
    loginPage.login(wrongUsername, wrongPassword);
    expect(helper.isTextDisplayed(loginPage.getIncorrectCredentialsText));
  });
});
