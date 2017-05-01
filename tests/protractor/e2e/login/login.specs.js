var helper = require('../../helper'),
      utils=require('../../utils.js');
var commonElements = require('../../page-objects/common/common.po.js');
var loginPage = require('../../page-objects/login/login.po.js');
var messagesPage= require('../../page-objects/messages/messages.po.js');
describe('Login tests : ', function () {
  //random generates from 'faker' library
  var wrongUsername = 'fakeuser';
  var wrongPassword = 'fakepass';
  //valid
  var validUsername = 'admin';
  var validPassword = 'pass';
  beforeEach(function () {
     browser.driver.get(utils.getLoginUrl());
   // commonElements.logout(); 
  });

  afterEach(function () {
    helper.takeScreenshot('login-test');
    browser.manage().deleteAllCookies();
  });

  it('should have a title', function () {
    expect(browser.getTitle()).toEqual('Medic Mobile');
  });

  /* it('should sign in a valid user', function () {
    loginPage.login(validUsername, validPassword);
    helper.waitElementToDisappear(loginPage.loginButton);
    helper.waitUntilReady(commonElements.messagesLink);
   // helper.waitElementToBeVisisble(messagesPage.getSendMessageButton());
    //expect(messagesPage.getSendMessageButton().isDisplayed()).toBeTruthy();
   // expect(messagesPage.noMessageErrorField.getText()).toBe('No messages found');
  // browser.sleep(3000000);
   //expect(helper.isTextDisplayed('No messages found'));

   expect(element(by.css('.general-actions .send-message')).isDisplayed()).toBeTruthy();
  });*/

  it('should try to sign in and verify that credentials were incorrect', function () {
    //commonElements.logout();
    //helper.waitUntilReady(loginPage.usernameField);
    loginPage.login(wrongUsername, wrongPassword);
    //helper.waitUntilReady(loginPage.incorrectCredentialsError);
   expect(loginPage.incorrectCredentialsError.getText()).toBe(loginPage.incorrectCredentialsText);
// var loader= element(by.className('loader'));
 //helper.waitElementToBeVisisble(loader);
// helper.waitElementToDisappear(loader);
browser.waitForAngular();

 var error= element(by.className('error incorrect'));

helper.waitUntilReady(error);
 expect(error.getText()).toBe(loginPage.incorrectCredentialsText);
 

});
});
