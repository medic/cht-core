const utils = require('../../utils');
const usersPage = require('../../page-objects/users/users.po.js');
const helper = require('../../helper');
const addUserModal = require('../../page-objects/users/add-user-modal.po.js');

const addedUser = 'fulltester';
const fullName = 'Full Tester';
const errorMessagePassword = element(by.css('#edit-password ~ .help-block'));
const waitForLoaderToDisappear = () => {
  helper.handleUpdateModal();
  try {
    helper.waitElementToDisappear(by.css('.loader'), 20000);
  } catch(err) {
    helper.handleUpdateModal();
    // element can go stale
  }
};

describe('Add user  : ', () => {
  beforeEach(utils.beforeEach);
  afterAll(done =>
    utils.request(`/_users/${addedUser}`)
      .then(doc => utils.request({
        path: `/_users/${addedUser}?rev=${doc._rev}`,
        method: 'DELETE'
      }))
      .catch(() => {}) // If this fails we don't care
      .then(() => utils.afterEach(done)));

  it('should add user with valid password', () => {
    helper.handleUpdateModal();
    usersPage.waitForPageToLoad();
    usersPage.openAddUserModal();
    addUserModal.fillForm(addedUser, fullName, 'StrongP@ssword1');
    addUserModal.submit();
    waitForLoaderToDisappear();
    browser.wait(() => {
      return element(by.css('#edit-user-profile')).isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          return true;
        });
    }, 3000);
    usersPage.expectUser(1,addedUser, fullName);
  });

  it('should reject passwords shorter than 8 characters', () => {
    usersPage.openAddUserModal();
    //usersPage.waitForTranslations();
    addUserModal.fillForm('user0', 'Not Saved', 'short');
    addUserModal.submit();
    addUserModal.expectErrorMessage(errorMessagePassword,'The password must be at least 8 characters long.');
    element(by.css('button.cancel.close')).click();
  });

  it('should reject weak passwords', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', 'weakPassword');
    addUserModal.submit();
    addUserModal.expectErrorMessage(errorMessagePassword,'The password is too easy to guess.');
    element(by.css('button.cancel.close')).click();
  });

  it('should reject non-matching passwords', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', '%4wbbygxkgdwvdwT65');
    element(by.id('edit-password-confirm')).sendKeys('abc');
    addUserModal.submit();
    addUserModal.expectErrorMessage(errorMessagePassword,'Passwords must match');
    element(by.css('button.cancel.close')).click();
  });

  it('should require password', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('user0', 'Not Saved', '');
    addUserModal.submit();
    addUserModal.expectErrorMessage(errorMessagePassword, 'required');
    element(by.css('button.cancel.close')).click();
  });

  it('should require username', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('', 'Not Saved', '%4wbbygxkgdwvdwT65');
    addUserModal.submit();
    const errorMessageUserName = element.all(by.css('span.help-block.ng-binding')).get(0);
    helper.waitUntilReady(errorMessageUserName);
    addUserModal.expectErrorMessage(errorMessageUserName,'required');
    element(by.css('button.cancel.close')).click();
  });

  it('should require place and contact for restricted user', () => {
    usersPage.openAddUserModal();
    addUserModal.fillForm('restricted', 'Not Saved', '%4wbbygxkgdwvdwT65');
    helper.selectDropdownByValue(element(by.id('role')), 'string:district_admin');
    addUserModal.submit();
    addUserModal.expectErrorMessage(element(by.css('#facilitySelect ~ .help-block')),'required');
    addUserModal.expectErrorMessage(element(by.css('#contactSelect ~ .help-block')), 'required');
    element(by.css('button.cancel.close')).click();
  });
});
