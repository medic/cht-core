const helper = require('../../helper');
const utils = require('../../utils');
const { browser, element } = require('protractor');

const medicLogo = element(by.className('logo-full'));
const genericSubmitButton = element(by.css('.btn.btn-primary'));
const genericCancelBtn = element(by.css('.modal .btn.cancel'));
const messagesTab = element(by.id('messages-tab'));
const analyticsTab = element(by.id('analytics-tab'));
const hamburgerMenu = element(by.id('header-dropdown-link'));
const hamburgerMenuOptions = element.all(by.css('#header-dropdown>li:not(.hidden)'));
const logoutButton = $('.fa-power-off');

//Log out warning modal
const modal = element(by.css('div.modal-dialog'));
const modlaBody = element(by.css('div.modal-body'));
const yesButton = element(by.css('a.btn.submit.btn-danger'));

// Configuration wizard
const wizardTitle = element(by.css('#guided-setup .modal-header > h2'));
const defaultCountryCode = element(
  by.css('#select2-default-country-code-setup-container')
);
const skipSetup = element(by.css('#guided-setup .modal-footer>a:first-of-type'));
const finishBtn = element(by.css('#guided-setup .modal-footer>a:nth-of-type(2)'));
// Tour
const tourBtns = element.all(by.css('.btn.tour-option'));
// User settings
const settings = element.all(by.css('.configuration a>span'));
// Report bug
const bugDescriptionField = element(by.css('.form-control'));
const modalFooter = element(by.css('.modal-footer'));
const deleteButton = element(by.css('#delete-confirm')).element(by.css('.btn.submit'));
const displayTime = element(by.css('[ui-sref="display.date-time"]'));
const messagesList = element(by.id('message-list'));
const contactsList = element(by.id('contacts-list'));
const reportsList = element(by.id('reports-list'));
const languagePreferenceHeading = element(by.css('#language-preference-heading'));
const selectedPreferenceHeading = element(by.css('#language-preference-heading > h4:nth-child(1) > span:nth-child(3)'));
const messagesLanguage = element(by.css('.locale a.selected span.rectangle'));
const defaultLanguage=  element(by.css('.locale-outgoing a.selected span.rectangle'));


