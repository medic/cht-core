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
    helper.handleUpdateModal();
    browser.get(utils.getAdminBaseUrl() + 'users');
    helper.waitElementToBeClickable(getAddUserButton());
    getAddUserButton().click();
  },
  
  waitForPageToLoad: (timeout =10000) => {
    helper.handleUpdateModal();
    helper.getTextFromElement(element(by.css('.loading-status')), timeout)
      .then(text =>expect(text).toBe('No messages found')).catch();
  },

  getUsersList: () => {
    helper.waitUntilReady(getAddUserButton());
    return element.all(by.repeater('user in users'));
  },

  expectUser: (number,name,fullname) => {
    helper.waitUntilReady(getAddUserButton());
    helper.waitUntilReady(element(by.css('.container-fluid')));
    const username = element(by.repeater('user in users').row(number).column('user.name'));
    const fullName = element(by.repeater('user in users').row(number).column('user.fullname'));
    username.getText().then(text => expect(text).toBe(name)).catch();
    fullName.getText().then(text => expect(text).toBe(fullname)).catch();
  },
};
