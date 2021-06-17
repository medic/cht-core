const hamburgerMenu = () => $('#header-dropdown-link');
const logoutButton =  () => $('.fa-power-off');
const modalBody = () => $('div.modal-body');
const yesButton = () => $('a.btn.submit.btn-danger');
const messagesTab = () => $('#messages-tab');
const analyticsTab =  () => $('#analytics-tab');
const getReportsButtonLabel = () => $('#reports-tab .button-label');
const getMessagesButtonLabel = () => $('#messages-tab .button-label');
const getTasksButtonLabel = () => $('#tasks-tab .button-label');


const navigateToLogoutModal = async () => {
  await (await hamburgerMenu()).click();
  await (await logoutButton()).click();
  await (await modalBody()).waitForDisplayed();
};

const logout = async () => {
  await navigateToLogoutModal();
  await (await yesButton()).click();
};

const getLogoutMessage = async () => {
  await navigateToLogoutModal();
  const body = await modalBody();
  await body.waitForDisplayed();
  return body.getText();
};

const goToReports = async () => {
  await browser.url('/#/reports');
};

const goToPeople = async () => {
  await browser.url('/#/contacts');
};

module.exports = {
  logout,
  logoutButton,
  getLogoutMessage,
  yesButton,
  messagesTab,
  analyticsTab,
  goToReports,
  goToPeople,
  getReportsButtonLabel,
  getMessagesButtonLabel,
  getTasksButtonLabel
};
