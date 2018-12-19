const helper = require('../../helper'),
  utils = require('../../utils');

const medicLogo = element(by.className('logo-full')),
  genericSubmitButton = element(by.css('.btn.btn-primary')),
  genericCancelBtn = element(by.css('.modal .btn.cancel')),
  messagesLink = element(by.id('messages-tab')),
  analyticsLink = element(by.id('analytics-tab')),
  hamburgerMenu = element(by.css('.dropdown.options>a')),
  hamburgerMenuOptions = element.all(by.css('.dropdown.options>ul>li')),
  logoutButton = $('[ng-click=logout]'),
  // Configuration wizard
  wizardTitle = element(by.css('.modal-header>h2')),
  defaultCountryCode = element(
    by.css('#select2-default-country-code-setup-container')
  ),
  skipSetup = element(by.css('.modal-footer>a:first-of-type')),
  finishBtn = element(by.css('.modal-footer>a:nth-of-type(2)')),
  // Tour
  tourBtns = element.all(by.css('.btn.tour-option')),
  // About
  debugMode = element(by.css('label')),
  // User settings
  settings = element.all(by.css('.configuration a>span')),
  // Report bug
  bugDescriptionField = element(by.css('[placeholder="Bug description"]'));

module.exports = {
  calm: () => {
    helper.waitUntilReady(medicLogo);
  },

  checkAbout: () => {
    openSubmenu('about');
    expect(genericSubmitButton.getText()).toEqual('Reload');
    expect(debugMode.getText()).toEqual('Enable debug mode');
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
    expect(genericSubmitButton.getText()).toEqual('Submit');
    genericCancelBtn.click();
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
    helper.waitUntilReady(hamburgerMenuOptions);
  },
};

function openSubmenu(menuName) {
  helper.findElementByTextAndClick(hamburgerMenuOptions, menuName);
  helper.waitForAngularComplete();
}
