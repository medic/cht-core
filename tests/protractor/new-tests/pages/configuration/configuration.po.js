var helper = require('../../helper');


var ConfigurationPage = function() {


    //title and texts of notifications/error messages
    this.pageTitle = 'Medic Mobile';
  
var configurationButtons = element.all(by.repeater('page in configurationPages'));

 this.settingsButton=configurationButtons[0];
 this.languagesButton=configurationButtons[1];
 this.formsButton=configurationButtons[2];
 this.importExportButton=configurationButtons[3];
 this.userSettingsButton=configurationButtons[4];
 this.usersButton=configurationButtons[5];
 this.iconsButton=configurationButtons[6];
 this.targetsButton=configurationButtons[7];
 this.permissionsButton=configurationButtons[8];

   
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

module.exports = ConfigurationPage;

