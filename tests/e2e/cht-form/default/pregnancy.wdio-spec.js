const mockConfig = require('../mock-config');
const moment = require('moment/moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');

describe('cht-form web component - Pregnancy Form', () => {

  it('should submit a new pregnancy ', async () => {
    const url = await mockConfig.startMockApp('default', 'pregnancy');
    await browser.url(url);

    let countRiskFactors = 0;
    let countDangerSigns = 0;
    const edd = moment().add(30, 'days');
    const nextANCVisit = moment().add(1, 'day').format('YYYY-MM-DD');
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy registration');

    await genericForm.nextPage();
    await pregnancyForm.selectGestationAge();
    await genericForm.nextPage();
    await pregnancyForm.setDeliveryDate(edd.format('YYYY-MM-DD'));
    await genericForm.nextPage();

    const confirmationDetails = await pregnancyForm.getConfirmationDetails();
    expect(Date.parse(confirmationDetails.eddConfirm)).to.equal(Date.parse(edd.format('D MMM, YYYY')));

    await genericForm.nextPage();
    await pregnancyForm.setANCVisitsPast();
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.KNOWN_FUTURE_VISITS);
    await pregnancyForm.setFutureVisitDate(nextANCVisit);
    await genericForm.nextPage();
    countRiskFactors += await genericForm.selectYesNoOption(pregnancyForm.FIRST_PREGNANCY, 'no');
    countRiskFactors += await genericForm.selectYesNoOption(pregnancyForm.MISCARRIAGE);
    await genericForm.nextPage();
    countRiskFactors += await pregnancyForm.selectAllRiskFactors(pregnancyForm.FIRST_PREGNANCY_VALUE.no);
    countRiskFactors += await genericForm.selectYesNoOption(pregnancyForm.ADDITIONAL_FACTORS, 'no');
    await genericForm.nextPage();
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.VAGINAL_BLEEDING);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.FITS);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.ABDOMINAL_PAIN);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.HEADACHE);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.VERY_PALE);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.FEVER);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.REDUCE_FETAL_MOV);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.BREAKING_OF_WATER);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.EASILY_TIRED);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.SWELLING_HANDS);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.BREATHLESSNESS);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.LLIN);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.IRON_FOLATE);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.DEWORMING_MEDICATION);
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.HIV_TESTED);
    await genericForm.nextPage();

    const summaryDetails = await pregnancyForm.getSummaryDetails();
    expect(summaryDetails.weeksPregnantSumm).to.equal(confirmationDetails.weeksPregnantConfirm);
    expect(Date.parse(summaryDetails.eddSumm)).to.equal(Date.parse(edd.format('D MMM, YYYY')));
    expect(summaryDetails.riskFactorsSumm).to.equal(countRiskFactors);
    expect(summaryDetails.dangerSignsSumm).to.equal(countDangerSigns);

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[0].fields;

    expect(Date.parse(jsonObj.gestational_age.g_edd)).to.equal(Date.parse(edd.format('D MMM, YYYY')));
    expect(jsonObj.t_pregnancy_follow_up).to.equal('yes');
    expect(Date.parse(jsonObj.t_pregnancy_follow_up_date)).to.equal(Date.parse(nextANCVisit));
    expect(jsonObj.danger_signs.r_danger_sign_present).to.equal('yes');
    expect(jsonObj.risk_factors.r_risk_factor_present).to.equal('yes');
  });
});