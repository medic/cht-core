const helper = require('../../helper'),
      utils = require('../../utils'),
      medicLogo = element(by.className('logo-full')),
      messagesLink = element(by.id('messages-tab')),
      tasksLink = element(by.id('tasks-tab')),
      contactsLink = element(by.id('contacts-tab')),
      analyticsLink = element(by.id('analytics-tab')),
      configurationLink = element(by.css('[ui-sref=configuration]')),
      hamburgerMenu = element(by.className('dropdown options')),
      logoutButton = $('[ng-click=logout]');

module.exports = {
  getBaseUrl: () => {
    return utils.getBaseUrl() + '/_design/medic/_rewrite/#/';
  },

  goToMessages: () => {
    helper.waitUntilReady(messagesLink);
    messagesLink.click();
    helper.waitElementToBeVisisble(element(by.css('#message-list')));
  },

  goToTasks: () => {
    helper.waitUntilReady(tasksLink);
    tasksLink.click();
    helper.waitElementToBeVisisble(element(by.css('#tasks-list')));
  },

  goToPeople: () => {
    helper.waitUntilReady(contactsLink);
    contactsLink.click();
    helper.waitElementToBeVisisble(element(by.css('#contacts-list')));
  },

  goToReports: () => {
    const reportsLink = by.id('reports-tab');
    helper.waitUntilReady(element(reportsLink));
    element(reportsLink).click();
    helper.waitUntilReady(element(by.css('#reports-list')));
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
