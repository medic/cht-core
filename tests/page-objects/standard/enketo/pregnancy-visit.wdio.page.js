const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const selectAllDangerSigns = async (userName, patientName) => {
  const riskFactorsQuestion = `Confirm with ${userName} if ${patientName} has any of the following danger signs.`;
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Pain, pressure or cramping in abdomen');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion,
    'Bleeding or fluid leaking from vagina or vaginal discharge with bad od');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Severe nausea or vomiting');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Fever of 38 degrees or higher');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Severe headache or new, blurry vision problems');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion,
    'Sudden weight gain or severe swelling of feet, ankles, face, or hands');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Less movement and kicking from the baby');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Blood in the urine or painful, burning urination');
  await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Diarrhea that doesn\'t go away');
};

const submitPregnancyVisit = async (userName, patientName) => {
  await commonPage.openFastActionReport('pregnancy_visit');
  await selectAllDangerSigns(userName, patientName);
  await genericForm.nextPage();
  await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', 'Test note');
  await genericForm.nextPage();
  await genericForm.submitForm();
};

module.exports = {
  selectAllDangerSigns,
  submitPregnancyVisit,
};