module.exports = {
  messagesList,
  contactsList,
  reportsList,
  messagesTab,
  analyticsTab,
  calm: async () => {
    utils.deprecated('calm', 'calmNative');
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

  checkAbout: async () => {
    await openSubmenu('about');
    expect(await genericSubmitButton.getText()).toEqual('Reload');
  },

  checkConfigurationWizard: async () => {
    await openSubmenu('configuration wizard');
    await helper.waitUntilReadyNative(wizardTitle);
    await helper.waitUntilTranslated(wizardTitle);
    const wizardTitleText = await helper.getTextFromElementNative(wizardTitle);
    console.log('title text', wizardTitleText);
    expect(wizardTitleText).toEqual('Configuration wizard');
    expect(await helper.getTextFromElementNative(defaultCountryCode)).toEqual('Canada (+1)');
    expect(await finishBtn.getText()).toEqual('Finish');
    await skipSetup.click();
  },

  getDefaultLanguages: async () => {
    await module.exports.openMenuNative();
    await openSubmenu('configuration wizard');
    await helper.waitUntilReadyNative(wizardTitle);
    await helper.waitUntilTranslated(wizardTitle);
    const wizardTitleText = await helper.getTextFromElementNative(wizardTitle);
    console.log('title text', wizardTitleText);
    expect(wizardTitleText).toEqual('Configuration wizard');
    await helper.clickElementNative(languagePreferenceHeading);
    const headingText = await helper.getTextFromElementNative(selectedPreferenceHeading);
    const messageLang = await messagesLanguage.getAttribute('innerText').then(text =>text);
    const defaultLang = await defaultLanguage.getAttribute('innerText').then(text =>text);
    expect (headingText).toBe(`${messageLang}, ${defaultLang}`);
    return  headingText;
  },

  checkGuidedTour: async () => {
    await openSubmenu('guided');
    expect(await tourBtns.count()).toEqual(4);
    await helper.clickElementNative(genericCancelBtn);
  },

  checkReportBug: async () => {
    await openSubmenu('report bug');
    await helper.waitElementToBeVisibleNative(bugDescriptionField);
    await helper.waitElementToBeVisibleNative(modalFooter);
    expect(await genericSubmitButton.getText()).toEqual('Submit');
    await genericCancelBtn.click();
  },

  sync: () => {
    utils.deprecated('sync', 'syncNative');
    module.exports.openMenu();
    openSubmenu('sync now');
    helper.waitElementToPresent(element(by.css('.sync-status .success')));
  },

  syncNative: async () => {
    await module.exports.openMenuNative();
    await openSubmenu(['sync now', 'sync.now']);
    await helper.waitElementToPresentNative(element(by.css('.sync-status .success')));
  },

  checkUserSettings: async () => {
    await openSubmenu('user settings');
    const optionNames = await helper.getTextFromElementNative(settings);
    expect(optionNames).toEqual(['Update password', 'Edit user profile']);
  },

  goHome: () => {
    helper.waitUntilReady(medicLogo);
    medicLogo.click();
  },

  goToAnalytics: async () => {
    await analyticsTab.click();
    await helper.waitUntilReadyNative(medicLogo);
  },

  goToConfiguration: async () => {
    await helper.waitUntilReadyNative(medicLogo);
    await browser.get(utils.getAdminBaseUrl());
  },

  goToLoginPage: () => {
    utils.deprecated('goToLoginPage', 'goToLoginPageNative');
    browser.manage().deleteAllCookies();
    browser.driver.get(utils.getLoginUrl());
  },

  goToLoginPageNative: async () => {
    await browser.manage().deleteAllCookies();
    await browser.driver.get(await utils.getLoginUrl());
  },

  goToMessages: () => {
    utils.deprecated('goToMesssages', 'goToMessagesNative');
    browser.get(utils.getBaseUrl() + 'messages/');
    helper.waitUntilReady(medicLogo);
    helper.waitUntilReady(element(by.id('message-list')));
  },

  goToMessagesNative: async () => {
    await browser.get(utils.getBaseUrl() + 'messages/');
    await helper.waitUntilReadyNative(medicLogo);
    await helper.waitUntilReadyNative(element(by.id('message-list')));
  },

  goToPeople: async () => {
    await browser.get(utils.getBaseUrl() + 'contacts/');
    await helper.waitUntilReadyNative(medicLogo);
    await helper.waitUntilReadyNative(element(by.id('contacts-list')));
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

  goToReportsNative: async (refresh) => {
    await browser.get(utils.getBaseUrl() + 'reports/');
    await helper.waitElementToPresentNative(
      element(
        by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
      )
    );
    await helper.waitElementToBeClickable(
      element(
        by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')
      )
    );
    await helper.waitElementToBeVisibleNative(element(by.id('reports-list')));

    if (refresh) {
      await browser.refresh();
      await helper.waitElementToBeVisibleNative(element(by.id('reports-list')));
    } else {
      // A trick to trigger a list refresh.
      // When already on the "reports" page, clicking on the menu item to "go to reports" doesn't, in fact, do anything.
      await helper.clickElementNative(element(by.css('.reset-filter')));
      await browser.waitForAngular();
    }
  },

  goToTasks: async () => {
    await browser.get(utils.getBaseUrl() + 'tasks/');
    await helper.waitUntilReadyNative(medicLogo);
    await helper.waitUntilReadyNative(element(by.id('tasks-list')));
  },

  isAt: async (list) => {
    await helper.waitUntilReadyNative(medicLogo);
    return element(by.id(list)).isPresent();
  },

  logout: async () => {
    await helper.clickElementNative(hamburgerMenu);
    await helper.waitElementToBeVisibleNative(logoutButton);
    await helper.clickElementNative(logoutButton);
    await helper.waitUntilReadyNative(modal);
    const warning = await helper.getTextFromElementNative(modlaBody);
    await helper.clickElementNative(yesButton);
    await helper.waitUntilReadyNative(element(by.css('form#form')));
    return warning;

  },

  openMenu: () => {
    utils.deprecated('openMenu', 'openMenuNative');
    helper.waitUntilReady(messagesTab);
    helper.clickElement(hamburgerMenu);
    return helper.waitUntilReady(hamburgerMenuOptions.first());
  },

  openMenuNative: async () => {
    await helper.waitUntilReadyNative(messagesTab);
    const menuAlreadyOpen = hamburgerMenuOptions.length &&
                            hamburgerMenuOptions.first() &&
                            await helper.isDisplayed(hamburgerMenuOptions.first());
    if (!menuAlreadyOpen) {
      await hamburgerMenu.click();
    }
    await helper.isDisplayed(hamburgerMenuOptions.first());
  },

  confirmDelete: async () => {
    await helper.waitUntilReady(deleteButton);
    await deleteButton.click();
  },

  expectDisplayDate: async () => {
    expect(await displayTime.isPresent()).toBeTruthy();
  },

  openSubmenu: openSubmenu,

  getReportsButtonLabel: () => element(by.css('#reports-tab .button-label')),
  getMessagesButtonLabel: () => element(by.css('#messages-tab .button-label')),
  getTasksButtonLabel: () => element(by.css('#tasks-tab .button-label')),
};

function openSubmenu(menuName) {
  return helper.findElementByTextAndClickNative(hamburgerMenuOptions, menuName);
}
