const _ = require('lodash');
const commonElements = require('../common/common.wdio.page');
const addUserButton = () => $('a#add-user');
const cancelUserModalButton = () => $('[test-id="modal-cancel-btn"]');
const addUserDialog = () => $('div#edit-user-profile');
const userName = () => $('#edit-username');
const userFullName = () => $('#fullname');
const userPassword = () => $('#edit-password');
const userConfirmPassword = () => $('#edit-password-confirm');
const saveUserButton = () => $('//a[@test-id="modal-submit-btn"]');
const logoutButton = () => $('i.fa-power-off');
const select2Name = () => $('.name');
const usernameTextSelector = '[test-id="username-list"]';
const usernameText = () => $(usernameTextSelector);
const usernameTextList = () => $$(usernameTextSelector);
const usernameErrorMessage = () => $('span.help-block.ng-binding');
const passwordErrorMessage = () => $('#edit-password ~ .help-block');
const placeErrorMessage = () => $('#facilitySelect ~ .help-block');
const contactErrorMessage = () => $('#contactSelect ~ .help-block');
const uploadUsersButton = () => $('a#add-users');
const uploadUsersDialog = () => $('div#bulk-user-upload');
const confirmUploadUsersButton = () => $('a#upload-btn');
const uploadSummaryDialog = () => $('#finish-summary');
const successfulyUploadedUsers = () => $('p.text-success');
const previouslyUploadedUsers = () => $('p.text-muted');
const failedUploadedUsers = () => $('p.text-danger');
const backToUserListButton = () => $('a#back-to-app-btn');

const goToAdminUser = async () => {
  await browser.url('/admin/#/users');
};

const goToAdminUpgrade = async () => {
  await browser.url('/admin/#/upgrade');
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
  await (await $(`#role-select input[value="${role}"]`)).click();

  if (!_.isEmpty(place)) {
    await selectPlace(place);
  }

  if (!_.isEmpty(associatedContact)) {
    await selectContact(associatedContact);
  }

  await (await userPassword()).addValue(password);
  await (await userConfirmPassword()).addValue(confirmPassword);
};

const inputUploadUsersFields = async (filePath) => {
  await (await $('input[type="file"]')).setValue(filePath);
};

const setSelect2 = async (id, value) => {
  // During upgrade to WDIO v8 something broke the click event on the select2 dropdown.
  // Replacing with this fixes the problem but isn't testing actually clicking on the elem
  // so it's not ideal. This should be fixed one day.
  await browser.execute((id) => {
    $(id).select2('open');
  }, id);

  const searchField = await $('.select2-search__field');
  await searchField.waitForExist();
  await searchField.setValue(value);

  await (await select2Name()).click();
};

const selectPlace = async (place) => {
  await setSelect2('#facilitySelect', place);
};

const selectContact = async (associatedContact) => {
  await setSelect2('#contactSelect', associatedContact);
};

const saveUser = async (isSuccessExpected = true)  => {
  await (await saveUserButton()).waitForDisplayed();
  await (await saveUserButton()).click();
  if (isSuccessExpected) {
    await (await addUserDialog()).waitForDisplayed({ reverse: true });
  }
};

const uploadUsers = async () => {
  await (await confirmUploadUsersButton()).waitForDisplayed();
  await (await confirmUploadUsersButton()).click();
};

const logout = async () => {
  await (await logoutButton()).waitForDisplayed();
  await (await logoutButton()).click();
};

const getAllUsernames = async () => {
  await (await usernameText()).waitForDisplayed();
  return commonElements.getTextForElements(usernameTextList);
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

const getSuccessfulyUploadedUsers = async () => {
  return await (await successfulyUploadedUsers()).getText();
};

const getPreviouslyUploadedUsers = async () => {
  return await (await previouslyUploadedUsers()).getText();
};

const getFailedUploadedUsers = async () => {
  return await (await failedUploadedUsers()).getText();
};

const backToUserList = async () => {
  await (await backToUserListButton()).waitForDisplayed();
  await (await backToUserListButton()).click();
};

const openUploadUsersDialog = async () => {
  await (await uploadUsersButton()).waitForDisplayed();
  await (await uploadUsersButton()).click();
  await (await uploadUsersDialog()).waitForDisplayed();
  // wait for animations to finish
  await browser.pause(500);
};

const waitForUploadSummary = async () => {
  await (await uploadSummaryDialog()).waitForDisplayed();
};

module.exports = {
  goToAdminUser,
  goToAdminUpgrade,
  openAddUserDialog,
  closeUserDialog,
  inputAddUserFields,
  saveUser,
  logout,
  getAllUsernames,
  getUsernameErrorText,
  getPasswordErrorText,
  getPlaceErrorText,
  getContactErrorText,
  openUploadUsersDialog,
  inputUploadUsersFields,
  uploadUsers,
  waitForUploadSummary,
  getSuccessfulyUploadedUsers,
  getPreviouslyUploadedUsers,
  getFailedUploadedUsers,
  backToUserList
};
