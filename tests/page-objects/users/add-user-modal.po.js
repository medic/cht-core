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
  submit: async () => {
    await helper.waitUntilReady(getSubmitButton());
    await getSubmitButton().click();
  },

  cancel: async() => {
    await helper.waitUntilReady(getCancelButton());
    await getCancelButton().click();
  },

  fillForm: async(username, fullName, password, confirmPass=password) => {
    await helper.waitUntilReady(getSubmitButton()); // wait for form to load
    await getUsernameField().sendKeys(username);
    await getFullNameField().sendKeys(fullName);
    await getEmailField().sendKeys('tester@mobile.org');
    await getPhoneField().sendKeys('0064212134566');
    await helper.selectDropdownByValue(getLanguageField(), 'en', 2);
    await helper.selectDropdownByValue(getRoleField(), 'string:national_admin');
    await getPasswordField().sendKeys(password);
    await getConfirmPasswordField().sendKeys(confirmPass);
  },

  expectErrorMessagePassword: async(errorMessage) =>{
    return await helper.getTextFromElement(errorMessagePassword).then(text =>
      expect(text).toContain(errorMessage));
  },

  expectErrorMessageUserName: async (errorMessage) =>{
    return await helper.getTextFromElement(errorMessageUserName).then(text =>
      expect(text).toContain(errorMessage));
  },

  requireFacility :async () => {
    return await helper.getTextFromElement(facilitySelector).then(text =>
      expect(text).toContain('required'));
  },

  requireContact :async () => {
    return await helper.getTextFromElement(contactSelector).then(text =>
      expect(text).toContain('required'));
  },

};
