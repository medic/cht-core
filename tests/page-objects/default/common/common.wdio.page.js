const fs = require('fs');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const constants = require('@constants');

const ELEMENT_DISPLAY_PAUSE = 500; // 500ms

const tabsSelector = {
  getAllButtonLabels: async () => await $$('.header .tabs .button-label'),
  messagesTab: () => $('#messages-tab'),
  taskTab: () => $('#tasks-tab'),
  analyticsTab: () => $('#analytics-tab'),
};

const hamburgerMenuSelectors = {
  hamburgerMenu: () => $('aria/Application menu'),
  closeSideBarMenu: () => $('.panel-header-close'),
  sideBarMenuTitle: () => $('aria/Menu'),
  appManagementButton: () => $('aria/App Management'),
  syncButton: () => $('aria/Sync now'),
  syncSuccess: () => $('aria/All reports synced'),
  syncInProgress: () => $('mat-sidenav-content').$('*="Currently syncing"'),
  aboutButton: () => $('aria/About'),
  trainingMaterialsButton: () => $('aria/Training Materials'),
  userSettingsButton: () => $('aria/User settings'),
  feedbackMenuOption: () => $('aria/Report bug'),
  logoutButton: () => $('aria/Log out'),
};

const kebabMenuSelectors = {
  moreOptionsMenu: () => $('aria/Actions menu'),
  edit: () => $('aria/Edit'),
  delete: () => $('aria/Delete'),
  export: () => $('aria/Export'),
  review: () => $('aria/Review'),
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

const getJsonErrorText = async () => await $('pre').getText();

const isHamburgerMenuOpen = async () => {
  return await (await $('mat-sidenav-container.mat-drawer-container-has-open')).isExisting();
};

const openHamburgerMenu = async () => {
  if (!(await isHamburgerMenuOpen())) {
    await (await hamburgerMenuSelectors.hamburgerMenu()).waitForClickable();
    await (await hamburgerMenuSelectors.hamburgerMenu()).click();
    // Adding pause here as we have to wait for sidebar nav menu animation to load
    await browser.pause(ELEMENT_DISPLAY_PAUSE);
  }
  await (await hamburgerMenuSelectors.sideBarMenuTitle()).waitForDisplayed();
};

const closeHamburgerMenu = async () => {
  if (await isHamburgerMenuOpen()) {
    await (await hamburgerMenuSelectors.closeSideBarMenu()).waitForClickable();
    await (await hamburgerMenuSelectors.closeSideBarMenu()).click();
  }

  await (await hamburgerMenuSelectors.sideBarMenuTitle()).waitForDisplayed({ reverse: true });
};

const openMoreOptionsMenu = async () => {
  await (await kebabMenuSelectors.moreOptionsMenu()).waitForClickable();
  await (await kebabMenuSelectors.moreOptionsMenu()).click();
};

const performMenuAction = async (actionSelector) => {
  await openMoreOptionsMenu();
  const actionElement = await actionSelector();
  await actionElement.waitForClickable();
  await actionElement.click();
};

const accessEditOption = async () => {
  await performMenuAction(kebabMenuSelectors.edit);
};

const accessDeleteOption = async () => {
  await performMenuAction(kebabMenuSelectors.delete);
};

const accessExportOption = async () => {
  await performMenuAction(kebabMenuSelectors.export);
};

const accessReviewOption = async () => {
  await performMenuAction(kebabMenuSelectors.review);
};

const waitForSnackbarToClose = async () => {
  const snackbar = await $('#snackbar.active .snackbar-message');
  if (await snackbar.isExisting()) {
    await snackbar.waitForDisplayed({ reverse: true });
  }
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
  for (const loader of await $$('.container-fluid .loader')) {
    if (await loader.isDisplayedInViewport()) {
      visible.push(loader);
    }
  }

  return visible;
};

const waitForLoaderToDisappear = async (element) => {
  const loaderSelector = '.loader';
  const loader = await (element ? element.$(loaderSelector) : $(loaderSelector));
  await loader.waitForDisplayed({ reverse: true });
};

const waitForLoaders = async () => {
  await browser.waitUntil(async () => {
    const visibleLoaders = await getVisibleLoaders();
    return !visibleLoaders.length;
  }, { timeoutMsg: 'Waiting for Loading spinners to hide timed out.' });
};

const waitForAngularLoaded = async (timeout = 40000) => {
  await (await hamburgerMenuSelectors.hamburgerMenu()).waitForDisplayed({ timeout });
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

const clickFastActionById = async (id) => {
  // Wait for the Angular Material's animation to complete.
  await browser.pause(ELEMENT_DISPLAY_PAUSE);
  await (await fabSelectors.fastActionListContainer()).waitForDisplayed();
  await (await fabSelectors.fastActionById(id)).waitForClickable();
  await (await fabSelectors.fastActionById(id)).click();
};

/**
 * There are two FABs, one for desktop and another for mobile. This finds the visible FAB.
 * @returns {Promise<HTMLElement>}
 */
const findVisibleFAB = async () => {
  for (const button of await fabSelectors.fastActionFAB()) {
    if (await button.isDisplayed()) {
      return button;
    }
  }
};

const clickFastActionFAB = async ({ actionId, waitForList }) => {
  await closeHamburgerMenu();
  const fab = await findVisibleFAB();
  await fab.waitForClickable();
  waitForList = waitForList === undefined ? await (await fabSelectors.multipleActions()).isExisting() : waitForList;
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
  await (await fabSelectors.fastActionListContainer()).waitForDisplayed();

  const items = await fabSelectors.fastActionItems();
  return await items.map(item => item.getText());
};

const clickFastActionFlat = async ({ actionId, waitForList }) => {
  await (await fabSelectors.fastActionFlat()).waitForDisplayed();
  await (await fabSelectors.fastActionFlat()).waitForClickable();
  waitForList = waitForList === undefined ? await (await fabSelectors.multipleActions()).isExisting() : waitForList;
  await (await fabSelectors.fastActionFlat()).click();
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
  await (await fabSelectors.fastActionListContainer()).waitForDisplayed();
  return await (await fabSelectors.fastActionById(actionId)).getText();
};

const getFastActionFlatText = async () => {
  await waitForSnackbarToClose();
  await (await fabSelectors.fastActionFlat()).waitForDisplayed();
  return await (await fabSelectors.fastActionFlat()).getText();
};

const closeFastActionList = async () => {
  await (await fabSelectors.fastActionListContainer()).waitForDisplayed();
  await (await fabSelectors.fastActionListCloseButton()).waitForClickable();
  await (await fabSelectors.fastActionListCloseButton()).click();
};

const isReportActionDisplayed = async () => {
  return await browser.waitUntil(async () => {
    const exists = await (await fabSelectors.reportsFastActionFAB()).isExisting();
    if (exists) {
      await (await fabSelectors.reportsFastActionFAB()).waitForDisplayed();
    }

    return exists;
  });
};

const isElementPresent = async (selector) => {
  return await (await $(selector)).isExisting();
};

const isMessagesListPresent = () => isElementPresent('#message-list');

const isTasksListPresent = () => isElementPresent('#tasks-list');

const isReportsListPresent = () => isElementPresent('#reports-list');

const isPeopleListPresent = () => isElementPresent('#contacts-list');

const isTargetMenuItemPresent = () => isElementPresent('=Target');

const isTargetAggregatesMenuItemPresent = () => isElementPresent('=Target aggregates');

const isMoreOptionsMenuPresent = async () => await (await kebabMenuSelectors.moreOptionsMenu()).isExisting();

const navigateToLogoutModal = async () => {
  await openHamburgerMenu();
  await (await hamburgerMenuSelectors.logoutButton()).waitForClickable();
  await (await hamburgerMenuSelectors.logoutButton()).click();
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

const goToAboutPage = async () => {
  await goToUrl(`/#/about`);
  await waitForLoaders();
};

const goToMessages = async () => {
  await goToUrl(`/#/messages`);
  await (await tabsSelector.messagesTab()).waitForDisplayed();
};

const goToTasks = async () => {
  await goToUrl(`/#/tasks`);
  await (await tabsSelector.taskTab()).waitForDisplayed();
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

const goToAnalytics = async () => {
  await goToUrl(`/#/analytics`);
  await (await tabsSelector.analyticsTab()).waitForDisplayed();
  await waitForPageLoaded();
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

const syncAndNotWaitForSuccess = async () => {
  await openHamburgerMenu();
  await (await hamburgerMenuSelectors.syncButton()).click();
};

const syncAndWaitForSuccess = async (timeout = 20000, retry = 10) => {
  if (retry < 0) {
    throw new Error('Failed to sync after 10 retries');
  }
  await closeReloadModal(false, 0);

  try {
    await openHamburgerMenu();
    if (!await (await hamburgerMenuSelectors.syncInProgress()).isExisting()) {
      await (await hamburgerMenuSelectors.syncButton()).click();
      await openHamburgerMenu();
    }

    await (await hamburgerMenuSelectors.syncInProgress()).waitForDisplayed({ timeout, reverse: true });
    await (await hamburgerMenuSelectors.syncSuccess()).waitForDisplayed({ timeout });
  } catch (err) {
    console.error(err);
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

const openReportBugAndFetchProperties = async () => {
  await (await hamburgerMenuSelectors.feedbackMenuOption()).waitForClickable();
  await (await hamburgerMenuSelectors.feedbackMenuOption()).click();
  return await modalPage.getModalDetails();
};

const isReportBugOpen = () => isElementPresent('#feedback');

const closeReportBug = async () => {
  if (await isReportBugOpen()) {
    await modalPage.cancel();
  }
};

const openAboutMenu = async () => {
  await (await hamburgerMenuSelectors.aboutButton()).waitForClickable();
  await (await hamburgerMenuSelectors.aboutButton()).click();
  await (await $('.about.page .mat-primary')).waitForDisplayed();
};

const openUserSettings = async () => {
  await (await hamburgerMenuSelectors.userSettingsButton()).waitForClickable();
  await (await hamburgerMenuSelectors.userSettingsButton()).click();
};

const openUserSettingsAndFetchProperties = async () => {
  await openUserSettings();
  await (await userSettingsSelectors.editProfileButton()).waitForDisplayed();
};

const openTrainingMaterials = async () => {
  await (await hamburgerMenuSelectors.trainingMaterialsButton()).waitForClickable();
  await (await hamburgerMenuSelectors.trainingMaterialsButton()).click();
  await waitForPageLoaded();
};

const openEditProfile = async () => {
  await (await userSettingsSelectors.editProfileButton()).waitForClickable();
  await (await userSettingsSelectors.editProfileButton()).click();
};

const openAppManagement = async () => {
  await (await hamburgerMenuSelectors.appManagementButton()).waitForClickable();
  await (await hamburgerMenuSelectors.appManagementButton()).click();
  await (await $('.navbar-brand')).waitForDisplayed();
};

const getTextForElements = async (elements) => {
  const elems = await elements();
  return elems.map(elem => elem.getText());
};

const getAllButtonLabelsNames = async () => {
  return await getTextForElements(tabsSelector.getAllButtonLabels);
};

const isMenuOptionEnabled = async (action) => {
  const parent = await (await kebabMenuSelectors[action]()).parentElement().parentElement();
  return await parent.getAttribute('aria-disabled') === 'false';
};

const isMenuOptionVisible = async (action) => {
  return await (await kebabMenuSelectors[action]()).isDisplayed();
};

const loadNextInfiniteScrollPage = async () => {
  await browser.execute(() => {
    $('.inbox-items .content-row:last-child').get(0).scrollIntoView();
  });
  await waitForLoaderToDisappear(await $('.left-pane'));
};

const getErrorLog = async () => {
  await (await $('error-log')).waitForDisplayed();

  const errorMessage = await (await $('.error-details span')).getText();
  const userDetails = await (await $$('.error-details dl dd'));
  const errorStack = await (await $('pre code'));

  const username = await userDetails[0].getText();
  const url = await userDetails[1].getText();
  return { errorMessage, url, username, errorStack };
};

const createFormDoc = (path, formId) => {
  const id = formId || path.split('/').pop();
  const formXML = fs.readFileSync(`${path}.xml`, 'utf8');
  return {
    _id: `form:${id}`,
    internalId: id,
    title: id,
    type: 'form',
    context: {
      person: true,
      place: true,
    },
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(formXML).toString('base64'),
      },
    },
  };
};

module.exports = {
  tabsSelector,
  fabSelectors,
  getJsonErrorText,
  openHamburgerMenu,
  closeHamburgerMenu,
  openMoreOptionsMenu,
  accessEditOption,
  accessDeleteOption,
  accessExportOption,
  accessReviewOption,
  hideSnackbar,
  waitForLoaderToDisappear,
  waitForLoaders,
  waitForAngularLoaded,
  waitForPageLoaded,
  clickFastActionFAB,
  getFastActionItemsLabels,
  clickFastActionFlat,
  openFastActionReport,
  getFastActionFABTextById,
  getFastActionFlatText,
  closeFastActionList,
  isReportActionDisplayed,
  isElementPresent,
  isMessagesListPresent,
  isTasksListPresent,
  isPeopleListPresent,
  isReportsListPresent,
  isTargetMenuItemPresent,
  isTargetAggregatesMenuItemPresent,
  isMoreOptionsMenuPresent,
  logout,
  getLogoutMessage,
  goToUrl,
  refresh,
  goToBase,
  goToAboutPage,
  goToMessages,
  goToTasks,
  goToReports,
  goToPeople,
  goToAnalytics,
  closeReloadModal,
  syncAndNotWaitForSuccess,
  sync,
  openReportBugAndFetchProperties,
  closeReportBug,
  openAboutMenu,
  openUserSettings,
  openTrainingMaterials,
  openUserSettingsAndFetchProperties,
  openEditProfile,
  openAppManagement,
  getTextForElements,
  getAllButtonLabelsNames,
  isMenuOptionEnabled,
  isMenuOptionVisible,
  loadNextInfiniteScrollPage,
  getErrorLog,
  createFormDoc,
};
