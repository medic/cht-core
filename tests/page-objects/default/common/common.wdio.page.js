const modalPage = require('./modal.wdio.page');
const constants = require('@constants');
const aboutPage = require('@page-objects/default/about/about.wdio.page');

const hamburgerMenu = () => $('aria/Application menu');
const closeSideBarMenu = () => $('.panel-header-close');
const FAST_ACTION_TRIGGER = '.fast-action-trigger';
const fastActionFAB = () => $$(`${FAST_ACTION_TRIGGER} .fast-action-fab-button`);
const fastActionFlat = () => $(`${FAST_ACTION_TRIGGER} .fast-action-flat-button`);
const multipleActions = () => $(`${FAST_ACTION_TRIGGER}[test-id="multiple-actions-menu"]`);
const FAST_ACTION_LIST_CONTAINER = '.fast-action-content-wrapper';
const fastActionListContainer = () => $(FAST_ACTION_LIST_CONTAINER);
const fastActionListCloseButton = () => $(`${FAST_ACTION_LIST_CONTAINER} .panel-header .panel-header-close`);
const fastActionById = (id) => $(`${FAST_ACTION_LIST_CONTAINER} .fast-action-item[test-id="${id}"]`);
const fastActionItems = () => $$(`${FAST_ACTION_LIST_CONTAINER} .fast-action-item`);
const moreOptionsMenu = () => $('aria/Actions menu');
const hamburgerMenuItemSelector = 'mat-sidenav-content';
const logoutButton = () => $('aria/Log out');
const syncButton = () => $('aria/Sync now');
const messagesTab = () => $('#messages-tab');
const analyticsTab = () => $('#analytics-tab');
const taskTab = () => $('#tasks-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');
const getAllButtonLabels = async () => await $$('.header .tabs .button-label');
const loaders = () => $$('.container-fluid .loader');
const syncSuccess = () => $('aria/All reports synced');
const syncInProgress = () => $(hamburgerMenuItemSelector).$('*="Currently syncing"');
const syncRequired = () => $(`${hamburgerMenuItemSelector} .sync-status .required`);
const jsonError = async () => (await $('pre')).getText();
const REPORTS_CONTENT_SELECTOR = '#reports-content';
const reportsFastActionFAB = () => $(`${REPORTS_CONTENT_SELECTOR} .fast-action-fab-button mat-icon`);

//languages
const activeSnackbar = () => $('#snackbar.active');
const inactiveSnackbar = () => $('#snackbar:not(.active)');
const snackbar = () => $('#snackbar.active .snackbar-message');
const snackbarMessage = async () => (await $('#snackbar.active .snackbar-message')).getText();
const snackbarAction = () => $('#snackbar.active .snackbar-action');

// Mobile
const mobileTopBarTitle = () => $('mm-navigation .ellipsis-title');

//User settings
const USER_SETTINGS = 'aria/User settings';
const EDIT_PROFILE = '.user .configuration.page i.fa-user';
// Feedback or Report bug
const feedbackMenuOption = () => $('aria/Report bug');
const FEEDBACK = '#feedback';
//About menu
const ABOUT_MENU = 'aria/About';
//Configuration App
const ELEMENT_DISPLAY_PAUSE = 500; // 500ms

const configurationAppMenuOption = () => $('aria/App Management');
const errorLog = () => $(`error-log`);
const sideBarMenuTitle = () => $('aria/Menu');

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
  await browser.pause(ELEMENT_DISPLAY_PAUSE);
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

  await browser.pause(ELEMENT_DISPLAY_PAUSE);
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

const getHeaderTitleOnMobile = async () => {
  return {
    name: await mobileTopBarTitle().getText(),
  };
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

const syncAndWaitForSuccess = async (timeout = 20000, retry = 10) => {
  if (retry < 0) {
    throw new Error('Failed to sync after 10 retries');
  }
  await closeReloadModal(false, 0);

  try {
    await openHamburgerMenu();
    if (!await (await syncInProgress()).isExisting()) {
      await (await syncButton()).click();
      await openHamburgerMenu();
    }

    await (await syncInProgress()).waitForDisplayed({ timeout, reverse: true });
    await (await syncSuccess()).waitForDisplayed({ timeout: ELEMENT_DISPLAY_PAUSE });
  } catch (err) {
    console.error(err);
    await browser.takeScreenshot();
    await syncAndWaitForSuccess(timeout, retry - 1);
  }
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
    closedModal = await closeReloadModal(false, 0);
  }

  await syncAndWaitForSuccess(timeout);
  if (expectReload && !closedModal) {
    await closeReloadModal();
  }
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
    shouldUpdate ? await modalPage.submit(timeout) : await modalPage.cancel(timeout);
    shouldUpdate && await waitForAngularLoaded();
    return true;
  } catch (err) {
    timeout && console.error('Reload modal has not showed up');
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
  await (await $(USER_SETTINGS)).waitForClickable();
  await (await $(USER_SETTINGS)).click();
};

const openUserSettingsAndFetchProperties = async () => {
  await (await $(USER_SETTINGS)).waitForClickable();
  await (await $(USER_SETTINGS)).click();
  await (await $(EDIT_PROFILE)).waitForDisplayed();
};

const openEditProfile = async () => {
  await (await $(EDIT_PROFILE)).click();
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
    $('.items-container .content-row:last-child').get(0).scrollIntoView();
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
  activeSnackbar,
  inactiveSnackbar,
  snackbarMessage,
  snackbarAction,
  getTextForElements,
  jsonError,
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
