const helper = require('../../helper'),
      utils = require('../../utils'),
      medicLogo = element(by.className('logo-full')),
      messagesLink = element(by.id('messages-tab')),
      analyticsLink = element(by.id('analytics-tab')),
      configurationLink = element(by.css('[ui-sref=configuration]')),
      hamburgerMenu = element(by.className('dropdown options')),
      logoutButton = $('[ng-click=logout]');

module.exports = {
  goToMessages: () => {
    browser.sleep(500);//wait for browser to settle.
    browser.get(utils.getBaseUrl() + 'messages/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('message-list')));
  },

  goToTasks: () => {
    browser.sleep(500);//wait for browser to settle
    browser.get(utils.getBaseUrl() + 'tasks/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('tasks-list')));
  },

  goToPeople: () => {
    browser.sleep(500);//wait for browser to settle
    browser.get(utils.getBaseUrl() + 'contacts/');
    helper.waitUntilReady(medicLogo);
    helper.waitElementToBeVisible(element(by.css('#contacts-list')));
    helper.waitElementToBeVisible(element(by.css('a[href="#/contacts//add/district_hospital"]')));
  },

  goToReports: () => {
    browser.sleep(500);//wait for browser to settle
    browser.get(utils.getBaseUrl() + 'reports/');
    helper.waitElementToBeClickable(element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')));
    helper.waitElementToBeVisible(element(by.id('reports-list')));
  },

  goToAnalytics: () => {
    analyticsLink.click();
    helper.waitUntilReady(medicLogo);
  },

  goToConfiguration: () => {
    helper.waitUntilReady(medicLogo);
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
    helper.waitElementToBeVisible(logoutButton);
    logoutButton.click();
  }
};
