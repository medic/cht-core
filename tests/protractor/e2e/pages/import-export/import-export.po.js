//var helper = require('../../helper');

var ImportExportPage = function () {

    this.exportButton = element(by.css('[ng-click="export()"]'));
    this.messagesTab = element(by.css('[ui-sref="configuration.export.messages"]'));
    this.reportsTab = element(by.css('[ui-sref="configuration.export.reports"]'));
    this.contactsTab = element(by.css('[ui-sref="configuration.export.contacts"]'));
    this.feedbackTab = element(by.css('[ui-sref="configuration.export.feedback"]'));
    this.serverLogsTab = element(by.css('[ui-sref="configuration.export.serverlogs"]'));
    this.auditLogsTab = element(by.css('[ui-sref="configuration.export.auditlogs"]'));


    //functions to interact with our page

    this.export = function () {
        //todo: click exportButton

    };



};

module.exports = ImportExportPage;