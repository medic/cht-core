const helper = require('../../../helper');
const utils = require('@utils');
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

// User settings
const settings = element.all(by.css('.configuration a>span'));
// Report bug
const bugDescriptionField = element(by.css('.form-control'));
const modalFooter = element(by.css('.modal-footer'));
const deleteButton = element(by.css('#delete-confirm')).element(by.css('.btn.submit'));
const displayTime = element(by.css('[ui-sref="display.date-time"]'));
const messagesList = element(by.id('message-list'));
const snackBarContent = element(by.css('.snackbar-content'));

const searchBox = element(by.css('input#freetext'));

const waitForLoaderToDisappear = async (timeout = 10000) => {
  try {
    await helper.waitElementToDisappear(by.css('.loader', timeout));
  } catch(err) {
    // element can go stale
  }
};

const openSubmenu = (menuName) => {
  return helper.findElementByTextAndClickNative(hamburgerMenuOptions, menuName);
};

const hideSnackbar = () => {
  // snackbar appears in the bottom of the page for 5 seconds when certain actions are made
  // for example when filling a form, or creating a contact
  // and intercepts all clicks in the actionbar
  // this action is temporary, and will be undone with a refresh
  return browser.executeAsyncScript(() => {
    const callback = arguments[arguments.length - 1];
    // eslint-disable-next-line no-undef
    window.jQuery('.snackbar-content').hide();
    callback();
  });
};

module.exports = {
  snackBarContent,
  messagesList,
  messagesTab,
  analyticsTab,
  waitForLoaderToDisappear,
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
    await openSubmenu(['user settings', 'edit.user.settings']);
    const optionNames = await helper.getTextFromElementNative(settings);
    expect(optionNames[0]).toContain('password');
    expect(optionNames[1].toLowerCase()).toEqual('edit user profile');
  },

  goHome: () => {
    helper.waitUntilReady(medicLogo);
    medicLogo.click();
  },

  goToAnalytics: async () => {
    await helper.waitElementToBeVisibleNative(analyticsTab);
    await analyticsTab.click();
  },

  goToConfiguration: async () => {
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
    await helper.waitUntilReadyNative(element(by.id('message-list')));
  },

  goToPeople: async () => {
    await browser.get(utils.getBaseUrl() + 'contacts/');
    await helper.waitUntilReadyNative(element(by.id('contacts-list')));
  },

  goToReports: refresh => {
    utils.deprecated('goToReports', 'goToReportsNative');
    browser.get(utils.getBaseUrl() + 'reports/');
    helper.waitElementToPresent(element(by.css('.fast-action-trigger button')));
    helper.waitElementToBeClickable(element(by.css('.fast-action-trigger button')));
    helper.waitElementToBeVisible(element(by.id('reports-list')));
    if (refresh) {
      browser.refresh();
    } else {
      // A trick to trigger a list refresh.
      // When already on the "reports" page, clicking on the menu item to "go to reports" doesn't, in fact, do anything.
      searchBox.clear();
      searchBox.sendKeys(protractor.Key.ENTER);
      browser.waitForAngular();
    }
  },

  goToReportsNative: async (refresh) => {
    await browser.get(utils.getBaseUrl() + 'reports/');
    await helper.waitElementToPresentNative(element(by.css('.fast-action-trigger button')));
    await helper.waitElementToBeClickable(element(by.css('.fast-action-trigger button')));
    await helper.waitElementToBeVisibleNative(element(by.id('reports-list')));

    if (refresh) {
      await browser.refresh();
      await helper.waitElementToBeVisibleNative(element(by.id('reports-list')));
    } else {
      // A trick to trigger a list refresh.
      // When already on the "reports" page, clicking on the menu item to "go to reports" doesn't, in fact, do anything.
      await searchBox.clear();
      await searchBox.sendKeys(protractor.Key.ENTER);
      await browser.waitForAngular();
    }
  },

  goToTasks: async () => {
    await browser.get(utils.getBaseUrl() + 'tasks/');
    await helper.waitUntilReadyNative(element(by.id('tasks-list')));
  },

  isAt: async (list) => {
    return await element(by.id(list)).isPresent();
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

  hideSnackbar: hideSnackbar,
};

