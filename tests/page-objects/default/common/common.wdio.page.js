const fs = require('fs');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const constants = require('@constants');

const ELEMENT_DISPLAY_PAUSE = 500; // 500ms
const RELOAD_SYNC_TIMEOUT = 10000;

const tabsSelector = {
  getAllButtonLabels: async () => await $$('.header .tabs .button-label'),
  messagesTab: () => $('#messages-tab'),
  taskTab: () => $('#tasks-tab'),
  analyticsTab: () => $('#analytics-tab'),
};
const { generateScreenshot } = require('@utils/screenshots');

const hamburgerMenuSelectors = {
  hamburgerMenu: () => $('aria/Application menu'),
  closeSideBarMenu: () => $('.panel-header-close'),
  sideBarMenuTitle: () => $('aria/Menu'),
  appManagementButton: () => $('aria/App Management'),
  syncButton: () => $('aria/Sync now'),
  syncSuccess: () => $('aria/All reports synced'),
  syncInProgress: () => $('mat-sidenav-content').$('*="Currently syncing"'),
  aboutButton: () => $('aria/About'),
  trainingMaterialsButton: () => $('aria/Training materials'),
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
const hamburgerMenuItemSelector = 'mat-sidenav-content';
const logoutButton = () => $('aria/Log out');
const syncButton = () => $('aria/Sync now');
const hamburguerMenuItemByOption = (menuOption) => $(hamburgerMenuItemSelector).$(`//span[text()="${menuOption}"]`);
const messagesTab = () => $('#messages-tab');
const analyticsTab = () => $('#analytics-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');

const userSettingsSelectors = {
  editProfileButton: () => $('.user .configuration.page i.fa-user'),
};

const getJsonErrorText = async () => await $('pre').getText();

const isHamburgerMenuOpen = async () => {
  return await hamburgerMenuSelectors.closeSideBarMenu().isDisplayed();
  //return await $('mat-sidenav-container.mat-drawer-container-has-open .mat-drawer-opened').isDisplayed();
};

const openHamburgerMenu = async () => {
  if (!(await isHamburgerMenuOpen())) {
    await hamburgerMenuSelectors.hamburgerMenu().waitForClickable();
    await hamburgerMenuSelectors.hamburgerMenu().click();
  }
  await hamburgerMenuSelectors.closeSideBarMenu().waitForDisplayed();
};

const closeHamburgerMenu = async () => {
  if (await isHamburgerMenuOpen()) {
    await hamburgerMenuSelectors.closeSideBarMenu().waitForClickable();

    await hamburgerMenuSelectors.closeSideBarMenu().click();
  }
  await hamburgerMenuSelectors.sideBarMenuTitle().waitForDisplayed({ reverse: true });
};

const openMoreOptionsMenu = async () => {
  await kebabMenuSelectors.moreOptionsMenu().click();
};

const performMenuAction = async (actionSelector, isOptionsMenuOpen = false) => {
  if (!isOptionsMenuOpen){
    await openMoreOptionsMenu();
  }
  const actionElement = await actionSelector();
  await actionElement.click();
};

const accessEditOption = async (isOptionsMenuOpen = false) => {
  await performMenuAction(kebabMenuSelectors.edit, isOptionsMenuOpen);
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

const toggleMenuAndCaptureScreenshot = async (menuOption, reverse, pageName, screenshotName) => {
  await openHamburgerMenu();
  await hamburguerMenuItemByOption(menuOption).waitForClickable({ reverse });
  await generateScreenshot(pageName, screenshotName);
  if (reverse) {
    await closeHamburgerMenu();
  } else {
    await hamburguerMenuItemByOption(menuOption).click();
  }
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
  const loaders = await $$('.container-fluid .loader').getElements();
  for (let i = 0; i < loaders.length; i++) {
    if (await loaders[i].isDisplayed({ withinViewport: true })) {
      visible.push(loaders[i]);
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
  await hamburgerMenuSelectors.hamburgerMenu().waitForDisplayed({ timeout });
};

const waitForPageLoaded = async () => {
  // if we immediately check for app loaders, we might bypass the initial page load (the bootstrap loader)
  // so waiting for the main page to load.
  await waitForAngularLoaded();
  // ideally we would somehow target all loaders that we expect (like LHS + RHS loaders), but not all pages
  // get all loaders.
  do {
    await waitForLoaders();
  } while (await getVisibleLoaders().length > 0);
};

const clickFastActionById = async (id) => {
  // Wait for the Angular Material's animation to complete.
  await browser.pause(ELEMENT_DISPLAY_PAUSE);
  await fabSelectors.fastActionListContainer().waitForDisplayed();
  await fabSelectors.fastActionById(id).click();
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
  waitForList = waitForList === undefined ? await fabSelectors.multipleActions().isExisting() : waitForList;
  await fab.click();
  if (waitForList) {
    await clickFastActionById(actionId);
  }
};

const getFastActionItemsLabels = async () => {
  await closeHamburgerMenu();
  const fab = await findVisibleFAB();
  await fab.click();

  await browser.pause(ELEMENT_DISPLAY_PAUSE);
  await fabSelectors.fastActionListContainer().waitForDisplayed();

  const items = await fabSelectors.fastActionItems();
  return await items.map(item => item.getText());
};

const clickFastActionFlat = async ({ actionId, waitForList }) => {
  await fabSelectors.fastActionFlat().waitForDisplayed();
  await fabSelectors.fastActionFlat().waitForClickable();

  waitForList = waitForList === undefined ? await fabSelectors.multipleActions().isExisting() : waitForList;
  await fabSelectors.fastActionFlat().click();
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
  await $('#form-title').waitForDisplayed();
};

const getFastActionFABTextById = async (actionId) => {
  await clickFastActionFAB({ actionId, waitForList: false });
  await fabSelectors.fastActionListContainer().waitForDisplayed();
  return await fabSelectors.fastActionById(actionId).getText();
};

const getFastActionFlatText = async () => {
  await waitForSnackbarToClose();
  await fabSelectors.fastActionFlat().waitForDisplayed();
  return await fabSelectors.fastActionFlat().getText();
};

const closeFastActionList = async () => {
  await (await fabSelectors.fastActionListCloseButton()).click();
};

const isReportActionDisplayed = async () => {
  return await browser.waitUntil(async () => {
    const exists = await fabSelectors.reportsFastActionFAB().isExisting();
    if (exists) {
      await fabSelectors.reportsFastActionFAB().waitForDisplayed();
    }

    return exists;
  });
};

const isElementPresent = async (selector) => {
  return await $(selector).isExisting();
};

const isMessagesListPresent = () => isElementPresent('#message-list');

const isTasksListPresent = () => isElementPresent('#tasks-list');

const isReportsListPresent = () => isElementPresent('#reports-list');

const isPeopleListPresent = () => isElementPresent('#contacts-list');

const isContactTabPresent = () => isElementPresent('#contacts-tab');

const isTargetMenuItemPresent = () => isElementPresent('=Target');

const isTargetAggregatesMenuItemPresent = () => isElementPresent('=Target aggregates');

const isMoreOptionsMenuPresent = async () => await (await kebabMenuSelectors.moreOptionsMenu()).isDisplayed();

const navigateToLogoutModal = async () => {
  await openHamburgerMenu();
  await hamburgerMenuSelectors.logoutButton().click();
  await modalPage.body().waitForDisplayed();
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
  await tabsSelector.messagesTab().waitForDisplayed();
};

const goToTasks = async () => {
  await goToUrl(`/#/tasks`);
  await tabsSelector.taskTab().waitForDisplayed();
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
  await analyticsTab().waitForDisplayed();
  await waitForPageLoaded();
};

const closeReloadModal = async (shouldUpdate, timeout) => {
  try {
    timeout = timeout || shouldUpdate ? RELOAD_SYNC_TIMEOUT : ELEMENT_DISPLAY_PAUSE;
    if (shouldUpdate) {
      await modalPage.submit(timeout);
      await waitForAngularLoaded();
    } else {
      await modalPage.cancel(timeout);
    }

    return true;
  } catch (err) {
    (timeout > ELEMENT_DISPLAY_PAUSE) && console.error(err);
    (timeout > ELEMENT_DISPLAY_PAUSE) && console.error('Reload modal has not showed up');
    return false;
  }
};

const syncAndNotWaitForSuccess = async () => {
  await openHamburgerMenu();
  await syncButton().click();
};

const syncAndWaitForSuccess = async (expectReload, timeout = RELOAD_SYNC_TIMEOUT, retry = 10) => {
  if (retry < 0) {
    throw new Error('Failed to sync after 10 retries');
  }
  try {
    await openHamburgerMenu();
    if (!await hamburgerMenuSelectors.syncInProgress().isDisplayed({ withinViewport: true })) {
      await hamburgerMenuSelectors.syncButton().click();
    }

    await hamburgerMenuSelectors.syncInProgress().waitForDisplayed({ timeout, reverse: true });
    await browser.waitUntil(async () => {
      return (await hamburgerMenuSelectors.syncSuccess().isDisplayed()) ||
             (await modalPage.isDisplayed());
    }, { timeout });
    await openHamburgerMenu();

    if (!await hamburgerMenuSelectors.syncSuccess().isDisplayed({ withinViewport: true })) {
      throw new Error('Failed to sync');
    }
  } catch (err) {
    console.error(err);
    return await syncAndWaitForSuccess(expectReload, timeout, retry - 1);
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

const sync = async ({
  reload = false,
  expectReload = false,
  serviceWorkerUpdate = false,
  timeout = RELOAD_SYNC_TIMEOUT
} = {}) => {
  await hideModalOverlay();

  await syncAndWaitForSuccess(expectReload, timeout);
  // service worker updates require downloading all resources, and then it triggers the update modal.
  // sometimes this action is not timely with a quick sync.
  serviceWorkerUpdate && await closeReloadModal(false, RELOAD_SYNC_TIMEOUT);

  if (reload) {
    await browser.refresh();
    return await waitForPageLoaded();
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
  await hamburgerMenuSelectors.userSettingsButton().waitForClickable();
  await hamburgerMenuSelectors.userSettingsButton().click();
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
  await userSettingsSelectors.editProfileButton().waitForClickable();
  await userSettingsSelectors.editProfileButton().click();
  await modalPage.checkModalIsOpen();
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
  const parent = await kebabMenuSelectors[action]().parentElement().parentElement();
  return await parent.getAttribute('aria-disabled') === 'false';
};

const isMenuOptionVisible = async (action) => {
  return await kebabMenuSelectors[action]().isDisplayed();
};

const loadNextInfiniteScrollPage = async () => {
  await browser.execute(() => {
    $('.inbox-items .content-row:last-child').get(0).scrollIntoView();
  });
  await waitForLoaderToDisappear(await $('.left-pane'));
};

const getErrorLog = async () => {
  await (await $('error-log')).waitForDisplayed();

  const errorMessage = await $('.error-details span').getText();
  const userDetails = await $$('.error-details dl dd');
  const errorStack = await $('pre code');

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

const reloadSession = async () => {
  await browser.reloadSession();
  await browser.url('/');
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
  waitForLoaderToDisappear,
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
  logoutButton,
  isContactTabPresent,
  messagesTab,
  analyticsTab,
  getReportsButtonLabel,
  getMessagesButtonLabel,
  getTasksButtonLabel,
  hideSnackbar,
  waitForLoaders,
  syncButton,
  toggleMenuAndCaptureScreenshot,
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
  isMoreOptionsMenuPresent,
  logout,
  getLogoutMessage,
  goToUrl,
  refresh,
  goToBase,
  goToAboutPage,
  goToReports,
  goToPeople,
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
  reloadSession,
};
