const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyVisitForm = require('@page-objects/standard/enketo/pregnancy-visit.wdio.page');

describe('cht-form web component - Pregnancy Visit Report', () => {

  it('should submit a pregnancy visit', async () => {
    await mockConfig.startMockApp('standard', 'app', 'pregnancy_visit');

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

    const dangerSigns = await pregnancyVisitForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await pregnancyVisitForm.setNote(note);
    await genericForm.nextPage();

    const summaryDetails = await pregnancyVisitForm.getSummaryDetails();
    expect(summaryDetails.patientName).to.equal('Cleo');
    expect(summaryDetails.patientId).to.equal('98765');
    expect(summaryDetails.countDangerSigns).to.equal(dangerSigns.length);
    expect(summaryDetails.followUpSmsNote1).to.equal('The following will be sent as a SMS to Luna +50689252525');
    expect(summaryDetails.followUpSmsNote2).to.equal(followUpSms);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.danger_signs).to.equal('d1 d2 d3 d4 d5 d6 d7 d8 d9');
    expect(jsonObj.referral_follow_up_needed).to.equal('true');
    expect(jsonObj.chw_sms).to.equal(followUpSms);
    expect(jsonObj.visit_confirmed).to.equal('yes');
  });

});
