const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

const submitDefaultPregnancyVisit = async (submitForm = true) => {
  await commonEnketoPage.selectRadioButton('Do you want to start this pregnancy visit?', 'Yes');
  await commonEnketoPage.selectRadioButton('Is the gestational age above correct?', 'Yes, it is correct.');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Did the woman complete the health facility ANC visit scheduled', 'Yes');
  await commonEnketoPage.selectRadioButton(
    'Would you like to report any additional unreported health facility ANC visits?',
    'No'
  );
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton(
    'Are there additional factors that could make this pregnancy high-risk?',
    'No'
  );
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton(
    'If the woman has a specific upcoming ANC appointment date, enter it here.',
    'I don\'t know'
  );
  await genericForm.nextPage(2);
  await dangerSignPage.selectAllDangerSignsPregnancy('No');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Does the woman use a long-lasting insecticidal net (LLIN)?', 'Yes');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Is the woman taking iron folate daily?', 'Yes');
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton('Has the woman received deworming medication?', 'Yes');
  await genericForm.nextPage(2);
  await commonEnketoPage.selectRadioButton(
    'Has the woman received any Tetanus Toxoid (TT) immunizations during this pregnancy?',
    'No'
  );
  await genericForm.nextPage();

  if (submitForm) {
    await genericForm.submitForm();
  }
};

module.exports = {
  submitDefaultPregnancyVisit,
};
