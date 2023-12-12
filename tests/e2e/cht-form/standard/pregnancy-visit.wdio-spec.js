const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyVisitForm = require('@page-objects/standard/enketo/pregnancy-visit.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Pregnancy Visit Report', () => {

  it('should submit a pregnancy visit', async () => {
    await mockConfig.loadForm('standard', 'app', 'pregnancy_visit');

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
    expect(title).to.equal('Pregnancy Visit');

    const note = 'Test note - pregnancy visit';
    const followUpSms = 'Nice work, Luna! Cleo (98765) has attended ANC at the health facility. ' +
      'Please note that Cleo has one or more danger signs for a high risk pregnancy. ' +
      `We will send you a message when they are due for their next visit. Thank you! ${note}`;

    await pregnancyVisitForm.selectAllDangerSigns('Luna', 'Cleo');
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      'Cleo', //patient name
      '98765', //patient id
      'Pregnancy visit completed',
      'Pain or cramping in abdomen',
      'Bleeding or fluid leaking from vagina or vaginal discharge with bad odour',
      'Severe nausea or vomiting',
      'Fever of 38 degrees or higher',
      'Severe headache or new, blurry vision problems',
      'Sudden weight gain or severe swelling of feet, ankles, face, or hands',
      'Less movement and kicking from the baby (after week 20 of pregnancy)',
      'Blood in the urine or painful, burning urination',
      'Diarrhea that doesn\'t go away'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      'The following will be sent as a SMS to Luna +50689252525')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', followUpSms)).to.be.true;

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.danger_signs).to.equal('d1 d2 d3 d4 d5 d6 d7 d8 d9');
    expect(jsonObj.referral_follow_up_needed).to.equal('true');
    expect(jsonObj.chw_sms).to.equal(followUpSms);
    expect(jsonObj.visit_confirmed).to.equal('yes');
  });

});
