const _ = require('lodash');
const commonElements = require('../common/common.wdio.page');
const addUserButton = () => $('a#add-user');
const cancelButton = () => $('a[test-id="modal-cancel-btn"]');
const addUserDialog = () => $('div#edit-user-profile');
const userName = () => $('#edit-username');
const userFullName = () => $('#fullname');
const userPassword = () => $('#edit-password');
const userConfirmPassword = () => $('#edit-password-confirm');
const saveUserButton = () => $('a[test-id="modal-submit-btn"]');
const logoutButton = () => $('i.fa-power-off');
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
  await commonElements.goToUrl('/admin/#/users');
};

const goToAdminUpgrade = async () => {
  await commonElements.goToUrl('/admin/#/upgrade');
};

const openAddUserDialog = async () => {
  await (await addUserButton()).waitForDisplayed();
  await (await addUserButton()).click();
  await (await addUserDialog()).waitForDisplayed();
  // wait for animations to finish
  await browser.pause(500);
};

const scrollToBottomOfModal = async () => {
  await browser.execute(() => {
    const modalWindow = document.querySelector('.modal');
    modalWindow.scrollTop = modalWindow.scrollHeight;
  });
};

const inputAddUserFields = async (username, fullname, role, places, contact, password, confirmPassword = password) => {
  await (await userName()).setValue(username);
  await (await userFullName()).setValue(fullname);
  await (await $(`#role-select input[value="${role}"]`)).click();

  // we need to scroll to the bottom to bring the select2 elements into view
  // scrollIntoView doesn't work because they're within a scrollable div (the modal)
  await scrollToBottomOfModal();

  if (!_.isEmpty(places)) {
    if (Array.isArray(places)) {
      for (const name of places) {
        await selectPlace([name]);
      }
    } else {
      await selectPlace([places]);
    }
  }

  if (!_.isEmpty(contact)) {
    await selectContact(contact);
  }

  await (await userPassword()).setValue(password);
  await (await userConfirmPassword()).setValue(confirmPassword);
};

const inputUploadUsersFields = async (filePath) => {
  await (await $('input[type="file"]')).addValue(filePath);
};

const setSelect2 = async (id, value) => {
  const input = await $(`span.select2-selection[aria-labelledby=select2-${id}-container]`);
  await input.waitForExist();
  await input.click();

  const searchField = await $(
    `.select2-container--open .select2-search__field`
  );
  await searchField.waitForExist();
  await searchField.setValue(value);

  const option = await $('.name');
  await option.waitForExist();
  await option.waitForClickable();
  await option.click();
};

const setPlaceSelectMultiple = async (value) => {
  const input = await $(`span.select2-selection--multiple`);
  await input.waitForExist();
  await input.click();

  const searchField = await $('span.select2-selection--multiple .select2-search__field');
  await searchField.waitForExist();
  await searchField.setValue(value);

  const option = await $('.name');
  await option.waitForExist();
  await option.waitForClickable();
  await option.click();
  await browser.waitUntil(async () => await (await $('.select2-selection__choice')).isDisplayed(),  1000);
};

const selectPlace = async (places) => {
  for (const place of places) {
    await setPlaceSelectMultiple(place);
  }
};

const selectContact = async (associatedContact) => {
  await setSelect2('contactSelect', associatedContact);
};

const saveUser = async (isSuccessExpected = true)  => {
  await (await saveUserButton()).waitForClickable();
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
  await (await passwordErrorMessage()).waitForDisplayed();
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

const closeAddUserDialog = async () => {
  await (await cancelButton()).waitForClickable();
  await (await cancelButton()).click();
  await (await addUserDialog()).waitForDisplayed({ reverse: true });
};


module.exports = {
  addUserDialog,
  goToAdminUser,
  goToAdminUpgrade,
  openAddUserDialog,
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
  backToUserList,
  closeAddUserDialog,
};
