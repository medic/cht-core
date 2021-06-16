const hamburgerMenu = () => $('#header-dropdown-link');
const logoutButton =  () => $('.fa-power-off');
const modalBody = () => $('div.modal-body');
const yesButton = () => $('a.btn.submit.btn-danger');
const messagesTab = () => $('#messages-tab');
const analyticsTab =  () => $('#analytics-tab');


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

module.exports = {
  logout,
  logoutButton,
  getLogoutMessage,
  yesButton,
  messagesTab,
  analyticsTab
};
