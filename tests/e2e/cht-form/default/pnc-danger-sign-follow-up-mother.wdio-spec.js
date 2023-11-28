const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - PNC Danger Sign Follow-up Mother', () => {

  it('should submit PNC danger sign follow-up - mother form', async () => {
    await mockConfig.loadForm('default', 'app', 'pnc_danger_sign_follow_up_mother');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('PNC danger sign follow-up - mother');

    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'Yes');
    await commonEnketoPage.selectRadioButton('Fever', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe headache', 'No');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'Yes');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.t_danger_signs_referral_follow_up).to.equal('yes');
    expect(jsonObj.danger_signs.visit_confirm).to.equal('yes');
    expect(jsonObj.danger_signs.danger_sign_present).to.equal('yes');
    expect(jsonObj.danger_signs.fever).to.equal('yes');
    expect(jsonObj.danger_signs.severe_headache).to.equal('no');
    expect(jsonObj.danger_signs.vaginal_bleeding).to.equal('yes');
    expect(jsonObj.danger_signs.vaginal_discharge).to.equal('no');
    expect(jsonObj.danger_signs.convulsion).to.equal('yes');
  });

});
