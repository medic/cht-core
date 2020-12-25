const helper = require('../../helper');

const getAddUserButton = () => {
  return element(by.id('add-user'));
};

const waitPageToLoad = (timeout=12000) => {
  const EC = protractor.ExpectedConditions;
  browser.wait(EC.textToBePresentInElement(element.all(by.css('.col-xs-2.ng-binding')).first(), 'admin'),timeout);
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
    waitPageToLoad();
    helper.waitElementToBeClickable(getAddUserButton());
    helper.clickElement(getAddUserButton());
  },

  getUsersList: () => {
    helper.waitUntilReady(getAddUserButton());
    return  element.all(by.repeater('user in users'));
  },

  expectUser: (username, fullName) => {
    const name = element(by.repeater('user in users').row(1).column('user.name'));
    const fullname = element(by.repeater('user in users').row(1).column('user.fullname'));
    name.getText().then(text => expect(text).toBe(username))
      .catch(error => error);
    fullname.getText().then(text => expect(text).toBe(fullName))
      .catch(error => error);
  },

  waitPageToLoad,
};
