const helper = require('../../helper');
const errorMessagePassword = element(by.css('#edit-password ~ .help-block'));
const errorMessageUserName = element(by.css('[test-id="errors-username"]'));
const facilitySelector = element(by.css('#facilitySelect ~ .help-block'));
const contactSelector = element(by.css('#contactSelect ~ .help-block'));

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

const waitForTranslation = (timeout = 50000) => {
  const description=element.all(by.css('.help-block.ng-scope')).first();
  const EC = protractor.ExpectedConditions;
  const usernameHelp = 'This is what you will use to log in to the app.';
  return browser
    .wait(
      EC.textToBePresentInElement(description, usernameHelp),
      timeout,
      'Element taking too long to appear in the DOM.Let us retry'
    )
    .then(() => {
      return description.getText().then(text => {
        if(text === 'user.username.help'){
          console.log('form not yet translated... ' + text);
          return browser.sleep(10000);
        }
        expect(text).toBe(usernameHelp);
      });
    });
};

module.exports = {
  submit:  () => {
    helper.waitUntilReady(getSubmitButton());
    getSubmitButton().click();
  },

  waitForFormToDisappear:() => {
    browser.wait(() => {
      return element(by.css('#edit-user-profile')).isDisplayed()
        .then(isDisplayed => {
          return !isDisplayed;
        })
        .catch(() => {
          return true;
        });
    }, 60000);
  },

  cancel: () => {
    helper.waitUntilReady(getCancelButton());
    getCancelButton().click();
  },

  fillForm: (username, fullName, password, confirmPass=password) => {
    helper.waitUntilReady(getSubmitButton());
    waitForTranslation();
    helper.waitUntilReady(getUsernameField());
    getUsernameField().sendKeys(username);
    getFullNameField().sendKeys(fullName);
    getEmailField().sendKeys('tester@mobile.org');
    getPhoneField().sendKeys('0064212134566');
    helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    getPasswordField().sendKeys(password);
    getConfirmPasswordField().sendKeys(confirmPass);
  },

  expectErrorMessagePassword: (errorMessage) =>{
    return  helper.getTextFromElement(errorMessagePassword).then(text =>
      expect(text).toContain(errorMessage));
  },

  expectErrorMessageUserName:  (errorMessage) =>{
    return  helper.getTextFromElement(errorMessageUserName).then(text =>
      expect(text).toContain(errorMessage));
  },

  requireFacility : () => {
    return  helper.getTextFromElement(facilitySelector).then(text =>
      expect(text).toContain('required'));
  },

  requireContact : () => {
    return  helper.getTextFromElement(contactSelector).then(text =>
      expect(text).toContain('required'));
  },

  waitForTranslation,

};
