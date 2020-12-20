const utils=require('../../utils');
const usersPage=require('../../page-objects/users/users.po.js');
const helper=require('../../helper');
const addUserModal=require('../../page-objects/users/add-user-modal.po.js');
const addedUser='fulltester';
const fullName='Full Tester';

describe('Add user  : ', () => {
  beforeEach(utils.beforeEach);
  beforeAll(() => {
    helper.handleUpdateModal();
  });
  afterAll(done =>
    utils.request(`/_users/${addedUser}`)
      .then(doc => utils.request({
        path: `/_users/${addedUser}?rev=${doc._rev}`,
        method: 'DELETE'
      }))
      .catch(() => { }) // If this fails we don't care
      .then(() => utils.afterEach(done)));

  it('should add user with valid password', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm(addedUser, fullName, 'StrongP@ssword1');
    addUserModal.submit();
    browser.wait(() => {
      return element(by.css('#edit-user-profile')).isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          return true;
        });
    }, 20000);

    helper.waitUntilReady(usersPage.getUsersList());
    expect(helper.isTextDisplayed(addedUser)).toBe(true);
    expect(helper.isTextDisplayed(fullName)).toBe(true);
  });

  it('should reject passwords shorter than 8 characters', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', 'short');
    addUserModal.submit();
    expect(addUserModal.getErrorMessagePassword()).toBe('The password must be at least 8 characters long.');
    addUserModal.cancel();
  });

  it('should reject weak passwords', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', 'weakPassword');
    addUserModal.submit();
    expect(addUserModal.getErrorMessagePassword()).toContain('The password is too easy to guess.');
    addUserModal.cancel();
  });

  it('should reject non-matching passwords', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', '%4wbbygxkgdwvdwT65');
    element(by.id('edit-password-confirm')).sendKeys('abc');
    addUserModal.submit();
    expect(addUserModal.getErrorMessagePassword()).toMatch('Passwords must match');
    addUserModal.cancel();
  });

  it('should require password', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', '');
    addUserModal.submit();
    expect(addUserModal.getErrorMessagePassword()).toContain('required');
    addUserModal.cancel();
  });

  it('should require username', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('', 'Not Saved', '%4wbbygxkgdwvdwT65');
    addUserModal.submit();
    expect(addUserModal.getErrorMessageUserName()).toContain('required');
    addUserModal.cancel();
  });

  it('should require place and contact for restricted user', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('restricted', 'Not Saved', '%4wbbygxkgdwvdwT65');
    helper.selectDropdownByValue(element(by.id('role')), 'string:district_admin');
    addUserModal.submit();
    expect(addUserModal.getFacilitySelector()).toContain('required');
    expect(addUserModal.getContactSelector()).toContain('required');
    addUserModal.cancel();
  });
});
