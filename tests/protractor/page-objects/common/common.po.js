const helper = require('../../helper'),
      utils = require('../../utils');

const medicLogo = element(by.className('logo-full'));//no change ...just testing fragile tests 13
const messagesLink = element(by.id('messages-tab'));
const tasksLink = element(by.id('tasks-tab'));
const contactsLink = element(by.id('contacts-tab'));
const analyticsLink = element(by.id('analytics-tab'));
const configurationLink = element(by.css('[ui-sref=configuration]'));
const hamburgerMenu = element(by.className('dropdown options'));
const logoutButton = $('[ng-click=logout]');

module.exports = {
  getBaseUrl: () => {
    return utils.getBaseUrl() + '/_design/medic/_rewrite/#/';
  },

  goToMessages: () => {
    helper.waitUntilReady(messagesLink);
    messagesLink.click();
  },

  goToTasks: () => {
    helper.waitUntilReady(tasksLink);
    tasksLink.click();
  },

  goToPeople: () => {
    helper.waitUntilReady(contactsLink);
    contactsLink.click();
  },

  goToReports: () => {
    const reportsLink = by.id('reports-tab');    
    helper.waitUntilReady(element(reportsLink));
    element(reportsLink).click();
    helper.waitElementToBeVisisble(element(by.css('#reports-list')));
  },

  goToAnalytics: () => {
    helper.waitUntilReady(analyticsLink);
    analyticsLink.click();
  },

  goToConfiguration: () => {
    helper.waitUntilReady(configurationLink);
    configurationLink.click();
  },

  openMenu: () => {
    helper.waitUntilReady(messagesLink);
    hamburgerMenu.click();
  },

  goHome: () => {
    helper.waitUntilReady(medicLogo);
    medicLogo.click();
  },

  isAt: list => {
    helper.waitUntilReady(medicLogo);
    return element(by.id(list)).isPresent();
  },

  logout: () => {
    hamburgerMenu.click();
    helper.waitElementToBeVisisble(logoutButton);
    logoutButton.click();
  }
};



