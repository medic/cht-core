const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

describe('cht-form web component - Pregnancy Visit Form', () => {

  it('should submit a pregnancy home visit', async () => {
    await mockConfig.loadForm('default', 'app', 'pregnancy_home_visit');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy home visit');

    await commonEnketoPage.selectRadioButton('Do you want to start this pregnancy visit?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is the gestational age above correct?', 'Yes, it is correct.');
    await genericForm.nextPage();
    await dangerSignPage.selectAllDangerSignsPregnancy();
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Does the woman use a long-lasting insecticidal net (LLIN)?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Is the woman taking iron folate daily?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Has the woman been tested for HIV in the past 3 months?', 'Yes');
    await genericForm.nextPage();

    const summaryTexts = [
      'Vaginal bleeding',
      'Fits',
      'Severe abdominal pain',
      'Severe headache',
      'Very pale',
      'Fever',
      'Reduced or no fetal movements',
      'Breaking of water',
      'Getting tired easily',
      'Swelling of face and hands',
      'Breathlessness'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.pregnancy_summary.visit_option).to.equal('yes');
    expect(jsonObj.pregnancy_summary.g_age_correct).to.equal('yes');

    expect(jsonObj.danger_signs.vaginal_bleeding).to.equal('yes');
    expect(jsonObj.danger_signs.fits).to.equal('yes');
    expect(jsonObj.danger_signs.severe_abdominal_pain).to.equal('yes');
    expect(jsonObj.danger_signs.severe_headache).to.equal('yes');
    expect(jsonObj.danger_signs.very_pale).to.equal('yes');
    expect(jsonObj.danger_signs.fever).to.equal('yes');
    expect(jsonObj.danger_signs.reduced_or_no_fetal_movements).to.equal('yes');
    expect(jsonObj.danger_signs.breaking_water).to.equal('yes');
    expect(jsonObj.danger_signs.easily_tired).to.equal('yes');
    expect(jsonObj.danger_signs.face_hand_swelling).to.equal('yes');
    expect(jsonObj.danger_signs.breathlessness).to.equal('yes');
    expect(jsonObj.danger_signs.r_danger_sign_present).to.equal('yes');

    expect(jsonObj.safe_pregnancy_practices.malaria.llin_use).to.equal('yes');
    expect(jsonObj.safe_pregnancy_practices.iron_folate.iron_folate_daily).to.equal('yes');
    expect(jsonObj.safe_pregnancy_practices.hiv_status.hiv_tested).to.equal('yes');
  });

});
