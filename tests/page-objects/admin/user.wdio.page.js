const _ = require('lodash');
const addUserButton = () => $('a#add-user');
const cancelUserModalButton = () => $('[test-id="modal-cancel-btn"]');
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
const usernameTextSelector = '[test-id="username-list"]';
const usernameText = () => $(usernameTextSelector);
const usernameTextList = () => $$(usernameTextSelector);
const usernameErrorMessage = () => $('span.help-block.ng-binding');
const passwordErrorMessage = () => $('#edit-password ~ .help-block');
const placeErrorMessage = () => $('#facilitySelect ~ .help-block');
const contactErrorMessage = () => $('#contactSelect ~ .help-block');

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

const closeUserDialog = async () => {
  await (await cancelUserModalButton()).waitForDisplayed();
  await (await cancelUserModalButton()).click();
  await (await addUserDialog()).waitForDisplayed({ reverse: true });
};

const inputAddUserFields = async (username, fullname, role, place, associatedContact, password, 
  confirmPassword = password) => {
  await (await userName()).addValue(username);
  await (await userFullName()).addValue(fullname);
  await (await userRole()).selectByVisibleText(role);

  if (!_.isEmpty(place)) {
    await selectPlace(place);
  }

  if (!_.isEmpty(associatedContact)) {
    await selectContact(associatedContact);
  }
  
  await (await userPassword()).addValue(password);
  await (await userConfirmPassword()).addValue(confirmPassword);
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

const saveUser = async (isSuccessExpected = true)  => {
  await (await saveUserButton()).waitForDisplayed();
  await (await saveUserButton()).click();
  if (isSuccessExpected) {
    await (await addUserDialog()).waitForDisplayed({ reverse: true });
  }
};

const logout = async () => {
  await (await logoutButton()).waitForDisplayed();
  await (await logoutButton()).click();
};

const getAllUsernames = async () => {
  await (await usernameText()).waitForDisplayed();
  return getTextForElements(usernameTextList);
};

const getTextForElements = async (elements) => {
  return Promise.all((await elements()).map(filter => filter.getText()));
};

const getUsernameErrorText = async () => {
  return await (await usernameErrorMessage()).getText();
};

const getPasswordErrorText = async () => {
  return await (await passwordErrorMessage()).getText();
};

const getPlaceErrorText = async () => {
  return await (await placeErrorMessage()).getText();
};

const getContactErrorText = async () => {
  return await (await contactErrorMessage()).getText();
};

module.exports = {
  goToAdminUser,
  openAddUserDialog,
  closeUserDialog,
  inputAddUserFields,
  saveUser,
  logout,
  getAllUsernames,
  getUsernameErrorText,
  getPasswordErrorText,
  getPlaceErrorText,
  getContactErrorText
};
