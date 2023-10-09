const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyVisitForm = require('@page-objects/default/enketo/pregnancy-visit.wdio.page');

describe('cht-form web component - Pregnancy Visit Form', () => {

  it('should submit a pregnancy home visit', async () => {
    const url = await mockConfig.startMockApp('default', 'pregnancy_home_visit');
    await browser.url(url);

    let countDangerSigns = 0;
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy home visit');

    await genericForm.nextPage();
    await pregnancyVisitForm.selectVisitOption();
    await pregnancyVisitForm.confirmGestationalAge();
    await genericForm.nextPage();
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.VAGINAL_BLEEDING);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.FITS);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.ABDOMINAL_PAIN);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.HEADACHE);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.VERY_PALE);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.FEVER);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.REDUCE_FETAL_MOV);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.BREAKING_OF_WATER);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.EASILY_TIRED);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.SWELLING_HANDS);
    countDangerSigns += await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.BREATHLESSNESS);
    await genericForm.nextPage();
    await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.LLIN);
    await genericForm.nextPage();
    await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.IRON_FOLATE);
    await genericForm.nextPage();
    await pregnancyVisitForm.selectYesNoOption(pregnancyVisitForm.HIV_TESTED);
    await genericForm.nextPage();

    const countSummaryDangerSigns = await pregnancyVisitForm.countSummaryDangerSigns();
    expect(countSummaryDangerSigns).to.equal(countDangerSigns);

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[0].fields;

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
