const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Pregnancy Danger Sign Form', () => {

  it('should submit a pregnancy danger sign form', async () => {
    await mockConfig.loadForm('default', 'app', 'pregnancy_danger_sign_follow_up');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy danger sign follow-up');

    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'Yes');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
    await commonEnketoPage.selectRadioButton('Fits', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe abdominal pain', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe headache', 'Yes');
    await commonEnketoPage.selectRadioButton('Very pale', 'Yes');
    await commonEnketoPage.selectRadioButton('Fever', 'Yes');
    await commonEnketoPage.selectRadioButton('Reduced or no fetal movements', 'Yes');
    await commonEnketoPage.selectRadioButton('Breaking of water', 'Yes');
    await commonEnketoPage.selectRadioButton('Getting tired easily', 'Yes');
    await commonEnketoPage.selectRadioButton('Swelling of face and hands', 'Yes');
    await commonEnketoPage.selectRadioButton('Breathlessness', 'Yes');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.t_danger_signs_referral_follow_up).to.equal('yes');
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
  });

});
