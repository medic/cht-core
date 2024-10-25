const modalPage = require('./modal.wdio.page');
const constants = require('@constants');
const aboutPage = require('@page-objects/default/about/about.wdio.page');

const tabsSelector = {
  getAllButtonLabels: async () => await $$('.header .tabs .button-label'),
  messagesTab: () => $('#messages-tab'),
  getMessagesButtonLabel: () => $('#messages-tab .button-label'),
  taskTab: () => $('#tasks-tab'),
  getTasksButtonLabel: () => $('#tasks-tab .button-label'),
  getReportsButtonLabel: () => $('#reports-tab .button-label'),
  analyticsTab: () => $('#analytics-tab'),
};

const HAMBURGER_MENU_ITEM_SELECTOR = 'mat-sidenav-content';
const hamburgerMenuSelectors = {
  hamburgerMenu: () => $('aria/Application menu'),
  closeSideBarMenu: () => $('.panel-header-close'),
  syncButton: () => $('aria/Sync now'),
  syncSuccess: () => $('aria/All reports synced'),
  syncInProgress: () => $(HAMBURGER_MENU_ITEM_SELECTOR).$('*="Currently syncing"'),
  syncRequired: () => $(`${HAMBURGER_MENU_ITEM_SELECTOR} .sync-status .required`),
  userSettingsButton: () => $('aria/User settings'),
  feedbackMenuOption: () => $('aria/Report bug'),
  logoutButton: () => $('aria/Log out'),
};

const kebabMenuSelectors = {
  moreOptionsMenu: () => $('aria/Actions menu'),
};

const FAST_ACTION_TRIGGER = '.fast-action-trigger';
const FAST_ACTION_LIST_CONTAINER = '.fast-action-content-wrapper';
const fabSelectors = {
  fastActionFAB: () => $$(`${FAST_ACTION_TRIGGER} .fast-action-fab-button`),
  fastActionFlat: () => $(`${FAST_ACTION_TRIGGER} .fast-action-flat-button`),
  multipleActions: () => $(`${FAST_ACTION_TRIGGER}[test-id="multiple-actions-menu"]`),
  fastActionListContainer: () => $(FAST_ACTION_LIST_CONTAINER),
  fastActionListCloseButton: () => $(`${FAST_ACTION_LIST_CONTAINER} .panel-header .panel-header-close`),
  fastActionById: (id) => $(`${FAST_ACTION_LIST_CONTAINER} .fast-action-item[test-id="${id}"]`),
  fastActionItems: () => $$(`${FAST_ACTION_LIST_CONTAINER} .fast-action-item`),
  reportsFastActionFAB: () => $('#reports-content .fast-action-fab-button mat-icon'),
};

const userSettingsSelectors = {
  editProfileButton: () => $('.user .configuration.page i.fa-user'),
};






const loaders = () => $$('.container-fluid .loader');
const snackbar = () => $('#snackbar.active .snackbar-message');




// Feedback or Report bug

const FEEDBACK = '#feedback';
//About menu
const ABOUT_MENU = 'aria/About';
//Configuration App
const configurationAppMenuOption = () => $('aria/App Management');
const errorLog = () => $(`error-log`);
const sideBarMenuTitle = () => $('aria/Menu');


const getJsonErrorText = async () => await $('pre').getText();

const isHamburgerMenuOpen = async () => {
  return await (await $('mat-sidenav-container.mat-drawer-container-has-open')).isExisting();
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
  await (await fastActionById(id)).waitForClickable();
  await (await fastActionById(id)).click();
};

/**
 * There are two FABs, one for desktop and another for mobile. This finds the visible FAB.
 * @returns {Promise<HTMLElement>}
 */
const findVisibleFAB = async () => {
  for (const button of await fastActionFAB()) {
    if (await button.isDisplayed()) {
      return button;
    }
  }
};

const clickFastActionFAB = async ({ actionId, waitForList }) => {
  await closeHamburgerMenu();
  const fab = await findVisibleFAB();
  await fab.waitForClickable();
  waitForList = waitForList === undefined ? await (await multipleActions()).isExisting() : waitForList;
  await fab.click();
  if (waitForList) {
    await clickFastActionById(actionId);
  }
};

const getFastActionItemsLabels = async () => {
  await closeHamburgerMenu();
  const fab = await findVisibleFAB();
  await fab.waitForClickable();
  await fab.click();

  await browser.pause(500);
  await (await fastActionListContainer()).waitForDisplayed();

  const items = await fastActionItems();
  return await items.map(item => item.getText());
};

