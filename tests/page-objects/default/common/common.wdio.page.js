const hamburgerMenu = () => $('#header-dropdown-link');
const userSettingsMenuOption = () => $('[test-id="user-settings-menu-option"]');
const FAST_ACTION_TRIGGER = '.fast-action-trigger';
const fastActionFAB = () => $(`${FAST_ACTION_TRIGGER} .fast-action-fab-button`);
const fastActionFlat = () => $(`${FAST_ACTION_TRIGGER} .fast-action-flat-button`);
const multipleActions = () => $(`${FAST_ACTION_TRIGGER}[test-id="multiple-actions-menu"]`);
const FAST_ACTION_LIST_CONTAINER = '.fast-action-content-wrapper';
const fastActionListContainer = () => $(FAST_ACTION_LIST_CONTAINER);
const fastActionListCloseButton = () => $(`${FAST_ACTION_LIST_CONTAINER} .panel-header .panel-header-close`);
const fastActionById = (id) => $(`${FAST_ACTION_LIST_CONTAINER} .fast-action-item[test-id="${id}"]`);
const moreOptionsMenu = () => $('.more-options-menu-container>.mat-mdc-menu-trigger');
const hamburgerMenuItemSelector = '#header-dropdown li';
const logoutButton = () => $(`${hamburgerMenuItemSelector} .fa-power-off`);
const syncButton = () => $(`${hamburgerMenuItemSelector} a:not(.disabled) .fa-refresh`);
const messagesTab = () => $('#messages-tab');
const analyticsTab = () => $('#analytics-tab');
const taskTab = () => $('#tasks-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');
const getAllButtonLabels = async () => await $$('.button-label');
const buttonLabels = () => $('.button-label');
const modal = require('./modal.wdio.page');
const loaders = () => $$('.container-fluid .loader');
const syncSuccess = () => $(`${hamburgerMenuItemSelector}.sync-status .success`);
const syncRequired = () => $(`${hamburgerMenuItemSelector}.sync-status .required`);
const reloadModalUpdate = () => $('#update-available [test-id="Update"]');
const reloadModalCancel = () => $('#update-available .btn.cancel:not(.disabled)');
const jsonError = async () => (await $('pre')).getText();

//languages
const languagePreferenceHeading = () => $('#language-preference-heading');
const selectedPreferenceHeading = () => $('#language-preference-heading > h4:nth-child(1) > span:nth-child(3)');
const messagesLanguage = () => $('.locale a.selected span');
const defaultLanguage = () => $('.locale-outgoing a.selected span');
const activeSnackbar = () => $('#snackbar.active');
const inactiveSnackbar = () => $('#snackbar:not(.active)');
const snackbar = () => $('#snackbar.active .snackbar-message');
const snackbarMessage = async () => (await $('#snackbar.active .snackbar-message')).getText();
const snackbarAction = () => $('#snackbar.active .snackbar-action');

//Hamburguer menu
// Configuration wizard
const CONFIGURATION_WIZARD_MENU = 'i.fa-list-ol';
const CONFIGURATION_WIZARD = '#guided-setup';
const configurationWizardTitle = () => $(`${CONFIGURATION_WIZARD} .modal-header > h2`);
const defaultCountryCode = () => $('#select2-default-country-code-setup-container');
const configurationWizardSkipSetup = () => $(`${CONFIGURATION_WIZARD} .modal-footer>a:first-of-type`);
const configurationWizardFinishButton = () => $(`${CONFIGURATION_WIZARD} .modal-footer>a:nth-of-type(2)`);
//User settings
const USER_SETTINGS = '=User settings';
const UPDATE_PASSWORD = '=Update password';
const EDIT_PROFILE = '=Edit user profile';
// Feedback or Report bug
const FEEDBACK_MENU = 'i.fa-bug';
const FEEDBACK = '#feedback';
const feedbackTitle = () => $(`${FEEDBACK} .modal-header > h2`);
const feedbackCancelButton = () => $(`${FEEDBACK} .btn.cancel`);
const feedbackSubmitButton = () => $(`${FEEDBACK} .btn-primary`);
//About menu
const ABOUT_MENU = 'i.fa-question';
const RELOAD_BUTTON = '.btn-primary=Reload';
//Configuration App
const CONFIGURATION_APP_MENU = 'i.fa-cog';

const isHamburgerMenuOpen = async () => {
  return await (await $('.header .dropdown.open #header-dropdown-link')).isExisting();
};

const openMoreOptionsMenu = async () => {
  await (await moreOptionsMenu()).waitForClickable();
  await (await moreOptionsMenu()).click();
};

