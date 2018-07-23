const utils = framework.utils;

let users = new framework.TEST_OBJECT({
  openAddUserModal: function () {
    browser.driver.navigate().refresh();
    browser.get(utils.getAdminBaseUrl() + 'users');
    this.el.addUserBtn.waitElementToBeClickableAndClick();
  },

  addUser: function (username, password) => {
    username.trim();
    password.trim();
    this.el.addUserBtn.waitUntilReady();
  },

  editUser: function (username, password) => {
    username.trim();
    password.trim();
    this.el.addUserBtn.waitUntilReady();
  },

  deleteUser: function (username, password) => {
    username.trim();
    password.trim();
    this.el.addUserBtn.waitUntilReady();
  },

  getUsersList: function () => {
    this.el.addUserBtn.waitUntilReady();
    return element.all(by.repeater('user in users'));
  },

  locators: {
    addUserBtn:        {id: 'add-user'},
  }
});

module.exports = users;