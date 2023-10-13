const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregDangerSignFollowUpForm = require('@page-objects/default/enketo/pregnancy-danger-sign-follow-up.wdio.page');

describe('cht-form web component - Pregnancy Danger Sign Form', () => {

  it('should submit a pregnancy danger sign form', async () => {
    const url = await mockConfig.startMockApp('default', 'pregnancy_danger_sign_follow_up');
    await browser.url(url);

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy danger sign follow-up');

    await pregDangerSignFollowUpForm.selectVisitedHealthFacility(true);
    await pregDangerSignFollowUpForm.selectDangerSigns(true);
    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[0].fields;

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
