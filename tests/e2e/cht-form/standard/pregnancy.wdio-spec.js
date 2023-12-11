const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/standard/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Pregnancy Registration Form', () => {

  it('should register a new pregnancy', async () => {
    await mockConfig.loadForm('standard', 'app', 'pregnancy');

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
    expect(title).to.equal('New Pregnancy');

    const note = 'Test note - New pregnancy';
    const followUpSms = 'Hi Luna, a pregnancy with danger signs for Cleo (98765) has been registered ' +
      'by the health facility. This is a high-risk pregnancy. You will receive ANC notifications for this patient. ' +
      `Please follow up with the nurse to identify the patient. Thank you! ${note}`;

    await commonEnketoPage.selectRadioButton('Does the woman know the date of the last cycle?', 'No');
    await commonEnketoPage.selectRadioButton('Approximate start date of last cycle', 'between 7 to 8 months ago');

    expect(await commonEnketoPage.isElementDisplayed('label', 'Estimated delivery date is')).to.be.true;

    await genericForm.nextPage();
    await pregnancyForm.selectAllRiskFactors();
    await genericForm.nextPage();
    await pregnancyForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      'Cleo', //patient name
      '98765', //patient id
      'More than 4 children',
      'Last baby born less than 1 year before',
      'Had previous miscarriages or previous difficulties in childbirth',
      'One of the following conditions: heart conditions, asthma, high blood pressure, known diabetes',
      'HIV positive',
      'Pain or cramping in abdomen',
      'Bleeding or fluid leaking from vagina or vaginal discharge with bad odour',
      'Severe nausea or vomiting',
      'Fever of 38 degrees or higher',
      'Severe headache or new, blurry vision problems',
      'Sudden weight gain or severe swelling of feet, ankles, face, or hands',
      'Less movement and kicking from the baby (after week 20 of pregnancy)',
      'Blood in the urine or painful, burning urination',
      'Diarrhea that doesn\'t go away',
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      'The following will be sent as a SMS to Luna +50689252525')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', followUpSms)).to.be.true;

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.chw_sms).to.equal(followUpSms);
    expect(jsonObj.lmp_method).to.equal('approx');
    expect(jsonObj.risk_factors).to.equal('r2 r3 r4 r5 r6');
    expect(jsonObj.danger_signs).to.equal('d1 d2 d3 d4 d5 d6 d7 d8 d9');
    expect(jsonObj.days_since_lmp).to.equal('244');
  });

});
