const hamburgerMenu = () => $('#header-dropdown-link');
const hamburgerMenuItemSelector = '#header-dropdown li';
const logoutButton = () => $(`${hamburgerMenuItemSelector} .fa-power-off`);
const syncButton = () => $(`${hamburgerMenuItemSelector} a:not(.disabled) .fa-refresh`);
const messagesTab = () => $('#messages-tab');
const analyticsTab = () => $('#analytics-tab');
const taskTab = () => $('#tasks-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');
const contactsPage = require('../contacts/contacts.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');
const modal = require('./modal.wdio.page');
const loaders = () => $$('.container-fluid .loader');
const syncSuccess = () => $(`${hamburgerMenuItemSelector}.sync-status .success`);
const reloadModalCancel = () => $('#update-available .btn.cancel:not(.disabled)');

const isHamburgerMenuOpen = async () => {
  return await (await $('.header .dropdown.open #header-dropdown-link')).isExisting();
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
};

const getLogoutMessage = async () => {
  await navigateToLogoutModal();
  const body = await modal.body();
  await body.waitForDisplayed();
  return body.getText();
};

const goToBase = async () => {
  await browser.url('/');

  await (await analyticsTab()).waitForDisplayed();
  await (await messagesTab()).waitForDisplayed();
};

const goToReports = async () => {
  await browser.url('/#/reports');
  await (await reportsPage.reportList()).waitForDisplayed();
};

const goToPeople = async (contactId = '', shouldLoad = true) => {
  await browser.url(`/#/contacts/${contactId}`);
  if (shouldLoad) {
    await (await contactsPage.contactList()).waitForDisplayed();
  }
};

const goToMessages = async () => {
  await browser.url(`/#/messages`);
  await (await messagesTab()).waitForDisplayed();
};

const goToTasks = async () => {
  await browser.url(`/#/tasks`);
  await (await taskTab()).waitForDisplayed();
};

const goToAnalytics = async () => {
  await browser.url(`/#/analytics`);
  await (await analyticsTab()).waitForDisplayed();
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

const waitForLoaders = async () => {
  await browser.waitUntil(async () => {
    return (await loaders()).map((loader) => loader.isDisplayed()).length === 0;
  });
};

const syncAndWaitForSuccess = async () => {
  await openHamburgerMenu();
  await (await syncButton()).click();
  await openHamburgerMenu();
  await (await syncSuccess()).waitForDisplayed();
};

const sync = async (expectReload) => {
  await syncAndWaitForSuccess();
  if (expectReload) {
    await closeReloadModal();
  }
  // sync status sometimes lies when multiple changes are fired in quick succession
  await syncAndWaitForSuccess();
};

const closeReloadModal = async () => {
  await browser.waitUntil(async () => await (await reloadModalCancel()).waitForExist());
  // wait for the animation to complete
  await browser.pause(500);
  await (await reloadModalCancel()).click();
  await browser.pause(500);
};

const openReportBugAndFetchProperties = async () => {
  await (await $('i.fa-bug')).click();
  await (await $('#feedback')).waitForDisplayed();
  return {
    modalHeader: await (await $('#feedback .modal-header > h2')).getText(),
    modelCancelButtonText: await (await $('.btn.cancel')).getText(),
    modelSubmitButtonText: await (await $('.btn-primary')).getText()
  };
};

const openAboutMenu = async () => {
  await (await $('i.fa-question')).click();
  await (await $('.btn-primary=Reload')).waitForDisplayed();
};

const openConfigurationWizardAndFetchProperties = async () => {
  await (await $('i.fa-list-ol')).click();
  await (await $('#guided-setup')).waitForDisplayed();

  return {
    modelTitle: await (await $('#guided-setup .modal-header > h2')).getText(),
    defaultCountryCode: await (await $('#select2-default-country-code-setup-container')).getText(),
    modelFinishButtonText: await (await $('#guided-setup .modal-footer>a:nth-of-type(2)')).getText()
  };
};

const openUserSettingsAndFetchProperties  = async () => {
  await (await $('=User settings')).click();
  await (await $('=Update password')).waitForDisplayed();
  await (await $('=Edit user profile')).waitForDisplayed();
};

const openAppManagement = async () => {
  await (await $('i.fa-cog')).click();
  await (await $('.navbar-brand')).waitForDisplayed();
};

module.exports = {
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
  openReportBugAndFetchProperties,
  openAppManagement,
  waitForLoaderToDisappear
};
