const { browser } = require('protractor');
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
      console.log('not translated...', text);
      browser.refresh();
      console.log('waiting for translation ...');
      browser.wait(EC.textToBePresentInElement(helpText, 'This is what you will use to log in to the app.'), 10000);
      
    }
    console.log('got text ...', text);
    
  }).catch(error => console.log('translations taking too long...', error));
};

module.exports = {
  waitForTranslations,
  submit: async () => {
    await helper.waitUntilReady(getSubmitButton());
    await getSubmitButton().click();
  },

  cancel: () => {
    helper.waitUntilReady(getCancelButton());
    getCancelButton().click();
  },
  
  expectErrorMessage :(element, message) => {
    const EC = protractor.ExpectedConditions;
    helper.getTextFromElement(element, 12000).then(text =>{
      if (text === ''){
        console.log('waiting for translation ...');
        browser.wait(EC.textToBePresentInElement(element, message), 10000);
      }
      expect(text).toMatch(message);
    }).catch(error => error);

  },

  fillForm: async (username, fullName, password) => {
    await helper.waitUntilReady(getSubmitButton()); // wait for form to load
    await getUsernameField().sendKeys(username);
    await getFullNameField().sendKeys(fullName);
    await getEmailField().sendKeys('bede@mobile.org');
    await getPhoneField().sendKeys('0064212134566');
    await helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    await helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    await getPasswordField().sendKeys(password);
    await getConfirmPasswordField().sendKeys(password);
  }
};
