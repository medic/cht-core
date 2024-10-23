const commonPage = require('@page-objects/default/common/common.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const moment = require('moment/moment');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

const submitAddChwForm = async ({
  name: nameValue = 'Ron',
  phone: phoneValue = '+40755696969',
} = {}) => {
  await commonPage.openFastActionReport('add_chw');
  await commonEnketoPage.setInputValue('Name', nameValue);
  await commonEnketoPage.setInputValue('Phone Number', phoneValue);
  await genericForm.submitForm();
};

const submitReplaceUserForm = async (formID) => {
  await commonPage.openFastActionReport(formID);
  await commonEnketoPage.setInputValue('Admin Code', '1234');
  await genericForm.nextPage();
  await commonEnketoPage.setInputValue('Full name', 'Replacement User');
  await commonEnketoPage.selectRadioButton('Sex', 'Female');
  await commonEnketoPage.setDateValue('Age', moment().subtract(22, 'years').format('YYYY-MM-DD'));
  await genericForm.nextPage();
  await genericForm.submitForm();
};

const submitBasicForm = async () => {
  await commonPage.openFastActionReport('basic_form', false);
  await genericForm.submitForm();
  return reportsPage.getCurrentReportId();
};


module.exports = {
  submitAddChwForm,
  submitReplaceUserForm,
  submitBasicForm,
};
