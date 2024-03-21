const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const selectAllDangerSignsPregnancy = async (answer = 'Yes') => {
  await commonEnketoPage.selectRadioButton('Vaginal bleeding', answer);
  await commonEnketoPage.selectRadioButton('Fits', answer);
  await commonEnketoPage.selectRadioButton('Severe abdominal pain', answer);
  await commonEnketoPage.selectRadioButton('Severe headache', answer);
  await commonEnketoPage.selectRadioButton('Very pale', answer);
  await commonEnketoPage.selectRadioButton('Fever', answer);
  await commonEnketoPage.selectRadioButton('Reduced or no fetal movements', answer);
  await commonEnketoPage.selectRadioButton('Breaking of water', answer);
  await commonEnketoPage.selectRadioButton('Getting tired easily', answer);
  await commonEnketoPage.selectRadioButton('Swelling of face and hands', answer);
  await commonEnketoPage.selectRadioButton('Breathlessness', answer);
};

const selectAllDangerSignsDelivery = async (answer = 'Yes') => {
  await commonEnketoPage.selectRadioButton('Fever', answer);
  await commonEnketoPage.selectRadioButton('Severe headache', answer);
  await commonEnketoPage.selectRadioButton('Vaginal bleeding', answer);
  await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', answer);
  await commonEnketoPage.selectRadioButton('Convulsions', answer);
};

module.exports = {
  selectAllDangerSignsPregnancy,
  selectAllDangerSignsDelivery,
};
