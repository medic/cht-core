const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - PNC Danger Sign Follow-up Baby', () => {

  it('should submit a PNC danger sign follow-up - baby form', async () => {
    await mockConfig.loadForm('default', 'app', 'pnc_danger_sign_follow_up_baby');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('PNC danger sign follow-up - baby');

    await commonEnketoPage.selectRadioButton('Was the baby taken to the health facility as recommended?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is the baby still experiencing any danger signs?', 'Yes');
    await commonEnketoPage.selectRadioButton('Infected umbilical cord', 'Yes');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await commonEnketoPage.selectRadioButton('Difficulty feeding or drinking', 'Yes');
    await commonEnketoPage.selectRadioButton('Vomits everything', 'No');
    await commonEnketoPage.selectRadioButton('Drowsy or unconscious', 'Yes');
    await commonEnketoPage.selectRadioButton('Body stiffness', 'No');
    await commonEnketoPage.selectRadioButton('Yellow skin color', 'Yes');
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Blue skin color (hypothermia)', 'Yes');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.t_danger_signs_referral_follow_up).to.equal('yes');
    expect(jsonObj.danger_signs.visit_confirm).to.equal('yes');
    expect(jsonObj.danger_signs.danger_sign_present).to.equal('yes');
    expect(jsonObj.danger_signs.infected_umbilical_cord).to.equal('yes');
    expect(jsonObj.danger_signs.convulsion).to.equal('no');
    expect(jsonObj.danger_signs.difficulty_feeding).to.equal('yes');
    expect(jsonObj.danger_signs.vomit).to.equal('no');
    expect(jsonObj.danger_signs.drowsy).to.equal('yes');
    expect(jsonObj.danger_signs.stiff).to.equal('no');
    expect(jsonObj.danger_signs.yellow_skin).to.equal('yes');
    expect(jsonObj.danger_signs.fever).to.equal('no');
    expect(jsonObj.danger_signs.blue_skin).to.equal('yes');
    expect(jsonObj.danger_signs.r_danger_sign_present).to.equal('yes');
  });

});
