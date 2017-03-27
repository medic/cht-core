var helper = require('../../helper');

   var pageTitle = 'Medic Mobile';
    //this.incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
   //var passwordBlankText = "Can't be blank.";

    //form elements
   var usernameField = element(by.id('name'));
   var fullNameField = element(by.id('fullname'));
   var emailField = element(by.id('emmail'));
   var phoneField = element(by.id('phone'));
   var languageField = element(by.id('language'));
   var userTypeField = element(by.id('type'));
   var placeField = element(by.id('facility'));
   var contactField = element(by.id('contact'));
   var passwordField = element(by.id('password'));
   var confirmPasswordField = element(by.id('confirm-password'));
   var submitButton = element(by.className('btn submit btn-primary'));
      var cancelButton = element(by.className('btn cancel'));
    
    //functions to interact with our page
    
   var submit = function() {

        helper.waitUntilReady(this.submitButton);
       
        submitButton.click();

    };

    var cancel = function() {

        helper.waitUntilReady(this.cancelButton);
       
        cancelButton.click();

    };

