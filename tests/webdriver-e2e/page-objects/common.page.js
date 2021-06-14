const hamburgerMenu = () => $('#header-dropdown-link');
const logoutButton =  () => $('.fa-power-off');
const modalBody = () => $('div.modal-body');
const yesButton = () => $('a.btn.submit.btn-danger');

const logout = async () => {
  await (await hamburgerMenu()).click();
  await (await logoutButton()).click();
  await (await modalBody()).waitForDisplayed();
  await (await yesButton()).click();
};

const getLogoutMessage = async () => {
  await (await hamburgerMenu()).click();
  await (await logoutButton()).click();
  await (await modalBody()).waitForDisplayed();
  return (await modalBody()).getText();
};

module.exports = {
  logout,
  getLogoutMessage
};
