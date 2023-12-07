const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyVisitForm = require('@page-objects/default/enketo/pregnancy-visit.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

describe('cht-form web component - Pregnancy Visit Form', () => {

  it('should submit a pregnancy home visit', async () => {
    await mockConfig.loadForm('default', 'app', 'pregnancy_home_visit');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    let countDangerSigns = 0;
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy home visit');

    await pregnancyVisitForm.selectVisitOption();
    await pregnancyVisitForm.confirmGestationalAge();
    await genericForm.nextPage();
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.vaginalBleeding('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.fits('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.abdominalPain('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.headache('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.veryPale('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.fever('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.reduceFetalMov('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.breakingOfWater('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.easilyTired('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.swellingHands('pregnancy_home_visit'));
    countDangerSigns += await genericForm.selectYesNoOption(dangerSignPage.breathlessness('pregnancy_home_visit'));
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyVisitForm.LLIN);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyVisitForm.IRON_FOLATE);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyVisitForm.HIV_TESTED);
    await genericForm.nextPage();

    const countSummaryDangerSigns = await pregnancyVisitForm.countSummaryDangerSigns();
    expect(countSummaryDangerSigns).to.equal(countDangerSigns);

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.pregnancy_summary.visit_option).to.equal('yes');
    expect(jsonObj.pregnancy_summary.g_age_correct).to.equal('yes');

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
    expect(jsonObj.danger_signs.r_danger_sign_present).to.equal('yes');

    expect(jsonObj.safe_pregnancy_practices.malaria.llin_use).to.equal('yes');
    expect(jsonObj.safe_pregnancy_practices.iron_folate.iron_folate_daily).to.equal('yes');
    expect(jsonObj.safe_pregnancy_practices.hiv_status.hiv_tested).to.equal('yes');
  });

});
