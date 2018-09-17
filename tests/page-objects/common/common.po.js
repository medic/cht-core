const helper = require('../../helper'),
      utils = require('../../utils');

const medicLogo = element(by.className('logo-full')),
      messagesLink = element(by.id('messages-tab')),
      analyticsLink = element(by.id('analytics-tab')),
      hamburgerMenu = element(by.className('dropdown options')),
      logoutButton = $('[ng-click=logout]');

module.exports = {
  goHome: () => {
    helper.waitUntilReady(medicLogo);
    medicLogo.click();
  },

  goToAnalytics: () => {
    analyticsLink.click();
    helper.waitUntilReady(medicLogo);
  },

  goToConfiguration: () => {
    helper.waitUntilReady(medicLogo);
    browser.get(utils.getAdminBaseUrl());
  },

  goToLoginPage: () => {
    browser.manage().deleteAllCookies();
    browser.driver.get(utils.getLoginUrl());
  },

  goToMessages: () => {
    browser.get(utils.getBaseUrl() + 'messages/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('message-list')));
  },

  goToPeople: () => {
    browser.get(utils.getBaseUrl() + 'contacts/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('contacts-list')));
  },

  goToReports: (refresh) => {
    browser.get(utils.getBaseUrl() + 'reports/');
    browser.wait(() => {
      return element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')).isPresent();
    }, 10000);
    helper.waitElementToBeClickable(element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')));
    helper.waitElementToBeVisible(element(by.id('reports-list')));
    if (refresh) {
      browser.refresh();
    }
  },

  goToTasks: () => {
    browser.get(utils.getBaseUrl() + 'tasks/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('tasks-list')));
  },

  isAt: list => {
    helper.waitUntilReady(medicLogo);
    return element(by.id(list)).isPresent();
  },

  logout: () => {
    hamburgerMenu.click();
    helper.waitElementToBeVisible(logoutButton);
    logoutButton.click();
  },

  openMenu: () => {
    helper.waitUntilReady(messagesLink);
    hamburgerMenu.click();
  }
};
