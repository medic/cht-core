const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/standard/enketo/pregnancy.wdio.page');

describe('cht-form web component - Pregnancy Registration Form', () => {

  it('should register a new pregnancy', async () => {
    await mockConfig.startMockApp('standard', 'app', 'pregnancy');

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

    await pregnancyForm.selectKnowLMP();
    await pregnancyForm.selectAproxLMP(pregnancyForm.APROX_LMP.b7To8Months);

    expect(await (await pregnancyForm.getEstDeliveryDate()).isDisplayed()).to.be.true;

    await genericForm.nextPage();
    const riskFactors = await pregnancyForm.selectAllRiskFactors();
    await genericForm.nextPage();
    const dangerSigns = await pregnancyForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await pregnancyForm.setNote(note);
    await genericForm.nextPage();

    const summaryDetails = await pregnancyForm.getSumamryDetails();
    expect(summaryDetails.patientName).to.equal('Cleo');
    expect(summaryDetails.patientId).to.equal('98765');
    expect(summaryDetails.countRiskFactors).to.equal(riskFactors.length);
    expect(summaryDetails.countDangerSigns).to.equal(dangerSigns.length);
    expect(summaryDetails.followUpSmsNote1).to.include('The following will be sent as a SMS to Luna +50689252525');
    expect(summaryDetails.followUpSmsNote2).to.include(followUpSms);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.chw_sms).to.equal(followUpSms);
    expect(jsonObj.lmp_method).to.equal('approx');
    expect(jsonObj.risk_factors).to.equal('r2 r3 r4 r5 r6');
    expect(jsonObj.danger_signs).to.equal('d1 d2 d3 d4 d5 d6 d7 d8 d9');
    expect(jsonObj.days_since_lmp).to.equal('244');
  });

});
