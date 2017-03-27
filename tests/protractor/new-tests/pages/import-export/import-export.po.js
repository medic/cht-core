//var helper = require('../../helper');

var ImportExportPage = function () {

   var exportButton = element(by.css('[ng-click="export()"]'));
   var messagesTab = element(by.css('[ui-sref="configuration.export.messages"]'));
   var reportsTab = element(by.css('[ui-sref="configuration.export.reports"]'));
   var contactsTab = element(by.css('[ui-sref="configuration.export.contacts"]'));
   var feedbackTab = element(by.css('[ui-sref="configuration.export.feedback"]'));
   var serverLogsTab = element(by.css('[ui-sref="configuration.export.serverlogs"]'));
   var auditLogsTab = element(by.css('[ui-sref="configuration.export.auditlogs"]'));


    //functions to interact with our page

   var exportData = function () {
        //todo: click exportButton

    };



};

module.exports = ImportExportPage;