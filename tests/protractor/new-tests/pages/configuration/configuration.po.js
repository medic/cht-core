var helper = require('../../helper');

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
    

module.exports = {

    goToSettings: function () {

        helper.waitUntilReady(settingsButton);
        settingsButton.click();
    },

    goToLanguages: function () {

        helper.waitUntilReady(languagesButton);
        languagesButton.click();
    },

    goToForms: function () {

        helper.waitUntilReady(formsButton);
        formsButton.click();
    },

    goToImportExport: function () {

        helper.waitUntilReady(importExportButton);
        importExportButton.click();
    },


    goToUserSettings: function () {

        helper.waitUntilReady(userSettingsButton);
        userSettingsButton.click();
    },

    goToUsers: function () {

        helper.waitUntilReady(usersButton);
        usersButton.click();
    },


    openTargets: function () {

        helper.waitUntilReady(targetsButton);
        targetsButton.click();
    },
    goToIcons: function () {

        helper.waitUntilReady(iconsButton);
        iconsButton.click();
    },
     goToPermissions: function () {

        helper.waitUntilReady(permissionsButton);
        permissionsButton.click();
    }

};