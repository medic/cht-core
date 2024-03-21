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
  await commonEnketoPage.selectCheckBox('What is the family\'s source of drinking water?', 'Boreholes');
  await commonEnketoPage.selectRadioButton('Do they have mosquito nets', 'Yes');
  await commonEnketoPage.selectRadioButton('Do they have an hygienic toilet', 'Yes');
  await commonEnketoPage.selectCheckBox('Which method of Family Planning is being used', 'UCID');
  await genericForm.submitForm();
};

const reportCheck =  async (caregiverName, sourceOfWater, mosquitoNet, hygeinicToilet, planningMethod) => {
  const reportName = 'report.add-family-multiple-repeats.clinic';
  expect((await reportsPage.getDetailReportRowContent(`${reportName}.name`))
    .rowValues[0]).to.equal(caregiverName);
  expect((await reportsPage.getDetailReportRowContent(`${reportName}.household_survey.source_of_drinking_water`))
    .rowValues[0]).to.equal(sourceOfWater);
  expect((await reportsPage.getDetailReportRowContent(`${reportName}.household_survey.mosquito_nets`))
    .rowValues[0]).to.equal(mosquitoNet);
  expect((await reportsPage.getDetailReportRowContent(`${reportName}.household_survey.hygeinic_toilet`))
    .rowValues[0]).to.equal(hygeinicToilet);
  expect((await reportsPage.getDetailReportRowContent(`${reportName}.household_survey.family_planning_method`))
    .rowValues[0]).to.equal(planningMethod);
};

module.exports =  {
  submitFamilyForm,
  reportCheck,
};
