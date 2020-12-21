const helper = require('../../helper');
const utils = require('../../utils');

const getAddUserButton = () => {
  return element(by.id('add-user'));
};

module.exports = {
  addUser: (username, password) => {
    username.trim();
    password.trim();
    helper.waitUntilReady(getAddUserButton());
  },

  editUser: (username, password) => {
    username.trim();
    password.trim();
    helper.waitUntilReady(getAddUserButton());
  },

  deleteUser: (username, password) => {
    username.trim();
    password.trim();
    helper.waitUntilReady(getAddUserButton());
  },

  openAddUserModal: () => {
    browser.get(utils.getAdminBaseUrl() + 'users');
    helper.waitElementToBeClickable(getAddUserButton());
    getAddUserButton().click();
    browser.waitForAngular();
  },

  getUsersList: () => {
    helper.waitUntilReady(getAddUserButton());
    return element.all(by.repeater('user in users'));
  }
};
