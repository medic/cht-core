var helper = require('../../helper'),
    //faker = require('faker');

var LoginPage = function() {


    //title and texts of notifications/error messages
    this.pageTitle = 'Medic Mobile';
    this.incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
    this.passwordBlankText = 'Cannot be blank.';

    //sign in form elements selected by id
    this.usernameField = element(by.id('user'));
    this.passwordField = element(by.id('password'));
    this.loginButton = element(by.id('login'));
    this.incorrectCredentialsError=element(by.className('error incorrect'));
   
    //functions to interact with our page
    
    this.login = function(username, password) {

        helper.waitUntilReady(this.usernameField);
         this.usernameField.clear();
        this.passwordField.clear();

        this.usernameField.sendKeys(username);
        this.passwordField.sendKeys(password);
        this.loginButton.click();
    };

};

module.exports = LoginPage;
