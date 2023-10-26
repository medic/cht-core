const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

describe('cht-form web component - PNC Danger Sign Follow-up Mother', () => {

  it('should submit PNC danger sign follow-up - mother form', async () => {
    await mockConfig.startMockApp('default', 'app', 'pnc_danger_sign_follow_up_mother');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('PNC danger sign follow-up - mother');

    await genericForm.selectYesNoOption(dangerSignPage.visitConfirmation('pnc_danger_sign_follow_up_mother'));
    await genericForm.selectYesNoOption(dangerSignPage.dangerSignsPresent('pnc_danger_sign_follow_up_mother'));
    await genericForm.selectYesNoOption(dangerSignPage.fever('pnc_danger_sign_follow_up_mother'));
    await genericForm.selectYesNoOption(dangerSignPage.headache('pnc_danger_sign_follow_up_mother'), 'no');
    await genericForm.selectYesNoOption(dangerSignPage.vaginalBleeding('pnc_danger_sign_follow_up_mother'));
    await genericForm.selectYesNoOption(dangerSignPage.vaginalDischarge('pnc_danger_sign_follow_up_mother'), 'no');
    await genericForm.selectYesNoOption(dangerSignPage.convulsion('pnc_danger_sign_follow_up_mother'));

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
