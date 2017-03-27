var helper = require('../../helper');





    //title and texts of notifications/error messages
   var pageTitle = 'Medic Mobile';
  
var configurationButtons = element.all(by.repeater('page in configurationPages'));

var settingsButton=configurationButtons[0];
var languagesButton=configurationButtons[1];
var formsButton=configurationButtons[2];
var importExportButton=configurationButtons[3];
var userSettingsButton=configurationButtons[4];
var usersButton=configurationButtons[5];
var iconsButton=configurationButtons[6];
var targetsButton=configurationButtons[7];
var permissionsButton=configurationButtons[8];

   
    //functions to interact with our page
    
      
   var goToSettings = function() {

        settingsButton.click();
    };

