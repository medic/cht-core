const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Postnatal Visit Report', () => {

  it('should submit a postnatal visit report', async () => {
    await mockConfig.loadForm('standard', 'app', 'postnatal_visit');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = {
        contact: {
          _id: '12345',
          patient_id: '98765',
          name: 'Cleo',
          parent: { contact: { phone: '+50689252525', name: 'Luna' } }
        }
      };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Postnatal Visit');

    const note = 'Test note - postnatal visit';
    const followUpSms = 'Hi, Luna, Mother Cleo (98765) and baby attended PNC. ' +
      'The nurse reported danger signs in the mother and baby. ' +
      `Please follow up to see if they need additional support. Thank you! ${note}`;
    const momDangerSignsQuestion = 'Confirm with Luna if Cleo has any of the following danger signs.';
    const babyDangerSignsQuestion = 'Confirm with Luna if the baby has any of the following danger signs.';

    await commonEnketoPage.selectRadioButton('Who are you assessing today?', 'Both mother and baby');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Elevated diastolic blood pressure');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Significant pallor');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Headaches or swelling of the face');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Heavy vaginal bleeding');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Fever or foul-smelling lochia');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Dribbling urine');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Pus or perineal pain');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Feeling unhappy or crying easily');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Vaginal discharge 4 weeks after delivery');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Breast problem or pain');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Cough or breathing difficulty');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Taking anti-tuberculosis drugs');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Excessive fatigue');
    await commonEnketoPage.selectCheckBox(momDangerSignsQuestion, 'Other danger signs');
    await commonEnketoPage.setInputValue('Specify other:', 'Other sign - mom');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Fever');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Fast breathing');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Chest indrawing');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Convulsions');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Diarrhea');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Infected umblical cord');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Unable to breast feed');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Many skin pustules');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Vomits everything');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Very sleepy');
    await commonEnketoPage.selectCheckBox(babyDangerSignsQuestion, 'Other danger signs');
    await commonEnketoPage.setInputValue('Specify other:', 'Other sign - baby');
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      'Cleo', //patient name
      '98765', //patient id
      'Postnatal care visit completed',
      'Elevated diastolic blood pressure',
      'Significant pallor',
      'Headaches or swelling of the face',
      'Heavy vaginal bleeding',
      'Fever or foul-smelling lochia',
      'Dribbling urine',
      'Pus or perineal pain',
      'Feeling unhappy or crying easily',
      'Vaginal discharge 4 weeks after delivery',
      'Breast problem or pain',
      'Cough or breathing difficulty',
      'Taking anti-tuberculosis drugs',
      'Excessive fatigue',
      'Fever',
      'Fast breathing',
      'Chest indrawing',
      'Convulsions',
      'Diarrhea',
      'Infected umblical cord',
      'Unable to breast feed',
      'Many skin pustules',
      'Vomits everything',
      'Very sleepy'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      'The following will be sent as a SMS to Luna +50689252525')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', followUpSms)).to.be.true;

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.danger_signs_mom).to.equal('d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 d14');
    expect(jsonObj.danger_signs_baby).to.equal('bd1 bd2 bd3 bd4 bd5 bd6 bd7 bd8 bd9 bd10 bd11');
    expect(jsonObj.chw_sms).to.equal(followUpSms);
    expect(jsonObj.visit_confirmed).to.equal('yes');
    expect(jsonObj.group_danger_signs_mom.danger_signs_mom_other).to.equal('Other sign - mom');
    expect(jsonObj.group_danger_signs_baby.danger_signs_baby_other).to.equal('Other sign - baby');

  });

});
