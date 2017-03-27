var helper = require('../../helper');
    //faker = require('faker');




    //title and texts of notifications/error messages
   var pageTitle = 'Medic Mobile';
   var incorrectCredentialsText = 'Incorrect user name or password. Please try again.';
   var passwordBlankText = 'Cannot be blank.';

    //sign in form elements selected by id
   var usernameField = element(by.id('user'));
   var passwordField = element(by.id('password'));
   var loginButton = element(by.id('login'));
   var incorrectCredentialsError=element(by.className('error incorrect'));
   
    //functions to interact with our page
    
   var login = function(username, password) {

        helper.waitUntilReady(this.usernameField);
         usernameField.clear();
        passwordField.clear();

        usernameField.sendKeys(username);
        passwordField.sendKeys(password);
        loginButton.click();
    };


