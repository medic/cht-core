var helper = require('../../helper');
  var  LoginPage = require('./login.po.js');
var CommonElements = require('../common/common.po.js');
var MessagesPage = require('../messages/messages.po.js');

describe('Login page : ', function () {

    //random generates from 'faker' library
    var wrongUsername = 'fakeuser';
    var wrongPassword = 'fakepass';

    //valid
    var validUsername = 'admin';
    var validPassword = 'pass';

    var loginPage = new LoginPage();
    var commonElements = new CommonElements();
    var messagesPage = new MessagesPage();


    beforeEach(function () {
        browser.get(browser.params.url);
        
    });

    afterEach(function () {

       
        browser.manage().deleteAllCookies();


    });

    it('should have a title', function () {

        expect(browser.getTitle()).toEqual(loginPage.pageTitle);
    });

    it('should try to sign in and verify that credentials were incorrect', function () {

        helper.waitUntilReady(loginPage.usernameField);
        loginPage.login(wrongUsername, wrongPassword);
        helper.waitUntilReady(loginPage.incorrectCredentialsError);
        expect(loginPage.incorrectCredentialsError.getText()).toBe(loginPage.incorrectCredentialsText);
    });


    it('should sign in a valid user', function () {
        loginPage.login(validUsername, validPassword);

        helper.waitElementToDisappear(loginPage.loginButton);

        helper.waitUntilReady(commonElements.messagesLink);

        expect(messagesPage.noMessageErrorField.isDisplayed()).toBeTruthy();
        expect(messagesPage.noMessageErrorField.getText()).toBe('No messages found');


    });


});
