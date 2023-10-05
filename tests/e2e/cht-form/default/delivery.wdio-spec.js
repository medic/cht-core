const mockConfig = require('../mock-config');
const {getFormTitle} = require('@page-objects/default/enketo/generic-form.wdio.page');
const moment = require('moment/moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const deliveryForm = require('@page-objects/default/enketo/delivery.wdio.page');

describe('cht-form web component - Delivery Form', () => {

  it('should submit a delivery', async () => {
    const url = await mockConfig.startMockApp('default', 'delivery');
    await browser.url(url);

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.contactSummary = { pregnancy_uuid: 'test UUID' };
    });

    const BABY_NAME = 'Benja';
    const BABY_DOB = moment().format('YYYY-MM-DD');
    const BABY_SEX = 'male';
    const title  = await getFormTitle();
    expect(title).to.eq('Delivery');

    await genericForm.nextPage();
    await deliveryForm.selectDeliveryConditionWomanOutcome('alive_well');
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPostnatalDangerSignsFever('no');
    await deliveryForm.selectDeliveryPostnatalDangerSevereHeadache('no');
    await deliveryForm.selectDeliveryPostnatalDangerVaginalBleeding('no');
    await deliveryForm.selectDeliveryPostnatalDangerVaginalDischarge('no');
    await deliveryForm.selectDeliveryPostnatalDangerConvulsion('no');
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryOutcomeBabiesDelivered('1');
    await deliveryForm.selectDeliveryOutcomeBabiesAlive('1');
    await deliveryForm.selectDeliveryOutcomeDeliveryPlace('health_facility');
    await deliveryForm.selectDeliveryOutcomeDeliveryMode('vaginal');
    await deliveryForm.setDeliveryOutcomeDateOfDelivery(BABY_DOB);
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryBabyCondition('alive_well');
    await deliveryForm.setDeliveryBabyName(BABY_NAME);
    await deliveryForm.selectDeliveryBabySex(BABY_SEX);
    await deliveryForm.selectDeliveryBabyBirthWeightKnown('no');
    await deliveryForm.selectDeliveryBabyBirthLengthKnown('no');
    await deliveryForm.selectDeliveryBabyVaccinesReceived('none');
    await deliveryForm.selectDeliveryBabyBreastfeeding('yes');
    await deliveryForm.selectDeliveryBabyBreastfeedingWithin1Hour('yes');
    await deliveryForm.selectDeliveryBabyInfectedUmbilicalCord('no');
    await deliveryForm.selectDeliveryBabyConvulsion('no');
    await deliveryForm.selectDeliveryBabyDifficultyFeeding('no');
    await deliveryForm.selectDeliveryBabyVomit('no');
    await deliveryForm.selectDeliveryBabyDrowsy('no');
    await deliveryForm.selectDeliveryBabyStiff('no');
    await deliveryForm.selectDeliveryBabyYellowSkin('no');
    await deliveryForm.selectDeliveryBabyFever('no');
    await deliveryForm.selectDeliveryBabyBlueSkin('no');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPncVisits('none');
    await genericForm.nextPage();

    const summaryInfo = await deliveryForm.getSummaryInfo();
    expect(summaryInfo.womanCondition).to.equal('Alive and well');
    expect(summaryInfo.deliveryDate).to.equal(BABY_DOB);
    expect(summaryInfo.deliveryPlace).to.equal('Health facility');
    expect(summaryInfo.deliveredBabies).to.equal('1');
    expect(summaryInfo.deceasedBabies).to.equal('0');
    expect(summaryInfo.pncVisits).to.equal('None');

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();

    const jsonObjMother = JSON.parse(data)[0].fields;
    const jsonObjBaby = JSON.parse(data)[1];

    expect(jsonObjMother.data.meta.__pregnancy_uuid).to.equal('test UUID');
    expect(jsonObjMother.condition.woman_outcome).to.equal('alive_well');
    expect(jsonObjMother.pnc_danger_sign_check.r_pnc_danger_sign_present).to.equal('no');
    expect(jsonObjMother.delivery_outcome.babies_delivered).to.equal('1');
    expect(jsonObjMother.delivery_outcome.babies_alive).to.equal('1');
    expect(jsonObjMother.delivery_outcome.delivery_date).to.equal(BABY_DOB);
    expect(jsonObjMother.delivery_outcome.delivery_place).to.equal('health_facility');
    expect(jsonObjMother.delivery_outcome.delivery_mode).to.equal('vaginal');
    expect(jsonObjMother.babys_condition.baby_repeat[0].baby_details.baby_condition).to.equal('alive_well');
    expect(jsonObjMother.babys_condition.baby_repeat[0].baby_details.baby_name).to.equal(BABY_NAME);
    expect(jsonObjMother.babys_condition.baby_repeat[0].baby_details.baby_sex).to.equal(BABY_SEX);
    expect(jsonObjMother.babys_condition.r_baby_danger_sign_present_any).to.equal('no');

    expect(jsonObjBaby.name).to.equal(BABY_NAME);
    expect(jsonObjBaby.sex).to.equal(BABY_SEX);
    expect(jsonObjBaby.date_of_birth).to.equal(BABY_DOB);
    expect(jsonObjBaby.t_danger_signs_referral_follow_up).to.equal('no');
  });
});


