var helper = require('../../helper'),
    utils = require('../../utils');
//var commonElements = require('../../page-objects/common/common.po.js');
var usersPage = require('../../page-objects/users/users.po.js');
var addUserModal = require('../../page-objects/users/add-user-modal.po.js');

describe('Add user test : ', function () {
  it('should open add user modal', function () {
  browser.driver.get(utils.getBaseUrl() + '/_design/medic/_rewrite/#/configuration/users');
    usersPage.openAddUserModal();
    addUserModal.fillForm();
   addUserModal.submit();
  });
});
