const genericForm = require('./generic-form.wdio.page');

const FORM = 'form[data-form-id="new_person_user_create"]';

const contactName = () => $(`${FORM} input[name="/new_person_user_create/new_contact/contact_details/contact_name"]`);
const contactPhone = () => $(`${FORM} input[name="/new_person_user_create/new_contact/contact_details/contact_phone"]`);
const contactRole = (value) => $(`${FORM} 
  input[name="/new_person_user_create/new_contact/contact_details/contact_role"][value="${value}"]`);

const setName = async (nameValue = 'Ron') => {
  const name = await contactName();
  await name.waitForDisplayed();
  await name.setValue(nameValue);
};

const setPhone = async (phoneValue = '+40755696969') => {
  const phone = await contactPhone();
  await phone.waitForDisplayed();
  await phone.setValue(phoneValue);
};

const selectRole = async (roleValue = 'chw') => {
  const role = await contactRole(roleValue);
  await role.waitForClickable();
  await role.click();
};

const submitForm = async ({
  name: nameValue,
  phone: phoneValue,
  role: roleValue,
} = {}) => {
  await setName(nameValue);
  await setPhone(phoneValue);
  await selectRole(roleValue);
  await genericForm.submitForm();
};

module.exports = {
  submitForm,
};
