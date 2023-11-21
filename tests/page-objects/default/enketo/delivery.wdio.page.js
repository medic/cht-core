const dateOfDeliveryField = () =>
  $('form > section.or-group.or-branch.or-appearance-field-list.current > label:nth-child(6) > div > input');
const babyNameField = () =>
  $(`input[type="text"][name="/delivery/babys_condition/baby_repeat/baby_details/baby_name"]`);

const setDeliveryOutcomeDateOfDelivery = async (value) => {
  const dateOfDelivery = await dateOfDeliveryField();
  await dateOfDelivery.waitForDisplayed();
  await dateOfDelivery.setValue(value);
};

const setDeliveryBabyName = async (value) => {
  const babyName = await babyNameField(value);
  await babyName.waitForDisplayed();
  await babyName.setValue(value);
};

module.exports = {
  setDeliveryOutcomeDateOfDelivery,
  setDeliveryBabyName,
};
