var helper = require('../../helper'),
    utils = require('../../utils');

var medicLogo = element(by.className('logo-full'));
var messagesLink = element(by.id('messages-tab'));
var tasksLink = element(by.id('tasks-tab'));
var contactsLink = element(by.id('contacts-tab'));
var analyticsLink = element(by.id('analytics-tab'));
var reportsLink = element(by.id('reports-tab'));
var configurationLink = element(by.css('[ui-sref=configuration]'));
var hamburgerMenu = element(by.className('dropdown options'));
var logoutButton=$('[ng-click=logout]');

module.exports = {
  getBaseUrl: function () {
    return utils.getBaseUrl() + '/_design/medic/_rewrite/#/';
  },

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

  goToReports: function () {
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
  },

  isAt: function (list) {
    helper.waitUntilReady(medicLogo);
    return browser.isElementPresent(element(by.id(list)));
  }, 
  logout:function(){
    hamburgerMenu.click();
    helper.waitElementToBeVisisble(logoutButton);
    logoutButton.click();
  }
};



