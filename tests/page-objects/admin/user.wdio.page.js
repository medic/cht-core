const addUserButton = () => $('a#add-user');
const addUserDialog = () => $('div#edit-user-profile');
const userName = () => $('#edit-username');
const userFullName = () => $('#fullname');
const userRole = () => $('#role');
const userPlace = () => $('//span[@aria-labelledby="select2-facilitySelect-container"]');
const userAssociatedContact = () => $('//span[@aria-labelledby="select2-contactSelect-container"]');
const userPassword = () => $('#edit-password');
const userConfirmPassword = () => $('#edit-password-confirm');
const saveUserButton = () => $('//a[@test-id="modal-submit-btn"]');
const logoutButton = () => $('i.fa-power-off');
const select2SearchInputBox = () => $('//input[@aria-controls="select2-facilitySelect-results"]');
const select2Name = () => $('.name');
const select2SearchContactInputBox = () => $('//input[@aria-controls="select2-contactSelect-results"]');

const goToAdminUser = async () => {
  await browser.url('/admin/#/users');
};

const openAddUserDialog = async () => {
  await (await addUserButton()).waitForDisplayed();
  await (await addUserButton()).click();
  await (await addUserDialog()).waitForDisplayed();
  // wait for animations to finish
  await browser.pause(500);
};

const inputAddUserFields = async (username, fullname, role, place, associatedContact, password) => {
  await (await userName()).addValue(username);
  await (await userFullName()).addValue(fullname);
  await (await userRole()).selectByVisibleText(role);
  await selectPlace(place);
  await selectContact(associatedContact);
  await (await userPassword()).addValue(password);
  await (await userConfirmPassword()).addValue(password);
};

const selectPlace = async (place) => {
  await (await userPlace()).waitForDisplayed();
  await (await userPlace()).scrollIntoView();
  await (await userPlace()).click();
  await (await select2SearchInputBox()).waitForDisplayed();
  await (await select2SearchInputBox()).addValue(place);
  await (await select2Name()).click();

};

const selectContact = async (associatedContact) => {
  await (await userAssociatedContact()).waitForDisplayed();
  await (await userAssociatedContact()).scrollIntoView();
  await (await userAssociatedContact()).click();
  await (await select2SearchContactInputBox()).waitForDisplayed();
  await (await select2SearchContactInputBox()).addValue(associatedContact);
  await (await select2Name()).click();

};

const saveUser = async ()  => {
  await (await saveUserButton()).waitForDisplayed();
  await (await saveUserButton()).click();
  await (await addUserDialog()).waitForDisplayed({ reverse: true });
};

const logout = async () => {
  await (await logoutButton()).waitForDisplayed();
  await (await logoutButton()).click();
};

module.exports = {
  goToAdminUser,
  openAddUserDialog,
  inputAddUserFields,
  saveUser,
  logout
};