const waitForSnackbarToClose = async () => {
  if (await (await snackbar()).isExisting()) {
    await (await snackbar()).waitForDisplayed({ reverse: true });
  }
};

const clickFastActionById = async (id) => {
  // Wait for the Angular Material's animation to complete.
  await browser.pause(500);
  await (await fastActionListContainer()).waitForDisplayed();
  await (await fastActionById(id)).scrollIntoView();
  await (await fastActionById(id)).waitForClickable();
  await (await fastActionById(id)).click();
};

const clickFastActionFAB = async ({ actionId, waitForList }) => {
  await closeHamburgerMenu();
  await (await fastActionFAB()).waitForDisplayed();
  await (await fastActionFAB()).waitForClickable();
  waitForList = waitForList === undefined ? await (await multipleActions()).isExisting() : waitForList;
  await (await fastActionFAB()).click();
  if (waitForList) {
    await clickFastActionById(actionId);
  }
};

const clickFastActionFlat = async ({ actionId, waitForList }) => {
  await waitForSnackbarToClose();
  await (await fastActionFlat()).waitForDisplayed();
  await (await fastActionFlat()).waitForClickable();
  waitForList = waitForList === undefined ? await (await multipleActions()).isExisting() : waitForList;
  await (await fastActionFlat()).click();
  if (waitForList) {
    await clickFastActionById(actionId);
  }
};

const openFastActionReport = async (formId, rightSideAction = true) => {
  await waitForPageLoaded();
  if (rightSideAction) {
    await clickFastActionFAB({ actionId: formId });
  } else {
    await clickFastActionFlat({ actionId: formId });
  }
  await waitForPageLoaded();
  await (await $('#form-title')).waitForDisplayed();
};

const getFastActionFABTextById = async (actionId) => {
  await clickFastActionFAB({ actionId, waitForList: false });
  await (await fastActionListContainer()).waitForDisplayed();
  return await (await fastActionById(actionId)).getText();
};

const getFastActionFlatText = async () => {
  await waitForSnackbarToClose();
  await (await fastActionFlat()).waitForDisplayed();
  return await (await fastActionFlat()).getText();
};

const closeFastActionList = async () => {
  await (await fastActionListContainer()).waitForDisplayed();
  await (await fastActionListCloseButton()).waitForClickable();
  await (await fastActionListCloseButton()).click();
};

const isMessagesListPresent = () => {
  return isElementByIdPresent('message-list');
};

const isTasksListPresent = () => {
  return isElementByIdPresent('tasks-list');
};

const isReportsListPresent = () => {
  return isElementByIdPresent('reports-list');
};

const isPeopleListPresent = () => {
  return isElementByIdPresent('contacts-list');
};

const isTargetMenuItemPresent = async () => {
  return await (await $(`=Target`)).isExisting();
};

const isTargetAggregatesMenuItemPresent = async () => {
  return await (await $(`=Target aggregates`)).isExisting();
};

const isElementByIdPresent = async (elementId) => {
  return await (await $(`#${elementId}`)).isExisting();
};

const openHamburgerMenu = async () => {
  if (!(await isHamburgerMenuOpen())) {
    await (await hamburgerMenu()).waitForClickable();
    await (await hamburgerMenu()).click();
  }
};

const closeHamburgerMenu = async () => {
  if (await isHamburgerMenuOpen()) {
    await (await hamburgerMenu()).waitForClickable();
    await (await hamburgerMenu()).click();
  }
};

const navigateToLogoutModal = async () => {
  await openHamburgerMenu();
  await (await logoutButton()).click();
  await (await modal.body()).waitForDisplayed();
};

const logout = async () => {
  await navigateToLogoutModal();
  await (await modal.confirm()).click();
  await browser.pause(100); // wait for login page js to execute
};

const getLogoutMessage = async () => {
  await navigateToLogoutModal();
  const body = await modal.body();
  await body.waitForDisplayed();
  return body.getText();
};

const refresh = async () => {
  await browser.refresh();
  await waitForPageLoaded();
};

const goToBase = async () => {
  await browser.url('/');
  await waitForPageLoaded();
};

const goToReports = async () => {
  await browser.url('/#/reports');
  await waitForPageLoaded();
};

const goToPeople = async (contactId = '', shouldLoad = true) => {
  await browser.url(`/#/contacts/${contactId}`);
  if (shouldLoad) {
    await waitForPageLoaded();
  }
};

const goToMessages = async () => {
  await browser.url(`/#/messages`);
  await (await messagesTab()).waitForDisplayed();
};

