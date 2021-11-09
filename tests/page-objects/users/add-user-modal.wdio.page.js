const getUsernameField = () => $('#edit-username');

const getFullNameField = () => $('#fullname');

const getPhoneField = () => $('#phone');

const getEmailField = () => $('#email');

const getRoleField = () => $('#role');

const getPasswordField = () => $('#edit-password');

const getConfirmPasswordField = () => $('#edit-password-confirm');
const getSubmitButton = () => $('.btn.submit.btn-primary:not(.ng-hide)');

const getCancelButton = () => $('.btn cancel');
const closeButton = () => $('button.cancel.close');
const errorMessageUserName = () => $$('span.help-block.ng-binding');
const errorMessagePassword = () => $('#edit-password ~ .help-block');

module.exports = {
  closeButton,
  errorMessageUserName,
  errorMessagePassword,
  submit: async () => {
    await (await getSubmitButton()).waitForClickable();
    await (await getSubmitButton()).click();
  },

  cancel: async () => {
    await (await getCancelButton()).waitForClickable();
    await (await getCancelButton()).click();
  },

  fillForm: async (username, fullName, password) => {
    await (await getSubmitButton()).waitForClickable(); // wait for form to load
    await (await getUsernameField()).setValue(username);
    await (await getFullNameField()).setValue(fullName);
    await (await getEmailField()).setValue('bede@mobile.org');
    await (await getPhoneField()).setValue('0064212134566');
    await (await getRoleField()).selectByAttribute('value', 'string:national_admin');
    await (await getPasswordField()).setValue(password);
    await (await getConfirmPasswordField()).setValue(password);
  }
};
