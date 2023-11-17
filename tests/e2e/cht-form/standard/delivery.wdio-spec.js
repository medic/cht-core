const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const deliveryForm = require('@page-objects/standard/enketo/delivery.wdio.page');
const moment = require('moment');

describe('cht-form web component - Delivery Form', () => {

  it('should submit a delivery report', async () => {
    await mockConfig.loadForm('standard', 'app', 'delivery');

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
    expect(title).to.equal('Delivery Report');

    const note = 'Test note - Delivery report';
    const date = moment().format('YYYY-MM-DD');
    const followUpSms = 'Good news, Luna! ' +
      'Cleo (98765) has delivered at the health facility. ' +
      'We will alert you when it is time to refer them for PNC. Please monitor them for danger signs. ' +
      `Thank you! ${note}`;

    const pregnancyOutcome = await deliveryForm.selectPregnancyOutcome();
    const locationDelivery = await deliveryForm.selectDeliveryLocation();
    await deliveryForm.setDeliveryDate(date);
    await genericForm.nextPage();
    await deliveryForm.setNote(note);
    await genericForm.nextPage();

    const summaryDetails = await deliveryForm.getSummaryDetails();
    expect(summaryDetails.patientName).to.equal('Cleo');
    expect(summaryDetails.patientId).to.equal('98765');
    expect(summaryDetails.outcome).to.equal(pregnancyOutcome);
    expect(summaryDetails.location).to.equal(locationDelivery);
    expect(summaryDetails.followUpSmsNote1).to.equal('The following will be sent as a SMS to Luna (+50689252525)');
    expect(summaryDetails.followUpSmsNote2).to.equal(followUpSms);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.patient_uuid).to.equal('12345');
    expect(jsonObj.patient_id).to.equal('98765');
    expect(jsonObj.patient_name).to.equal('Cleo');
    expect(jsonObj.chw_name).to.equal('Luna');
    expect(jsonObj.chw_phone).to.equal('+50689252525');
    expect(jsonObj.birth_date).to.equal(date);
    expect(jsonObj.label_pregnancy_outcome).to.equal(pregnancyOutcome);
    expect(jsonObj.label_delivery_code).to.equal(locationDelivery);
    expect(jsonObj.chw_sms).to.equal(followUpSms);
  });

});