const goToTasks = async () => {
  await browser.url(`/#/tasks`);
  await (await taskTab()).waitForDisplayed();
  await waitForPageLoaded();
};

const goToAnalytics = async () => {
  await browser.url(`/#/analytics`);
  await (await analyticsTab()).waitForDisplayed();
  await waitForPageLoaded();
};

const goToAboutPage = async () => {
  await browser.url(`/#/about`);
  await waitForLoaders();
};

const closeTour = async () => {
  const closeButton = await $('#tour-select a.btn.cancel');
  try {
    await closeButton.waitForDisplayed();
    await closeButton.click();
    // wait for the request to the server to execute
    // is there a way to leverage wdio to achieve this???
    await browser.pause(500);
  } catch (err) {
    // there might not be a tour, show a warning
    console.warn('Tour modal has not appeared after 2 seconds');
  }
};

const waitForLoaderToDisappear = async (element) => {
  const loaderSelector = '.loader';
  const loader = await (element ? element.$(loaderSelector) : $(loaderSelector));
  await loader.waitForDisplayed({ reverse: true });
};

const hideSnackbar = () => {
  // snackbar appears in the bottom of the page for 5 seconds when certain actions are made
  // for example when filling a form, or creating a contact
  // and intercepts all clicks in the actionbar
  // this action is temporary, and will be undone with a refresh
  return browser.execute(() => {
    // eslint-disable-next-line no-undef
    window.jQuery('.snackbar-content').hide();
  });
};

const toggleActionbar = (hide) => {
  // the actiobar can cover elements at the bottom of the page, making clicks land in incorrect places
  return browser.execute((hide) => {
    // eslint-disable-next-line no-undef
    const element = window.jQuery('.detail-actions');
    hide ? element.hide() : element.show();
  }, hide);
};

const waitForLoaders = async () => {
  await browser.waitUntil(async () => {
    for (const loader of await loaders()) {
      if (await loader.isDisplayed()) {
        return false;
      }
    }
    return true;
  }, { timeoutMsg: 'Waiting for Loading spinners to hide timed out.' });
};

const waitForAngularLoaded = async (timeout = 30000) => {
  await (await $('#header-dropdown-link')).waitForDisplayed({ timeout });
};

const waitForPageLoaded = async () => {
  // if we immediately check for app loaders, we might bypass the initial page load (the bootstrap loader)
  // so waiting for the main page to load.
  await waitForAngularLoaded();
  // ideally we would somehow target all loaders that we expect (like LHS + RHS loaders), but not all pages
  // get all loaders.
  do {
    await waitForLoaders();
  } while ((await loaders()).length > 0);
};

const syncAndNotWaitForSuccess = async () => {
  await openHamburgerMenu();
  await (await syncButton()).click();
};

const syncAndWaitForSuccess = async (timeout = 20000) => {
  await openHamburgerMenu();
  await (await syncButton()).click();
  await openHamburgerMenu();
  await (await syncSuccess()).waitForDisplayed({ timeout });
};

const sync = async (expectReload, timeout) => {
  await syncAndWaitForSuccess(timeout);
  if (expectReload) {
    await closeReloadModal();
  }
  // sync status sometimes lies when multiple changes are fired in quick succession
  await syncAndWaitForSuccess(timeout);
};

const syncAndWaitForFailure = async () => {
  await openHamburgerMenu();
  await (await syncButton()).click();
  await openHamburgerMenu();
  await (await syncRequired()).waitForDisplayed({ timeout: 20000 });
};

const closeReloadModal = async (shouldUpdate = false) => {
  try {
    const button = shouldUpdate ? reloadModalUpdate() : reloadModalCancel();
    await browser.waitUntil(async () => await (await button).waitForExist({ timeout: 2000 }));
    // wait for the animation to complete
    await browser.pause(500);
    await (await button).click();
    await browser.pause(500);
  } catch (err) {
    console.error('Reload modal not showed up');
  }
};

const openReportBugAndFetchProperties = async () => {
  await (await $(FEEDBACK_MENU)).waitForClickable();
  await (await $(FEEDBACK_MENU)).click();
  await (await $(FEEDBACK)).waitForDisplayed();
  return {
    modalHeader: await (await feedbackTitle()).getText(),
    modelCancelButtonText: await (await feedbackCancelButton()).getText(),
    modelSubmitButtonText: await (await feedbackSubmitButton()).getText()
  };
};

const isReportBugOpen = async () => {
  return await (await feedbackTitle()).isExisting();
};

const closeReportBug = async () => {
  if (await isReportBugOpen()) {
    await (await feedbackCancelButton()).waitForClickable();
    await (await feedbackCancelButton()).click();
  }
};

