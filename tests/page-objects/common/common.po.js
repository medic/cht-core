const helper = require('../../helper');
const utils = require('../../utils');

const medicLogo = element(by.className('logo-full'));
const genericSubmitButton = element(by.css('.btn.btn-primary'));
const genericCancelBtn = element(by.css('.modal .btn.cancel'));
const messagesTab = element(by.id('messages-tab'));
const analyticsTab = element(by.id('analytics-tab'));
const hamburgerMenu = element(by.css('.dropdown.options>a'));
const hamburgerMenuOptions = element.all(by.css('.dropdown.options>ul>li'));
const logoutButton = $('[ng-click=logout]');
// Configuration wizard
const wizardTitle = element(by.css('.modal-header>h2'));
const defaultCountryCode = element(
  by.css('#select2-default-country-code-setup-container')
);
const skipSetup = element(by.css('.modal-footer>a:first-of-type'));
const finishBtn = element(by.css('.modal-footer>a:nth-of-type(2)'));
// Tour
const tourBtns = element.all(by.css('.btn.tour-option'));
// User settings
const settings = element.all(by.css('.configuration a>span'));
// Report bug
const bugDescriptionField = element(by.css('[placeholder="Bug description"]'));
const modalFooter = element(by.css('.modal-footer'));
const deleteButton = element(by.css('#delete-confirm')).element(by.css('.btn.submit'));

module.exports = {
  calm: () => {
    const bootstrapperSelector = by.css('.bootstrap-layer');
    helper.waitElementToPresent(element(bootstrapperSelector));
    helper.waitElementToDisappear(bootstrapperSelector);
    helper.waitUntilReady(messagesTab);
  },

  checkAbout: () => {
    openSubmenu('about');
    expect(genericSubmitButton.getText()).toEqual('Reload');
  },

  checkConfigurationWizard: () => {
    openSubmenu('configuration wizard');
    expect(wizardTitle.getText()).toEqual('Configuration wizard');
    expect(defaultCountryCode.getText()).toEqual('Canada (+1)');
    expect(finishBtn.getText()).toEqual('Finish');
    skipSetup.click();
  },

  checkGuidedTour: () => {
    openSubmenu('guided');
    expect(tourBtns.count()).toEqual(4);
    genericCancelBtn.click();
  },

  checkReportBug: () => {
    openSubmenu('report bug');
    helper.waitElementToBeVisible(bugDescriptionField);
    helper.waitElementToBeVisible(modalFooter);
    expect(genericSubmitButton.getText()).toEqual('Submit');
    genericCancelBtn.click();
  },

  sync: () => {
    module.exports.openMenu();
    openSubmenu('sync');
    helper.waitElementToPresent(element(by.css('.sync-status .success')));
  },

  checkUserSettings: () => {
    openSubmenu('user settings');
    const optionNames = helper.getTextFromElements(settings);
    expect(optionNames).toEqual(['Update password', 'Edit user profile']);
  },

  goHome: () => {
    helper.waitUntilReady(medicLogo);
    medicLogo.click();
  },

  goToAnalytics: () => {
    analyticsTab.click();
    helper.waitForAngularComplete();
  },

  goToConfiguration: () => {
    helper.waitForAngularComplete();
    browser.get(utils.getAdminBaseUrl());
  },

  goToLoginPage: () => {
    browser.manage().deleteAllCookies();
    browser.driver.get(utils.getLoginUrl());
  },

  goToMessages: () => {
    browser.get(utils.getBaseUrl() + 'messages/');
    helper.waitForAngularComplete();
    helper.waitUntilReady(element(by.id('message-list')));
  },

  goToPeople: async () => {
    await browser.get(utils.getBaseUrl() + 'contacts/');
    await helper.waitUntilReady(element(by.id('contacts-list')));
  },

  goToReports: refresh => {
    browser.get(utils.getBaseUrl() + 'reports/');
    helper.waitElementToPresent(
      element(
        by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
      )
    );
    helper.waitElementToBeClickable(
      element(
        by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
      )
    );
    helper.waitElementToBeVisible(element(by.id('reports-list')));
    if (refresh) {
      browser.refresh();
    } else {
      // A trick to trigger a list refresh.
      // When already on the "reports" page, clicking on the menu item to "go to reports" doesn't, in fact, do anything.
      element(by.css('.reset-filter')).click();
      helper.waitForAngularComplete();
    }
  },

  goToTasks: () => {
    browser.get(utils.getBaseUrl() + 'tasks/');
    helper.waitUntilReady(element(by.id('tasks-list')));
  },

  isAt: list => {
    helper.waitForAngularComplete();
    return element(by.id(list)).isPresent();
  },

  logout: () => {
    hamburgerMenu.click();
    helper.waitElementToBeVisible(logoutButton);
    logoutButton.click();
  },

  openMenu: () => {
    helper.waitUntilReady(messagesTab);
    hamburgerMenu.click();
    helper.waitUntilReady(hamburgerMenuOptions);
  },

  confirmDelete: async () => {
    await helper.waitUntilReady(deleteButton);
    await deleteButton.click();
  },

  openSubmenu: openSubmenu,
};

function openSubmenu(menuName) {
  helper.findElementByTextAndClick(hamburgerMenuOptions, menuName);
  helper.waitForAngularComplete();
}
