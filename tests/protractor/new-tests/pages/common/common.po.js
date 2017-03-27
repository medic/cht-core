
var helper = require('../../helper');

   var medicLogo = element(by.className('logo-full'));
   var messagesLink=element(by.id('messages-tab'));
   var tasksLink=element(by.id('tasks-tab'));
   var contactsLink=element(by.id('contacts-tab'));
   var analyticsLink=element(by.id('analytics-tab'));
   var reportsLink=element(by.id('reports-tab'));
   var configurationLink=element(by.id('configuration-tab'));
   var hamburgerMenu=element(by.className('dropdown options'));

    //vavigation functions

      var goToMessages = function() {

        helper.waitUntilReady(this.messagesLink);
        messagesLink.click();
    };

       var goToTasks = function() {

        helper.waitUntilReady(this.tasksLink);
        tasksLink.click();
    };

       var goToPeople = function() {

        helper.waitUntilReady(this.peoplesLink);
        peoplesLink.click();
    };

       var goToTargets = function() {

        helper.waitUntilReady(this.targetsLink);
        targetsLink.click();
    };


  var goToHistory = function() {

        helper.waitUntilReady(this.historyLink);
        historyLink.click();
    };

  var goToConfiguration = function() {

        helper.waitUntilReady(this.configurationLink);
        configurationLink.click();
    };


     var openMenu = function() {

        helper.waitUntilReady(this.messagesLink);
        hamburgerMenu.click();
    };



//module.exports = CommonElements;

