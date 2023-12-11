const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

// Select all the risk factors except the first one, because there is a constraint in the code.
const selectAllRiskFactors = async () => {
  const dangerSignsQuestion = 'Does the woman have any of the following risk factors?';
  await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'More than 4 children');
  await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Last baby born less than 1 year before');
  await commonEnketoPage.selectCheckBox(dangerSignsQuestion,
    'Had previous miscarriages or previous difficulties in childbirth');
  await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Has any of the following conditions:');
  await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'HIV positive');
};

const selectAllDangerSigns = async () => {
  const riskFactorsQuestion = 'Does the woman have any of the following danger signs?';
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Pain or cramping in abdomen');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion,
    'Bleeding or fluid leaking from vagina or vaginal discharge with bad odour');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Severe nausea or vomiting');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Fever of 38 degrees or higher');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Severe headache or new, blurry vision problems');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion,
    'Sudden weight gain or severe swelling of feet, ankles, face, or hands');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion,
    'Less movement and kicking from the baby (after week 20 of pregnancy)');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Blood in the urine or painful, burning urination');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Diarrhea that doesn\'t go away');
};

const submitPregnancy = async () => {
  await commonPage.openFastActionReport('pregnancy');
  await commonEnketoPage.selectRadioButton('Does the woman know the date of the last cycle?', 'No');
  await commonEnketoPage.selectRadioButton('Approximate start date of last cycle', 'between 7 to 8 months ago');
  await genericForm.nextPage();
  await selectAllRiskFactors();
  await genericForm.nextPage();
  await selectAllDangerSigns();
  await genericForm.nextPage();
  await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', 'Test note');
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  selectAllRiskFactors,
  selectAllDangerSigns,
  submitPregnancy,
};
