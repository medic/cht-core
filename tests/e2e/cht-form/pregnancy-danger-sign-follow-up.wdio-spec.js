const mockConfig = require('./mock-config');
const {getFormTitle} = require('@page-objects/default/enketo/generic-form.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyDangerSignForm = require('@page-objects/default/enketo/pregnancy-danger-sign.wdio.page');

describe('cht-form web component - Pregnancy Danger Sign Form', () => {

  it('should submit a pregnancy danger sign form', async () => {
    const url = await mockConfig.startMockApp('pregnancy_danger_sign_follow_up');
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.eq('Pregnancy danger sign follow-up');

    await genericForm.nextPage();
    await pregnancyDangerSignForm.selectVisitedHealthFacility(true);
    await pregnancyDangerSignForm.selectDangerSigns(true);
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
