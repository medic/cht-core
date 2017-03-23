var helper = require('../../helper');

var AddUserPage = function() {


    this.pageTitle = 'Medic Mobile';
    //this.incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
   // this.passwordBlankText = "Can't be blank.";

    //form elements
    this.usernameField = element(by.id('name'));
    this.fullNameField = element(by.id('fullname'));
    this.emailField = element(by.id('emmail'));
    this.phoneField = element(by.id('phone'));
    this.languageField = element(by.id('language'));
    this.userTypeField = element(by.id('type'));
    this.placeField = element(by.id('facility'));
    this.contactField = element(by.id('contact'));
    this.passwordField = element(by.id('password'));
    this.confirmPasswordField = element(by.id('confirm-password'));
    this.submitButton = element(by.className('btn submit btn-primary'));
       this.cancelButton = element(by.className('btn cancel'));
    
    //functions to interact with our page
    
    this.submit = function() {

        helper.waitUntilReady(this.submitButton);
       
        this.submitButton.click();

    };

     this.cancel = function() {

        helper.waitUntilReady(this.cancelButton);
       
        this.cancelButton.click();

    };

};

module.exports = AddUserPage;