const mockConfig = require('../mock-config');
const moment = require('moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Delivery Form', () => {
  const DATE = moment().format('YYYY-MM-DD');

  it('should submit a delivery - Alive mother and baby', async () => {
    await mockConfig.loadForm('default', 'app', 'delivery');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.contactSummary = { pregnancy_uuid: 'test UUID' };
      myForm.content = { contact: { _id: '12345', patient_id: '79376', name: 'Pregnant Woman' } };
    });

    const BABY_NAME = 'Benja';
    const BABY_SEX = 'male';
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Alive and well');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Severe headache', 'No');
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'No');
    await commonEnketoPage.selectRadioButton('Foul smelling vaginal discharge', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('How many babies were delivered?', '1');
    await commonEnketoPage.selectRadioButton('How many babies are alive?', '1');
    await commonEnketoPage.selectRadioButton('Where did delivery take place?', 'Health facility');
    await commonEnketoPage.selectRadioButton('How did she deliver?', 'Vaginal');
    await commonEnketoPage.setDateValue('Date of delivery', DATE);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('What is the condition of baby?', 'Alive and well');
    await commonEnketoPage.setInputValue('Name', BABY_NAME);
    await commonEnketoPage.selectRadioButton('Sex', 'Male');
    await commonEnketoPage.selectRadioButton('Birth weight', 'I don\'t know');
    await commonEnketoPage.selectRadioButton('Birth length', 'I don\'t know');
    await commonEnketoPage.selectRadioButton('What vaccines have they received?', 'None');
    await commonEnketoPage.selectRadioButton('Is the child exclusively breastfeeding?', 'Yes');
    await commonEnketoPage.selectRadioButton('Were they initiated on breastfeeding within on hour of delivery?', 'Yes');
    await commonEnketoPage.selectRadioButton('Infected umbilical cord', 'No');
    await commonEnketoPage.selectRadioButton('Convulsions', 'No');
    await commonEnketoPage.selectRadioButton('Difficulty feeding or drinking', 'No');
    await commonEnketoPage.selectRadioButton('Vomits everything', 'No');
    await commonEnketoPage.selectRadioButton('Drowsy or unconscious', 'No');
    await commonEnketoPage.selectRadioButton('Body stiffness', 'No');
    await commonEnketoPage.selectRadioButton('Yellow skin color', 'No');
    await commonEnketoPage.selectRadioButton('Fever', 'No');
    await commonEnketoPage.selectRadioButton('Blue skin color (hypothermia)', 'No');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('None of the above');
    await genericForm.nextPage();

    const summaryTexts = [
      'Alive and well', //woman's condition
      DATE,
      'Health facility' //delivery place
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    const data = await mockConfig.submitForm();
    const jsonObjMother = data[0].fields;
    const jsonObjBaby = data[1];

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
    await mockConfig.loadForm('default', 'app', 'delivery');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345' } };
      myForm.user = { phone: '+50689999999' };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Delivery');

    await commonEnketoPage.selectRadioButton('What is the outcome for the woman?', 'Deceased');
    await genericForm.nextPage();
    await commonEnketoPage.setDateValue('Date of death', DATE);
    await commonEnketoPage.selectRadioButton('What was the place of death?', 'Health facility');
    await commonEnketoPage.selectRadioButton('Did the woman deliver any babies before she died?', 'No');
    await commonEnketoPage.setInputValue('Additional notes', 'Test notes - Mother\'s death');
    await genericForm.nextPage();

    const data = await mockConfig.submitForm();
    const jsonObjDeliveryReport = data[0].fields;
    const jsonObjDeathReport = data[1];

    expect(jsonObjDeliveryReport.inputs.user.phone).to.equal('+50689999999');
    expect(jsonObjDeliveryReport.patient_uuid).to.equal('12345');
    expect(jsonObjDeliveryReport.condition.woman_outcome).to.equal('deceased');
    expect(jsonObjDeliveryReport.death_info_woman.woman_death_date).to.equal(DATE);
    expect(jsonObjDeliveryReport.death_info_woman.woman_death_place).to.equal('health_facility');
    expect(jsonObjDeliveryReport.death_info_woman.woman_death_birth).to.equal('no');
    expect(jsonObjDeliveryReport.death_info_woman.woman_death_add_notes).to.equal('Test notes - Mother\'s death');
    expect(jsonObjDeliveryReport.death_info_woman.death_report.form).to.equal('death_report');
    expect(jsonObjDeliveryReport.death_info_woman.death_report.from).to.equal('+50689999999');

    expect(jsonObjDeathReport.form).to.equal('death_report');
    expect(jsonObjDeathReport.from).to.equal('+50689999999');
    expect(jsonObjDeathReport.fields.death_details.date_of_death).to.equal(DATE);
    expect(jsonObjDeathReport.fields.death_details.place_of_death).to.equal('health_facility');
    expect(jsonObjDeathReport.fields.death_details.death_information).to.equal('Test notes - Mother\'s death');
  });

});
