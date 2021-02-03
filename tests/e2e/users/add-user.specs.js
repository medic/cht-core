const utils = require('../../utils');
const usersPage = require('../../page-objects/users/users.po.js');
const helper = require('../../helper');
const addUserModal = require('../../page-objects/users/add-user-modal.po.js');

const addedUser = 'fulltester' + new Date().getTime();
const fullName = 'Bede Ngaruko';
const errorMessagePassword = element(by.css('#edit-password ~ .help-block'));

describe('Add user  : ', () => {

  it('should add user with valid password', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm(addedUser, fullName, 'StrongP@ssword1');
    await addUserModal.submit();
    await helper.waitForTextDisplayed(addedUser);
    await helper.waitForTextDisplayed(fullName);
    expect(await helper.isTextDisplayed(addedUser)).toBe(true);
    expect(await helper.isTextDisplayed(fullName)).toBe(true);
    const userPath = `/_users/org.couchdb.user:${addedUser}`;
    const doc = await utils.requestNative(userPath);
    await utils.requestNative({
      path: `${userPath}?rev=${doc._rev}`,
      method: 'DELETE'
    });
  });

  it('should reject passwords shorter than 8 characters', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', 'short');
    await addUserModal.submit();
    expect(await errorMessagePassword.getText()).toBe('The password must be at least 8 characters long.');
    await element(by.css('button.cancel.close')).click();
  });

  it('should reject weak passwords', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', 'weakPassword');
    await addUserModal.submit();
    expect(await errorMessagePassword.getText()).toContain('The password is too easy to guess.');
    await element(by.css('button.cancel.close')).click();
  });

  it('should reject non-matching passwords', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', '%4wbbygxkgdwvdwT65');
    await element(by.id('edit-password-confirm')).sendKeys('abc');
    await addUserModal.submit();
    expect(await errorMessagePassword.getText()).toMatch('Passwords must match');
    await element(by.css('button.cancel.close')).click();
  });

  it('should require password', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', '');
    await addUserModal.submit();
    expect(await errorMessagePassword.getText()).toContain('required');
    await element(by.css('button.cancel.close')).click();
  });

  it('should require username', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('', 'Not Saved', '%4wbbygxkgdwvdwT65');
    await addUserModal.submit();
    const errorMessageUserName = element.all(by.css('span.help-block.ng-binding')).get(0);
    await helper.waitUntilReadyNative(errorMessageUserName);
    expect(await errorMessageUserName.getText()).toContain('required');
    await element(by.css('button.cancel.close')).click();
  });

  it('should require place and contact for restricted user', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('restricted', 'Not Saved', '%4wbbygxkgdwvdwT65');
    await helper.selectDropdownByValue(element(by.id('role')), 'string:district_admin');
    await addUserModal.submit();
    expect(await element(by.css('#facilitySelect ~ .help-block')).getText()).toContain('required');
    expect(await element(by.css('#contactSelect ~ .help-block')).getText()).toContain('required');
    await element(by.css('button.cancel.close')).click();
  });
});
