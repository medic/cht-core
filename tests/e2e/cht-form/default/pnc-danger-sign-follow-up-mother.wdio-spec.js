const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pncDangerSignFollowUpMotherForm = require(
  '@page-objects/default/enketo/pnc-danger-sign-follow-up-mother.wdio.page'
);

describe('cht-form web component - PNC Danger Sign Follow-up Mother', () => {
  it('should submit PNC danger sign follow-up - mother form', async () => {
    const url = await mockConfig.startMockApp('default', 'pnc_danger_sign_follow_up_mother');
    await browser.url(url);

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('PNC danger sign follow-up - mother');

    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.VISIT_CONFIRMATION);
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.DANGER_SIGNS_PRESENT);
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.FEVER);
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.HEADACHE, 'no');
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.VAGINAL_BLEEDING);
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.VAGINAL_DISCHARGE, 'no');
    await genericForm.selectYesNoOption(pncDangerSignFollowUpMotherForm.CONVULSION);

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[0].fields;

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
