const hamburgerMenu = () => $('#header-dropdown-link');
const logoutButton =  () => $('.fa-power-off');
const messagesTab = () => $('#messages-tab');
const analyticsTab =  () => $('#analytics-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');
const contactsPage = require('../contacts/contacts.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');
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

const goToBase = async () => {
  await browser.url('/');

  await (await analyticsTab()).waitForDisplayed();
  await (await messagesTab()).waitForDisplayed();
};

const goToReports = async () => {
  await browser.url('/#/reports');
  await (await reportsPage.reportList()).waitForDisplayed();
};

const goToPeople = async () => {
  await browser.url('/#/contacts');
  await (await contactsPage.contactList()).waitForDisplayed();
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
};
