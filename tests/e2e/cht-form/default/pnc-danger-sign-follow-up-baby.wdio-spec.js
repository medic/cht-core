const mockConfig = require('../mock-config');
const {getFormTitle} = require('@page-objects/default/enketo/generic-form.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pncDangerSignFollowUpBabyForm = require('@page-objects/default/enketo/pnc-danger-sign-follow-up-baby.wdio.page');

describe('cht-form web component - PNC Danger Sign Follow-up Baby', () => {
  it('should ', async () => {
    const url = await mockConfig.startMockApp('default', 'pnc_danger_sign_follow_up_baby');
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.eq('PNC danger sign follow-up - baby');

    await genericForm.nextPage();
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.VISIT_CONFIRMATION);
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.DANGER_SIGNS_PRESENT);
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.INFECTED_UMBILICAL_CORD);
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.CONVULSION, 'no');
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.DIFFICULTY_FEEDING);
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.VOMIT, 'no');
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.DROWSY);
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.STIFFNESS, 'no');
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.YELLOW_SKIN);
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.FEVER, 'no');
    await pncDangerSignFollowUpBabyForm.selectYesNoOption(pncDangerSignFollowUpBabyForm.BLUE_SKIN);
    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[0].fields;

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
