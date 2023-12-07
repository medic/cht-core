const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const moment = require('moment');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

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

    await commonEnketoPage.selectRadioButton('Pregnancy Outcome', 'Live Birth');
    await commonEnketoPage.selectRadioButton('Location of Delivery', 'Facility');
    await commonEnketoPage.setDateValue('Enter Delivery Date', date);
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      'Cleo', //patient name
      '98765', //patient id
      'Live Birth', //pregnancy outcome
      'Facility', //location delivery
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      'The following will be sent as a SMS to Luna (+50689252525)')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('label', followUpSms)).to.be.true;

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.patient_uuid).to.equal('12345');
    expect(jsonObj.patient_id).to.equal('98765');
    expect(jsonObj.patient_name).to.equal('Cleo');
    expect(jsonObj.chw_name).to.equal('Luna');
    expect(jsonObj.chw_phone).to.equal('+50689252525');
    expect(jsonObj.birth_date).to.equal(date);
    expect(jsonObj.label_pregnancy_outcome).to.equal('Live Birth');
    expect(jsonObj.label_delivery_code).to.equal('Facility');
    expect(jsonObj.chw_sms).to.equal(followUpSms);
  });

});
