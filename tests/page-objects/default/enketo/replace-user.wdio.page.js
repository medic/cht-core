const SEX = {
  female: 'female',
  male: 'male'
};

const adminCodeField = () => $('input[name="/replace_user/intro/admin_code"]');
const fullNameField = () => $('input[name="/replace_user/new_contact/name"]');
const dobUnknownField = () => $('input[name="/replace_user/new_contact/ephemeral_dob/dob_method"]');
const yearsField = () => $('input[name="/replace_user/new_contact/ephemeral_dob/age_years"]');
const sexField = (sex) => $(`input[name="/replace_user/new_contact/sex"][value="${sex}"]`);

const selectAdminCode = async (code) => (await adminCodeField()).setValue(code);
const selectContactFullName = async (name) => (await fullNameField()).setValue(name);
const selectContactDobUnknown = async () => (await dobUnknownField()).click();
const selectContactAgeYears = async (years) => (await yearsField()).setValue(years);
const selectContactSex = async (sex) => (await sexField(sex)).click();

module.exports = {
  selectAdminCode,
  selectContactFullName,
  selectContactDobUnknown,
  selectContactAgeYears,
  selectContactSex,
  SEX
};
