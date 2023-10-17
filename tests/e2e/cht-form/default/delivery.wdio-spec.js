const mockConfig = require('../mock-config');
const moment = require('moment/moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const deliveryForm = require('@page-objects/default/enketo/delivery.wdio.page');

describe('cht-form web component - Delivery Form', () => {
  const DATE = moment().format('YYYY-MM-DD');

  it('should submit a delivery - Alive mother and baby', async () => {
    await mockConfig.startMockApp('default', 'app', 'delivery');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.contactSummary = { pregnancy_uuid: 'test UUID' };
      myForm.content = { contact: { _id: '12345', patient_id: '79376', name: 'Pregnant Woman' } };
    });

    const BABY_NAME = 'Benja';
    const BABY_SEX = 'male';
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Delivery');

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
    await deliveryForm.setDeliveryOutcomeDateOfDelivery(DATE);

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
    expect(summaryInfo.deliveryDate).to.equal(DATE);
    expect(summaryInfo.deliveryPlace).to.equal('Health facility');
    expect(summaryInfo.deliveredBabies).to.equal('1');
    expect(summaryInfo.deceasedBabies).to.equal('0');
    expect(summaryInfo.pncVisits).to.equal('None');

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObjMother = JSON.parse(data)[0].fields;
    const jsonObjBaby = JSON.parse(data)[1];

    expect(jsonObjMother.patient_uuid).to.equal('12345');
    expect(jsonObjMother.patient_id).to.equal('79376');
    expect(jsonObjMother.patient_name).to.equal('Pregnant Woman');
    expect(jsonObjMother.data.meta.__pregnancy_uuid).to.equal('test UUID');
    expect(jsonObjMother.condition.woman_outcome).to.equal('alive_well');
    expect(jsonObjMother.pnc_danger_sign_check.r_pnc_danger_sign_present).to.equal('no');
    expect(jsonObjMother.delivery_outcome.babies_delivered).to.equal('1');
    expect(jsonObjMother.delivery_outcome.babies_alive).to.equal('1');
    expect(jsonObjMother.delivery_outcome.delivery_date).to.equal(DATE);
    expect(jsonObjMother.delivery_outcome.delivery_place).to.equal('health_facility');
    expect(jsonObjMother.delivery_outcome.delivery_mode).to.equal('vaginal');
    expect(jsonObjMother.babys_condition.baby_repeat[0].baby_details.baby_condition).to.equal('alive_well');
    expect(jsonObjMother.babys_condition.baby_repeat[0].baby_details.baby_name).to.equal(BABY_NAME);
    expect(jsonObjMother.babys_condition.baby_repeat[0].baby_details.baby_sex).to.equal(BABY_SEX);
    expect(jsonObjMother.babys_condition.r_baby_danger_sign_present_any).to.equal('no');

    expect(jsonObjBaby.name).to.equal(BABY_NAME);
    expect(jsonObjBaby.sex).to.equal(BABY_SEX);
    expect(jsonObjBaby.date_of_birth).to.equal(DATE);
    expect(jsonObjBaby.t_danger_signs_referral_follow_up).to.equal('no');
  });

  it('should submit a delivery - Death mother and baby', async () => {
    await mockConfig.startMockApp('default', 'app', 'delivery');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.contactSummary = { pregnancy_uuid: 'test UUID' };
      myForm.content = { contact: { _id: '12345' } };
      myForm.user = { phone: '+50689999999' };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Delivery');

    await deliveryForm.selectDeliveryConditionWomanOutcome('deceased');
    await genericForm.nextPage();
    await deliveryForm.fillWomanDeathInformation({
      date: DATE,
      place: 'health_facility',
      notes: 'Test notes - Mother\'s death'
    });
    await genericForm.nextPage();
    await genericForm.nextPage();

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[1];

    expect(jsonObj.form).to.equal('death_report');
    expect(jsonObj.from).to.equal('+50689999999');
    expect(jsonObj.fields.death_details.date_of_death).to.equal(DATE);
    expect(jsonObj.fields.death_details.place_of_death).to.equal('health_facility');
    expect(jsonObj.fields.death_details.death_information).to.equal('Test notes - Mother\'s death');
  });

});
