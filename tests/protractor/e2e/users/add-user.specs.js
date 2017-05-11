const utils = require('../../utils'),
  usersPage = require('../../page-objects/users/users.po.js'),
  loginPage = require('../../page-objects/login/login.po.js'),
  common = require('../../page-objects/common/common.po.js'),
  helper = require('../../helper'),
  addUserModal = require('../../page-objects/users/add-user-modal.po.js');

const addedUser = 'bedetester2020', fullName = 'Bede Ngaruko';

describe('Add user test : ', function() {
  it('should open add user modal', function() {
    loginPage.login('admin', 'pass');
    common.goToConfiguration();
    browser.get(utils.getBaseUrl() + '/_design/medic/_rewrite/#/configuration/users');
    usersPage.openAddUserModal();
    addUserModal.fillForm(addedUser, fullName);
    addUserModal.submit();
    expect(helper.isTextDisplayed(addedUser));
    expect(helper.isTextDisplayed(fullName));
  });
});
