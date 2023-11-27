const genericForm = require('./generic-form.wdio.page');
const reportsPage = require('../reports/reports.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const submitFamilyForm = async () => {
  await commonEnketoPage.setInputValue('Names', 'test');
  await genericForm.nextPage();
  await commonEnketoPage.setInputValue('Primary Mobile Number', '+13125551212');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Sex', 'Male');
  await commonEnketoPage.setInputValue('Age', '20');
  await genericForm.nextPage();
  await commonEnketoPage.setInputValue('How many children under 5 are in the family of test?', '2');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Do you want to register children now?', 'No');
  await genericForm.nextPage();
  await commonEnketoPage.setInputValue('How many women aged between 15 and 49 are in the family of test?', '2');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Do you want to register women 15-49 now?', 'No');
  await genericForm.nextPage();
  await commonEnketoPage.selectCheckBox('Boreholes');
  await commonEnketoPage.selectRadioButton('Do they have mosquito nets', 'Yes');
  await commonEnketoPage.selectRadioButton('Do they have an hygienic toilet', 'Yes');
  await commonEnketoPage.selectCheckBox('UCID');
  await reportsPage.submitForm();
};

const reportCheck =  async (
  caregiverName,
  sourceOfWater,
  mosquitoNet,
  hygeinicToilet,
  planningMethod
) => {
  const savedParameters = await $$('.details>ul>li');

  // Primary Caregiver
  expect((await savedParameters[2].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.name' + caregiverName
  );
  // Source of water
  expect((await savedParameters[6].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.source_of_drinking_water' +
      sourceOfWater
  );
  // Mosquito net
  expect((await savedParameters[7].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.mosquito_nets' + mosquitoNet
  );
  // Hygeinic toilet
  expect((await savedParameters[8].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.hygeinic_toilet' + hygeinicToilet
  );
  // Planning method
  expect((await savedParameters[9].getText()).replace(/[\n]/g, '')).to.equal(
    'report.add-family.clinic.household_survey.family_planning_method' +
      planningMethod
  );
};

module.exports =  {
  submitFamilyForm,
  reportCheck,
};
