const hamburgerMenu = () => $('#header-dropdown-link');
const logoutButton =  () => $('.fa-power-off');
const messagesTab = () => $('#messages-tab');
const analyticsTab =  () => $('#analytics-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');
const contactsPage = require('../contacts/contacts.wdio.page');
const modal = require('./modal.wdio.page');
const _ = require('lodash');

const navigateToLogoutModal = async () => {
  await (await hamburgerMenu()).click();
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

const goToBase = async (timeoutForBaseLoadMillis) => {
  await browser.url('/');
  
  let waitForDisplayedConfig = {};
  if (_.isNumber(timeoutForBaseLoadMillis)) {
    waitForDisplayedConfig = { timeout: timeoutForBaseLoadMillis };
  }

  await (await analyticsTab()).waitForDisplayed(waitForDisplayedConfig);
  await (await messagesTab()).waitForDisplayed();
};

const goToReports = async () => {
  await browser.url('/#/reports');
};

const goToPeople = async () => {
  await browser.url('/#/contacts');
  await (await contactsPage.contactList()).waitForDisplayed();
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
  goToBase
};
