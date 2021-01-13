const helper = require('../../helper');
const utils = require('../../utils');

const getAddUserButton = () => {
  return element(by.id('add-user'));
};

const waitForTranslations = (timeout =10000) => {
  helper.handleUpdateModal();
  const EC = protractor.ExpectedConditions;
  const helpText = element.all(by.css('.help-block.ng-scope')).first();
  helper.getTextFromElement(helpText, timeout).then(text =>{
    if (text === 'user.username.help'){
      console.log('not translated...', text);
      //browser.refresh();
      console.log('waiting for translation ...');
      browser.wait(EC.textToBePresentInElement(helpText, 'This is what you will use to log in to the app.'), 10000);
      
    }
    console.log('got text ...', text);
    
  }).catch(error => console.log('translations taking too long...', error));
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
    waitForTranslations();
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
