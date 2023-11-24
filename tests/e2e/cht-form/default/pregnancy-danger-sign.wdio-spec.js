const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Pregnancy Danger Sign Form', () => {

  it('should ', async () => {
    await mockConfig.loadForm('default', 'app', 'pregnancy_danger_sign');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.contactSummary = { pregnancy_uuid: 'test pregnancy UUID' };
      myForm.content = { contact: { _id: '12345', patient_id: '79376', name: 'Pregnant Woman' } };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy danger sign');

    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
    await commonEnketoPage.selectRadioButton('Fits', 'No');
    await commonEnketoPage.selectRadioButton('Severe abdominal pain', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe headache', 'No');
    await commonEnketoPage.selectRadioButton('Very pale', 'Yes');
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Reduced or no fetal movements', 'Yes');
    await commonEnketoPage.selectRadioButton('Breaking of water', 'No');
    await commonEnketoPage.selectRadioButton('Getting tired easily', 'Yes');
    await commonEnketoPage.selectRadioButton('Swelling of face and hands', 'No');
    await commonEnketoPage.selectRadioButton('Breathlessness', 'Yes');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.patient_uuid).to.equal('12345');
    expect(jsonObj.patient_id).to.equal('79376');
    expect(jsonObj.patient_name).to.equal('Pregnant Woman');
    expect(jsonObj.pregnancy_uuid_ctx).to.equal('test pregnancy UUID');
    expect(jsonObj.danger_signs.vaginal_bleeding).to.equal('yes');
    expect(jsonObj.danger_signs.fits).to.equal('no');
    expect(jsonObj.danger_signs.severe_abdominal_pain).to.equal('yes');
    expect(jsonObj.danger_signs.severe_headache).to.equal('no');
    expect(jsonObj.danger_signs.very_pale).to.equal('yes');
    expect(jsonObj.danger_signs.fever).to.equal('no');
    expect(jsonObj.danger_signs.reduced_or_no_fetal_movements).to.equal('yes');
    expect(jsonObj.danger_signs.breaking_water).to.equal('no');
    expect(jsonObj.danger_signs.easily_tired).to.equal('yes');
    expect(jsonObj.danger_signs.face_hand_swelling).to.equal('no');
    expect(jsonObj.danger_signs.breathlessness).to.equal('yes');
  });

});
