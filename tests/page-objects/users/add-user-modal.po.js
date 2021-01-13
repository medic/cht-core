const helper = require('../../helper');

const getUsernameField = () => {
  return element(by.id('edit-username'));
};

const getFullNameField = () => {
  return element(by.id('fullname'));
};

const getPhoneField = () => {
  return element(by.id('phone'));
};

const getEmailField = () => {
  return element(by.id('email'));
};
const getLanguageField = () => {
  return element(by.id('language'));
};

const getRoleField = () => {
  return element(by.id('role'));
};

const getPasswordField = () => {
  return element(by.id('edit-password'));
};

const getConfirmPasswordField = () => {
  return element(by.id('edit-password-confirm'));
};
const getSubmitButton = () => {
  return element(by.css('.btn.submit.btn-primary:not(.ng-hide)'));
};

const getCancelButton = () => {
  return element(by.className('btn cancel'));
};

const waitForTranslations = (timeout =10000) => {
  helper.handleUpdateModal();
  const EC = protractor.ExpectedConditions;
  const helpText = element.all(by.css('.help-block.ng-scope')).first();
  helper.getTextFromElement(helpText, timeout).then(text =>{
    if (text === 'user.username.help'){
      console.log('waiting for translation ...');
      browser.wait(EC.textToBePresentInElement(helpText, 'Thisis what you will use to log in to the app.'), 10000);
    }
  }).catch(error => console.log('translations taking too long...', error));
};

module.exports = {
  submit: () => {
    helper.waitUntilReady(getSubmitButton());
    getSubmitButton().click();
  },

  cancel: () => {
    helper.waitUntilReady(getCancelButton());
    getCancelButton().click();
  },

  fillForm: (username, fullName, password) => {
    waitForTranslations();
    helper.waitUntilReady(getSubmitButton()); // wait for form to load
    getUsernameField().sendKeys(username);
    getFullNameField().sendKeys(fullName);
    getEmailField().sendKeys('bede@mobile.org');
    getPhoneField().sendKeys('0064212134566');
    helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    getPasswordField().sendKeys(password);
    getConfirmPasswordField().sendKeys(password);
  },

  expectErrorMessage :(element, message) => {
    const EC = protractor.ExpectedConditions;
    helper.getTextFromElement(element, 12000).then(text =>{
      if (text === ''){
        console.log('waiting for translation ...');
        browser.wait(EC.textToBePresentInElement(element, message), 5000);
      }
    }).catch(error => error);
  },
};