const openAboutMenu = async () => {
  await (await $(ABOUT_MENU)).waitForClickable();
  await (await $(ABOUT_MENU)).click();
  await (await $(RELOAD_BUTTON)).waitForDisplayed();
};

const openConfigurationWizardAndFetchProperties = async () => {
  await (await $(CONFIGURATION_WIZARD_MENU)).waitForClickable();
  await (await $(CONFIGURATION_WIZARD_MENU)).click();
  await (await $(CONFIGURATION_WIZARD)).waitForDisplayed();
  return {
    modelTitle: await (await configurationWizardTitle()).getText(),
    defaultCountryCode: await (await defaultCountryCode()).getText(),
    modelFinishButtonText: await (await configurationWizardFinishButton()).getText()
  };
};

const isConfigurationWizardOpen = async () => {
  return await (await configurationWizardTitle()).isExisting();
};

const closeConfigurationWizard = async () => {
  if (await isConfigurationWizardOpen()) {
    await (await configurationWizardSkipSetup()).waitForClickable();
    await (await configurationWizardSkipSetup()).click();
  }
};

const openUserSettings = async () => {
  await (await userSettingsMenuOption()).waitForClickable();
  await (await userSettingsMenuOption()).click();
};

const openUserSettingsAndFetchProperties = async () => {
  await (await $(USER_SETTINGS)).waitForClickable();
  await (await $(USER_SETTINGS)).click();
  await (await $(UPDATE_PASSWORD)).waitForDisplayed();
  await (await $(EDIT_PROFILE)).waitForDisplayed();
};

const openAppManagement = async () => {
  await (await $(CONFIGURATION_APP_MENU)).waitForClickable();
  await (await $(CONFIGURATION_APP_MENU)).click();
  await (await $('.navbar-brand')).waitForDisplayed();
};

const getDefaultLanguages = async () => {
  await (await hamburgerMenu()).click();
  await openConfigurationWizardAndFetchProperties();
  await (await languagePreferenceHeading()).click();
  const messagesLang = async () => await (await messagesLanguage()).getText();
  await browser.waitUntil(async () => await messagesLang() !== '');

  const headingText = await (await selectedPreferenceHeading()).getText();
  const defaultLang = await (await defaultLanguage()).getText();

  return [headingText, await messagesLang(), defaultLang];
};

const getTextForElements = async (elements) => {
  return Promise.all((await elements()).map(filter => filter.getText()));
};

const getAllButtonLabelsNames = async () => {
  return getTextForElements(getAllButtonLabels);
};

//more options menu
const optionSelector = (action, item) => $(`[test-id="${action}-${item}"]`);

const isMenuOptionEnabled = async (action, item) => {
  return await (await optionSelector(action, item)).isEnabled();
};

const isMenuOptionVisible = async (action, item) => {
  return await (await optionSelector(action, item)).isDisplayed();
};

module.exports = {
  openMoreOptionsMenu,
  closeFastActionList,
  clickFastActionFAB,
  clickFastActionFlat,
  openFastActionReport,
  getFastActionFABTextById,
  getFastActionFlatText,
  logout,
  logoutButton,
  getLogoutMessage,
  messagesTab,
  analyticsTab,
  goToReports,
  goToPeople,
  getReportsButtonLabel,
  getMessagesButtonLabel,
  getTasksButtonLabel,
  goToBase,
  closeTour,
  hideSnackbar,
  waitForLoaders,
  sync,
  syncAndNotWaitForSuccess,
  syncButton,
  closeReloadModal,
  goToMessages,
  goToTasks,
  goToAnalytics,
  isMessagesListPresent,
  isTasksListPresent,
  isPeopleListPresent,
  isReportsListPresent,
  openConfigurationWizardAndFetchProperties,
  isTargetMenuItemPresent,
  isTargetAggregatesMenuItemPresent,
  openHamburgerMenu,
  openAboutMenu,
  openUserSettingsAndFetchProperties,
  openUserSettings,
  openReportBugAndFetchProperties,
  openAppManagement,
  waitForLoaderToDisappear,
  goToAboutPage,
  waitForPageLoaded,
  activeSnackbar,
  inactiveSnackbar,
  snackbarMessage,
  snackbarAction,
  getDefaultLanguages,
  getTextForElements,
  toggleActionbar,
  jsonError,
  isMenuOptionEnabled,
  isMenuOptionVisible,
  moreOptionsMenu,
  refresh,
  syncAndWaitForFailure,
  waitForAngularLoaded,
  closeConfigurationWizard,
  closeReportBug,
  getAllButtonLabelsNames,
};
