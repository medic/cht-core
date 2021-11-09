const utils = require('../../utils');
const commonElements = require('../common/common.wdio.page');

const getAddUserButton = () => $('#add-user');

module.exports = {
  addUser: async (username, password) => {
    username.trim();
    password.trim();
    await (await getAddUserButton()).waitForClickable();
  },

  editUser: async (username, password) => {
    username.trim();
    password.trim();
    await (await getAddUserButton()).waitForClickable();
  },

  deleteUser: async (username, password) => {
    username.trim();
    password.trim();
    await (await getAddUserButton()).waitForClickable();
  },

  openAddUserModal: async () => {
    await browser.url(utils.getAdminBaseUrl() + 'users');
    await commonElements.waitForLoaders();
    await (await getAddUserButton()).waitForClickable();
    await (await getAddUserButton()).click();
  },

  getUsersList: async () => {
    await (await getAddUserButton()).waitForClickable();
    return  await $$('[test-id="user-list"]');
  }
};
