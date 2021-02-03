const utils = require('../../utils');
const usersPage = require('../../page-objects/users/users.po.js');
const helper = require('../../helper');
const addUserModal = require('../../page-objects/users/add-user-modal.po.js');

const addedUser = 'fulltester' + new Date().getTime();
const fullName = 'Bede Ngaruko';
const errorMessagePassword = element(by.css('#edit-password ~ .help-block'));

describe('Add user  : ', () => {

  afterAll(async () => {
    const userPath = `/_users/org.couchdb.user:${addedUser}`;
    const doc = await utils.requestNative(userPath);
    await utils.requestNative({
      path: `${userPath}?rev=${doc._rev}`,
      method: 'DELETE'
    });});

  it('should add user with valid password', async () => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm(addedUser, fullName, 'StrongP@ssword1');
    await addUserModal.submit();
    await helper.waitForTextDisplayed(addedUser);
    await helper.waitForTextDisplayed(fullName);
    expect(await helper.isTextDisplayed(addedUser)).toBe(true);
    expect(await helper.isTextDisplayed(fullName)).toBe(true);
  });

  it('should reject passwords shorter than 8 characters', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', 'short');
    addUserModal.submit();
    expect(errorMessagePassword.getText()).toBe('The password must be at least 8 characters long.');
    element(by.css('button.cancel.close')).click();
  });

  it('should reject weak passwords', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', 'weakPassword');
    addUserModal.submit();
    expect(errorMessagePassword.getText()).toContain('The password is too easy to guess.');
    element(by.css('button.cancel.close')).click();
  });

  it('should reject non-matching passwords', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', '%4wbbygxkgdwvdwT65');
    element(by.id('edit-password-confirm')).sendKeys('abc');
    addUserModal.submit();
    expect(errorMessagePassword.getText()).toMatch('Passwords must match');
    element(by.css('button.cancel.close')).click();
  });

  it('should require password', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', '');
    addUserModal.submit();
    expect(errorMessagePassword.getText()).toContain('required');
    element(by.css('button.cancel.close')).click();
  });

  it('should require username', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('', 'Not Saved', '%4wbbygxkgdwvdwT65');
    addUserModal.submit();
    const errorMessageUserName = element.all(by.css('span.help-block.ng-binding')).get(0);
    helper.waitUntilReady(errorMessageUserName);
    expect(errorMessageUserName.getText()).toContain('required');
    element(by.css('button.cancel.close')).click();
  });

  it('should require place and contact for restricted user', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('restricted', 'Not Saved', '%4wbbygxkgdwvdwT65');
    helper.selectDropdownByValue(element(by.id('role')), 'string:district_admin');
    addUserModal.submit();
    expect(element(by.css('#facilitySelect ~ .help-block')).getText()).toContain('required');
    expect(element(by.css('#contactSelect ~ .help-block')).getText()).toContain('required');
    element(by.css('button.cancel.close')).click();
  });
});
