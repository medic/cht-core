const genericForm = require('./generic-form.wdio.page');

const FORM = 'form[data-form-id="add_chw"]';

const contactName = () => $(`${FORM} input[name="/add_chw/chw_profile/name"]`);
const contactPhone = () => $(`${FORM} input[name="/add_chw/chw_profile/phone"]`);

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

const submitForm = async ({
  name: nameValue,
  phone: phoneValue,
} = {}) => {
  await setName(nameValue);
  await setPhone(phoneValue);
  await genericForm.submitForm();
};

module.exports = {
  submitForm,
};
