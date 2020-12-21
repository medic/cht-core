const helper = require('../../helper');
const utils = require('../../utils');

const getAddUserButton = () => {
  return element(by.id('add-user'));
};

module.exports = {
  addUser: async(username, password) => {
    username.trim();
    password.trim();
    await helper.waitUntilReady(getAddUserButton());
  },

  editUser: async(username, password) => {
    username.trim();
    password.trim();
    await helper.waitUntilReady(getAddUserButton());
  },

  deleteUser: async (username, password) => {
    username.trim();
    password.trim();
    await helper.waitUntilReady(getAddUserButton());
  },

  openAddUserModal: async() => {
    await browser.get(utils.getAdminBaseUrl() + 'users');
    await helper.waitElementToBeClickable(getAddUserButton());
    await getAddUserButton().click();
  },

  getUsersList: async() => {
    await helper.waitUntilReady(getAddUserButton());
    return await element.all(by.repeater('user in users'));
  }
};
