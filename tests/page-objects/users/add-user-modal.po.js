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
    helper.waitUntilReady(getSubmitButton()); // wait for form to load
    getUsernameField().sendKeys(username);
    getFullNameField().sendKeys(fullName);
    getEmailField().sendKeys('tester@mobile.org');
    getPhoneField().sendKeys('0064212134566');
    helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    getPasswordField().sendKeys(password);
    getConfirmPasswordField().sendKeys(password);
  },

  expectErrorMessagePassword: async(errorMessage) =>{
    return await errorMessagePassword.getText().then(text =>
      expect(text).toContain(errorMessage));
  },

  expectErrorMessageUserName: async (errorMessage) =>{
    return await errorMessageUserName.getText().then(text =>
      expect(text).toContain(errorMessage));
  },

  requireFacility :async () => {
    return await facilitySelector.getText().then(text =>
      expect(text).toContain('required'));
  },

  requireContact :async () => {
    return await contactSelector.getText().then(text =>
      expect(text).toContain('required'));
  },
  
};
