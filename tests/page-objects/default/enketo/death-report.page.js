const moment = require('moment');
const genericForm = require('./generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const submitDeathReport = async ({
  deathDate: deathDateValue = moment().format('YYYY-MM-DD'),
  deathPlace: deathPlaceValue = 'Health facility',
  deathInformation: deathInformationValue = 'Test note'
} = {}) => {
  await commonEnketoPage.selectRadioButton('Place of death', deathPlaceValue);
  await commonEnketoPage.setTextareaValue('Provide any relevant information related to the death of',
    deathInformationValue);
  await commonEnketoPage.setDateValue('Date of Death', deathDateValue);
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  submitDeathReport,
};
