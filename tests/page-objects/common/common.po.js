const helper = require('../../helper');
const utils = require('../../utils');
const { browser, element } = require('protractor');

const medicLogo = element(by.className('logo-full'));
const genericSubmitButton = element(by.css('.btn.btn-primary'));
const genericCancelBtn = element(by.css('.modal .btn.cancel'));
const messagesLink = element(by.id('messages-tab'));
const analyticsLink = element(by.id('analytics-tab'));
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
const bugDescriptionField = element(by.css('.form-control'));
const modalFooter = element(by.css('.modal-footer'));
const deleteButton = element(by.css('#delete-confirm')).element(by.css('.btn.submit'));
const displayTime = element(by.css('[ui-sref="display.date-time"]'));

module.exports = {
  calm: async () => {
    // const bootstrapperSelector = by.css('.bootstrap-layer');
    // Disabling the bootStrapperSelector waits for now. This has not been migrated yet
    // await helper.waitElementToPresent(element(bootstrapperSelector));
    // await helper.waitElementToDisappear(bootstrapperSelector);
    await helper.waitUntilReady(medicLogo);
  },

  calmNative: async () => {
    // const bootstrapperSelector = by.css('.bootstrap-layer');
    // Disabling the bootStrapperSelector waits for now. This has not been migrated yet
    // await helper.waitElementToPresent(element(bootstrapperSelector));
    // await helper.waitElementToDisappear(bootstrapperSelector);
    await helper.waitUntilReadyNative(medicLogo);
  },

  checkAbout: () => {
    openSubmenu('about');
    expect(genericSubmitButton.getText()).toEqual('Reload');
  },

  checkConfigurationWizard: async () => {
    openSubmenu('configuration wizard');
    await helper.waitUntilReady(skipSetup);
    await expect(helper.getTextFromElement(wizardTitle)).toEqual('Configuration wizard');
    await expect(helper.getTextFromElement(defaultCountryCode)).toEqual('Canada (+1)');
    await expect(finishBtn.getText()).toEqual('Finish');
    await skipSetup.click();
  },

  checkGuidedTour: () => {
    openSubmenu('guided');
    expect(tourBtns.count()).toEqual(4);
    helper.clickElement(genericCancelBtn);
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

  goToLoginPageNative: async () => {
    await browser.manage().deleteAllCookies();
    await browser.driver.get(await utils.getLoginUrl());
    await browser.driver.get(await utils.getLoginUrl());
  },

  goToMessages: () => {
    browser.get(utils.getBaseUrl() + 'messages/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('message-list')));
  },

  goToPeople: async () => {
    await browser.get(utils.getBaseUrl() + 'contacts/');
    await helper.waitUntilReady(medicLogo);
    await helper.waitUntilReady(element(by.id('contacts-list')));
  },

  goToReports: refresh => {
    utils.deprecated('goToReports', 'goToReportsNative');
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
      browser.waitForAngular();
    }
  },

  goToReportsNative: async refresh => {
    await browser.get(utils.getBaseUrl() + 'reports/');
    await helper.waitElementToPresent(
      element(
        by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
      )
    );
    await helper.waitElementToBeClickable(
      element(
        by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
      )
    );
    await helper.waitElementToBeVisible(element(by.id('reports-list')));
    if (refresh) {
      await browser.refresh();
    } else {
      // A trick to trigger a list refresh.
      // When already on the "reports" page, clicking on the menu item to "go to reports" doesn't, in fact, do anything.
      await element(by.css('.reset-filter')).click();
      await browser.waitForAngular();
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
    helper.clickElement(hamburgerMenu);
    helper.waitUntilReady(hamburgerMenuOptions);
  },

  confirmDelete: async () => {
    await helper.waitUntilReady(deleteButton);
    await deleteButton.click();
  },
  
  expectDisplayDate:() => {
    expect(displayTime.isPresent()).toBeTruthy();
  },
};

function openSubmenu(menuName) {
  helper.findElementByTextAndClick(hamburgerMenuOptions, menuName);
}
