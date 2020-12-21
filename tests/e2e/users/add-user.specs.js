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

  it('should add user with valid password', async() => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm(addedUser, fullName, 'StrongP@ssword1');
    await addUserModal.submit();
    browser.wait(() => {
      return element(by.css('#edit-user-profile')).isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          return true;
        });
    }, 20000);

    helper.waitUntilReady(await usersPage.getUsersList());
    expect(helper.isTextDisplayed(addedUser)).toBe(true);
    expect(helper.isTextDisplayed(fullName)).toBe(true);
  });

  it('should reject passwords shorter than 8 characters', async() => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', 'short');
    await addUserModal.submit();
    await addUserModal.expectErrorMessagePassword('The password must be at least 8 characters long.');
    await addUserModal.cancel();
  });

  it('should reject weak passwords', async() => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', 'weakPassword');
    await addUserModal.submit();
    await addUserModal.expectErrorMessagePassword('The password is too easy to guess.');
    await addUserModal.cancel();
  });

  it('should reject non-matching passwords', async() => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', '%4wbbygxkgdwvdwT65', 'otherpass');
    await addUserModal.submit();
    await addUserModal.expectErrorMessagePassword('Passwords must match');
    await addUserModal.cancel();
  });

  it('should require password', async() => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('user0', 'Not Saved', '');
    await addUserModal.submit();
    await addUserModal.expectErrorMessagePassword('required');
    await addUserModal.cancel();
  });

  it('should require username', async () => {
    browser.sleep(10000);
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('', 'Not Saved', '%4wbbygxkgdwvdwT65');
    await addUserModal.submit();
    await addUserModal.expectErrorMessageUserName('required');
    await addUserModal.cancel();
  });

  it('should require place and contact for restricted user', async() => {
    await usersPage.openAddUserModal();
    await addUserModal.fillForm('restricted', 'Not Saved', '%4wbbygxkgdwvdwT65');
    helper.selectDropdownByValue(element(by.id('role')), 'string:district_admin');
    await addUserModal.submit();
    await addUserModal.requireFacility();
    await addUserModal.requireContact();
    await addUserModal.cancel();
  });
});