const clickFastActionFlat = async ({ actionId, waitForList }) => {
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

const isReportActionDisplayed = async () => {
  return await browser.waitUntil(async () => {
    const exists = await (await reportsFastActionFAB()).isExisting();
    if (exists) {
      await (await reportsFastActionFAB()).waitForDisplayed();
    }

    return exists;
  });
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

  // Adding pause here as we have to wait for sidebar nav menu animation to load
  await browser.pause(500);
  await (await sideBarMenuTitle()).waitForDisplayed();
};

const closeHamburgerMenu = async () => {
  if (await isHamburgerMenuOpen()) {
    await (await closeSideBarMenu()).waitForClickable();
    await (await closeSideBarMenu()).click();
  }

  await (await sideBarMenuTitle()).waitForDisplayed({ reverse: true });
};

const navigateToLogoutModal = async () => {
  await openHamburgerMenu();
  await (await logoutButton()).waitForClickable();
  await (await logoutButton()).click();
  await (await modalPage.body()).waitForDisplayed();
};

const logout = async () => {
  await navigateToLogoutModal();
  await modalPage.submit();
  await browser.pause(100); // wait for login page js to execute
};

const getLogoutMessage = async () => {
  await navigateToLogoutModal();
  const modal = await modalPage.getModalDetails();
  return modal.body;
};

const goToUrl = async (url) => {
  const currentUrl = await browser.getUrl();
  const desiredUrl = `${constants.BASE_URL}${url}`.replace(/\/$/, '');
  if (currentUrl === desiredUrl) {
    await browser.refresh();
  } else {
    await browser.url(url);
  }
};

const refresh = async () => {
  await browser.refresh();
  await waitForPageLoaded();
};

const goToBase = async () => {
  await goToUrl('/');
  await waitForPageLoaded();
};

const goToReports = async (reportId = '') => {
  await goToUrl(`/#/reports/${reportId}`);
  await waitForPageLoaded();
};

const goToPeople = async (contactId = '', shouldLoad = true) => {
  await goToUrl(`/#/contacts/${contactId}`);
  if (shouldLoad) {
    await waitForPageLoaded();
  }
};

const goToMessages = async () => {
  await goToUrl(`/#/messages`);
  await (await messagesTab()).waitForDisplayed();
};

const goToTasks = async () => {
  await goToUrl(`/#/tasks`);
  await (await taskTab()).waitForDisplayed();
  await waitForPageLoaded();
};

const goToAnalytics = async () => {
  await goToUrl(`/#/analytics`);
  await (await analyticsTab()).waitForDisplayed();
  await waitForPageLoaded();
};

const goToAboutPage = async () => {
  await goToUrl(`/#/about`);
  await waitForLoaders();
};

const waitForLoaderToDisappear = async (element) => {
  const loaderSelector = '.loader';
  const loader = await (element ? element.$(loaderSelector) : $(loaderSelector));
  await loader.waitForDisplayed({ reverse: true });
};

const hideSnackbar = () => {
  // snackbar appears in the bottom of the page for 5 seconds when certain actions are made
  // for example when filling a form, or creating a contact and intercepts all clicks in the FAB and Flat buttons
  // this action is temporary, and will be undone with a refresh
  return browser.execute(() => {
    // eslint-disable-next-line no-undef
    window.jQuery('.snackbar-content').hide();
  });
};

const getVisibleLoaders = async () => {
  const visible = [];
  for (const loader of await loaders()) {
    if (await loader.isDisplayedInViewport()) {
      visible.push(loader);
    }
  }

  return visible;
};

const waitForLoaders = async () => {
  await browser.waitUntil(async () => {
    const visibleLoaders = await getVisibleLoaders();
    return !visibleLoaders.length;
  }, { timeoutMsg: 'Waiting for Loading spinners to hide timed out.' });
};

const waitForAngularLoaded = async (timeout = 40000) => {
  await (await hamburgerMenu()).waitForDisplayed({ timeout });
};

const waitForPageLoaded = async () => {
  // if we immediately check for app loaders, we might bypass the initial page load (the bootstrap loader)
  // so waiting for the main page to load.
  await waitForAngularLoaded();
  // ideally we would somehow target all loaders that we expect (like LHS + RHS loaders), but not all pages
  // get all loaders.
  do {
    await waitForLoaders();
  } while ((await getVisibleLoaders()).length > 0);
};

const syncAndNotWaitForSuccess = async () => {
  await openHamburgerMenu();
  await (await syncButton()).click();
};

const syncAndWaitForSuccess = async (timeout = 20000) => {
  await openHamburgerMenu();
  await (await syncButton()).waitForClickable();
  await (await syncButton()).click();
  await closeReloadModal(false);
  await openHamburgerMenu();
  if (await (await syncInProgress()).isExisting()) {
    await (await syncInProgress()).waitForDisplayed({ reverse: true, timeout });
  }
  await (await syncSuccess()).waitForDisplayed({ timeout });
};

const hideModalOverlay = () => {
  // hides the modal overlay, so it doesn't intercept all clicks
  // this action is temporary, and will be undone with a refresh
  return browser.execute(() => {
    const style = document.createElement('style');
    style.innerHTML = '.cdk-overlay-backdrop { display: none; }';
    document.head.appendChild(style);
  });
};

const sync = async (expectReload, timeout) => {
  await hideModalOverlay();
  let closedModal = false;
  if (expectReload) {
    // it's possible that sync already happened organically, and we already have the reload modal
    closedModal = await closeReloadModal();
  }

  await syncAndWaitForSuccess(timeout);
  if (expectReload && !closedModal) {
    await closeReloadModal();
  }
  // sync status sometimes lies when multiple changes are fired in quick succession
  await syncAndWaitForSuccess(timeout);
  await closeHamburgerMenu();
};

const syncAndWaitForFailure = async () => {
  await openHamburgerMenu();
  await (await syncButton()).click();
  await openHamburgerMenu();
  await (await syncRequired()).waitForDisplayed({ timeout: 20000 });
};

const closeReloadModal = async (shouldUpdate = false, timeout = 5000) => {
  try {
    await browser.waitUntil( async () => await modalPage.modal().isDisplayed(), { timeout: 10000, interval: 500 } );
    shouldUpdate ? await modalPage.submit(timeout) : await modalPage.cancel(timeout);
    shouldUpdate && await waitForAngularLoaded();
    return true;
  } catch (err) {
    console.error('Reload modal not showed up');
    return false;
  }
};

const openReportBugAndFetchProperties = async () => {
  await (await feedbackMenuOption()).waitForClickable();
  await (await feedbackMenuOption()).click();
  return await modalPage.getModalDetails();
};

const isReportBugOpen = async () => {
  return await (await $(FEEDBACK)).isExisting();
};

const closeReportBug = async () => {
  if (await isReportBugOpen()) {
    await modalPage.cancel();
  }
};

const openAboutMenu = async () => {
  await (await $(ABOUT_MENU)).waitForClickable();
  await (await $(ABOUT_MENU)).click();
  await (await $(aboutPage.RELOAD_BUTTON)).waitForDisplayed();
};

const openUserSettings = async () => {
  await (await hamburgerMenuSelectors.userSettingsButton()).waitForClickable();
  await (await hamburgerMenuSelectors.userSettingsButton()).click();
};

const openUserSettingsAndFetchProperties = async () => {
  await openUserSettings();
  await (await userSettingsSelectors.editProfileButton()).waitForDisplayed();
};

const openEditProfile = async () => {
  await (await userSettingsSelectors.editProfileButton()).waitForClickable();
  await (await userSettingsSelectors.editProfileButton()).click();
};

const openAppManagement = async () => {
  await (await configurationAppMenuOption()).waitForClickable();
  await (await configurationAppMenuOption()).click();
  await (await $('.navbar-brand')).waitForDisplayed();
};

const getTextForElements = async (elements) => {
  const elems = await elements();
  return elems.map(elem => elem.getText());
};

const getAllButtonLabelsNames = async () => {
  return await getTextForElements(getAllButtonLabels);
};

//more options menu
const optionSelector = (action, item) => $(`[test-id="${action}-${item}"]`);

const isMenuOptionEnabled = async (action, item) => {
  return await (await optionSelector(action, item)).isEnabled();
};

const isMenuOptionVisible = async (action, item) => {
  return await (await optionSelector(action, item)).isDisplayed();
};

const loadNextInfiniteScrollPage = async () => {
  await browser.execute(() => {
    $('.inbox-items .content-row:last-child').get(0).scrollIntoView();
  });
  await waitForLoaderToDisappear(await $('.left-pane'));
};

const getErrorLog = async () => {
  await errorLog().waitForDisplayed();

  const errorMessage = await (await $('.error-details span')).getText();
  const userDetails = await (await $$('.error-details dl dd'));
  const errorStack = await (await $('pre code'));

  const username = await userDetails[0].getText();
  const url = await userDetails[1].getText();
  return { errorMessage, url, username, errorStack };
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
  isTargetMenuItemPresent,
  isTargetAggregatesMenuItemPresent,
  openHamburgerMenu,
  closeHamburgerMenu,
  openAboutMenu,
  openUserSettingsAndFetchProperties,
  openUserSettings,
  openEditProfile,
  openReportBugAndFetchProperties,
  openAppManagement,
  waitForLoaderToDisappear,
  goToAboutPage,
  waitForPageLoaded,
  getTextForElements,
  getJsonErrorText,
  isMenuOptionEnabled,
  isMenuOptionVisible,
  moreOptionsMenu,
  refresh,
  syncAndWaitForFailure,
  waitForAngularLoaded,
  closeReportBug,
  getAllButtonLabelsNames,
  loadNextInfiniteScrollPage,
  goToUrl,
  getFastActionItemsLabels,
  getErrorLog,
  reportsFastActionFAB,
  isReportActionDisplayed,
  getHeaderTitleOnMobile,
};
