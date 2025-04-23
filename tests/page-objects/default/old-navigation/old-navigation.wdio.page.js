const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

const messagesTab = () => $('#messages-tab');
const analyticsTab = () => $('#analytics-tab');
const taskTab = () => $('#tasks-tab');
const hamburgerMenuItemSelector = '#header-dropdown li';
const syncButton = () => $(`${hamburgerMenuItemSelector} a:not(.disabled) .fa-refresh`);
const hamburgerMenu = () => $('#header-dropdown-link');
const syncInProgress = () => $('*="Currently syncing"');
const syncSuccess = () => $(`${hamburgerMenuItemSelector}.sync-status .success`);
const loaders = () => $$('.container-fluid .loader');

const goToMessages = async () => {
  await commonPage.goToUrl(`/#/messages`);
  await  messagesTab().waitForDisplayed();
};

const goToTasks = async () => {
  await commonPage.goToUrl(`/#/tasks`);
  await  taskTab().waitForDisplayed();
  await waitForPageLoaded();
};

const goToReports = async (reportId = '') => {
  await commonPage.goToUrl(`/#/reports/${reportId}`);
  await waitForPageLoaded();
};

const goToPeople = async (contactId = '', shouldLoad = true) => {
  await commonPage.goToUrl(`/#/contacts/${contactId}`);
  if (shouldLoad) {
    await waitForPageLoaded();
  }
};

const goToAnalytics = async () => {
  await commonPage.goToUrl(`/#/analytics`);
  await  analyticsTab().waitForDisplayed();
  await waitForPageLoaded();
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

const isHamburgerMenuOpen = async () => {
  return await  $('.header .dropdown.open #header-dropdown-link').isExisting();
};

const openHamburgerMenu = async () => {
  if (!(await isHamburgerMenuOpen())) {
    await  hamburgerMenu().waitForClickable();
    await  hamburgerMenu().click();
  }
};

const closeHamburgerMenu = async () => {
  if (await isHamburgerMenuOpen()) {
    await  hamburgerMenu().waitForClickable();
    await  hamburgerMenu().click();
  }
};

const syncAndWaitForSuccess = async (timeout = 20000) => {
  await openHamburgerMenu();
  await  syncButton().click();
  await openHamburgerMenu();
  if (await  syncInProgress().isExisting()) {
    await  syncInProgress().waitForDisplayed({ reverse: true, timeout });
  }
  await  syncSuccess().waitForDisplayed({ timeout });
};

const sync = async (expectReload, timeout) => {
  await hideModalOverlay();
  let closedModal = false;
  if (expectReload) {
    // it's possible that sync already happened organically, and we already have the reload modal
    closedModal = await commonPage.closeReloadModal(false, 0);
  }

  await syncAndWaitForSuccess(timeout);
  if (expectReload && !closedModal) {
    await commonPage.closeReloadModal();
  }
  // sync status sometimes lies when multiple changes are fired in quick succession
  await syncAndWaitForSuccess(timeout);
  await closeHamburgerMenu();
};

const getVisibleLoaders = async () => {
  const visible = [];
  for (const loader of await loaders()) {
    if (await loader.isDisplayed()) {
      visible.push(loader);
    }
  }

  return visible;
};

const waitForAngularLoaded = async (timeout = 40000) => {
  await  $('#header-dropdown-link').waitForDisplayed({ timeout });
};

const waitForPageLoaded = async () => {
  // if we immediately check for app loaders, we might bypass the initial page load (the bootstrap loader)
  // so waiting for the main page to load.
  await waitForAngularLoaded();
  // ideally we would somehow target all loaders that we expect (like LHS + RHS loaders), but not all pages
  // get all loaders.
  do {
    await commonPage.waitForLoaders();
  } while ((await getVisibleLoaders()).length > 0);
};

const goToBase = async () => {
  await commonPage.goToUrl('/');
  await waitForPageLoaded();
};

const logout = async () => {
  await openHamburgerMenu();

  await  commonPage.logoutButton().waitForClickable();
  await  commonPage.logoutButton().click();

  await  modalPage.body().waitForDisplayed();
  await modalPage.submit();
  await browser.pause(100); // wait for login page js to execute
};

const mobileTopBarTitle = () => $('mm-navigation .ellipsis-title');
const getHeaderTitleOnMobile = async () => {
  return {
    name: await mobileTopBarTitle().getText(),
  };
};

module.exports = {
  goToBase,
  goToMessages,
  goToTasks,
  goToReports,
  goToPeople,
  goToAnalytics,
  sync,
  waitForPageLoaded,
  logout,
  getHeaderTitleOnMobile,
};
