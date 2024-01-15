const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const postnatalVisitForm = require('@page-objects/standard/enketo/postnatal-visit.wdio.page');

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

    await postnatalVisitForm.selectAssessingTo('both');
    await genericForm.nextPage();
    const momDangerSigns = await postnatalVisitForm.selectAllDangerSigns('mom');
    await postnatalVisitForm.setOtherDangerSign('mom', 'Other sign - mom');
    await genericForm.nextPage();
    const babyDangerSigns = await postnatalVisitForm.selectAllDangerSigns('baby');
    await postnatalVisitForm.setOtherDangerSign('baby', 'Other sign - baby');
    await genericForm.nextPage();
    await postnatalVisitForm.setSmsNote(note);
    await genericForm.nextPage();

    const summaryDetails = await postnatalVisitForm.getSummaryDetails();
    expect(summaryDetails.patientName).to.equal('Cleo');
    expect(summaryDetails.patientId).to.equal('98765');
    expect(summaryDetails.visitInformation).to.equal('Postnatal care visit completed');
    expect(summaryDetails.countDangerSignsMom).to.equal(momDangerSigns);
    expect(summaryDetails.countDangerSignsBaby).to.equal(babyDangerSigns);
    expect(summaryDetails.followUpSmsNote1).to.equal('The following will be sent as a SMS to Luna +50689252525');
    expect(summaryDetails.followUpSmsNote2).to.equal(followUpSms);

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
