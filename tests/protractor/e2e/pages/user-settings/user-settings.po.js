var helper = require('../../helper');

var UserSettingsPage = function() {

    this.updatePasswordButton =element(by.css('[ng-click="updatePassword()"]'));
    this.editUserProfileButton =element(by.css('[ng-click="editSettings()"]'));
//updatePassword modal
this.updatePasswordModal={
    passwordField:element(by.id('password')),
    confirmPasswordField: element(by.id('password-confirm'))

};


//editUserProfile modal
this.editUserProfileModal={

  usernameField :element(by.id('name')),
   fullNameField: element(by.id('fullname')),
   emailField: element(by.id('emmail')),
 phoneField: element(by.id('phone')),
 languageField :element(by.id('language')),
    
   submitButton: element(by.className('btn submit btn-primary')),
       cancelButton: element(by.className('btn cancel')),
    
    
    submit :function() {

        helper.waitUntilReady(this.submitButton);
        submitButton.click();

    },

     cancel : function() {

        helper.waitUntilReady(this.cancelButton);
       
        cancelButton.click();

    }

};


    
    
    //functions to interact with our page
    
    this.updatePassword = function(password) {
//todo: fill updatePasswordModal and submit
password.trim();

    };

     this.editUserProfile = function() {

        //todo: fill editUserProfileModal and submit

    };

};

module.exports = UserSettingsPage;