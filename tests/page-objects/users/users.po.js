const helper = require('../../helper');

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

  deleteUser:  (username, password) => {
    username.trim();
    password.trim();
    helper.waitUntilReady(getAddUserButton());
  },

  openAddUserModal: () => {
    helper.waitElementToBeClickable(getAddUserButton());
    getAddUserButton().click();
    browser.wait(helper.isTextDisplayed('This is what you will use to log in to the app.'), 5000);
  },

  getUsersList: () => {
    helper.waitUntilReady(getAddUserButton());
    return  element.all(by.repeater('user in users'));
  },
};
