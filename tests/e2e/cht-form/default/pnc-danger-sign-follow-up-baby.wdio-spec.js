const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

describe('cht-form web component - PNC Danger Sign Follow-up Baby', () => {

  it('should submit a PNC danger sign follow-up - baby form', async () => {
    await mockConfig.loadForm('default', 'app', 'pnc_danger_sign_follow_up_baby');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('PNC danger sign follow-up - baby');

    await genericForm.selectYesNoOption(dangerSignPage.visitConfirmation('pnc_danger_sign_follow_up_baby'));
    await genericForm.selectYesNoOption(dangerSignPage.dangerSignsPresent('pnc_danger_sign_follow_up_baby'));
    await genericForm.selectYesNoOption(dangerSignPage.infectedUmbilicalCord('pnc_danger_sign_follow_up_baby'));
    await genericForm.selectYesNoOption(dangerSignPage.convulsion('pnc_danger_sign_follow_up_baby'), 'no');
    await genericForm.selectYesNoOption(dangerSignPage.difficultyFeeding('pnc_danger_sign_follow_up_baby'));
    await genericForm.selectYesNoOption(dangerSignPage.vomit('pnc_danger_sign_follow_up_baby'), 'no');
    await genericForm.selectYesNoOption(dangerSignPage.drowsy('pnc_danger_sign_follow_up_baby'));
    await genericForm.selectYesNoOption(dangerSignPage.stiffness('pnc_danger_sign_follow_up_baby'), 'no');
    await genericForm.selectYesNoOption(dangerSignPage.yellowSkin('pnc_danger_sign_follow_up_baby'));
    await genericForm.selectYesNoOption(dangerSignPage.fever('pnc_danger_sign_follow_up_baby'), 'no');
    await genericForm.selectYesNoOption(dangerSignPage.blueSkin('pnc_danger_sign_follow_up_baby'));

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
