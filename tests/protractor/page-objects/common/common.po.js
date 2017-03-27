
var helper = require('../../helper');

var medicLogo = element(by.className('logo-full'));
var messagesLink = element(by.id('messages-tab'));
var tasksLink = element(by.id('tasks-tab'));
var contactsLink = element(by.id('contacts-tab'));
var analyticsLink = element(by.id('analytics-tab'));
var reportsLink = element(by.id('reports-tab'));
var configurationLink = element(by.id('configuration-tab'));
var hamburgerMenu = element(by.className('dropdown options'));

//vavigation functions


module.exports = {

    goToMessages: function () {

        helper.waitUntilReady(messagesLink);
        messagesLink.click();
    },

    goToTasks: function () {

        helper.waitUntilReady(tasksLink);
        tasksLink.click();
    },

    goToPeople: function () {

        helper.waitUntilReady(contactsLink);
        contactsLink.click();
    },

    goToTargets: function () {

        helper.waitUntilReady(reportsLink);
        reportsLink.click();
    },


    goToAnalytics: function () {

        helper.waitUntilReady(analyticsLink);
        analyticsLink.click();
    },

    goToConfiguration: function () {

        helper.waitUntilReady(configurationLink);
        configurationLink.click();
    },


    openMenu: function () {

        helper.waitUntilReady(messagesLink);
        hamburgerMenu.click();
    },
    goHome: function () {

        helper.waitUntilReady(medicLogo);
        medicLogo.click();
    }

};



