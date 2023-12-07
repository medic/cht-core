const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Child Health Registration Form', () => {

  it('should submit a child health registration', async () => {
    await mockConfig.loadForm('standard', 'app', 'child_health_registration');

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
    expect(title).to.equal('Child Health Registration');

    const defaultSms = 'Good news, Luna! Cleo (98765) has been registered for Child Health messages. Thank you!';

    expect(await commonEnketoPage.isElementDisplayed('label',
      'The following message will be sent to Luna (+50689252525):')).to.be.true;
    expect(await commonEnketoPage.isElementDisplayed('span', defaultSms)).to.be.true;

    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:',
      'Test note - child health registration');
    await genericForm.nextPage();

    const summaryTexts = [
      '98765', //child id
      'Cleo', //child name
      'Luna', //chw name
      '+50689252525', //chw phone
      `${defaultSms} Test note - child health registration` //sms content
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.patient_uuid).to.equal('12345');
    expect(jsonObj.patient_id).to.equal('98765');
    expect(jsonObj.patient_name).to.equal('Cleo');
    expect(jsonObj.chw_name).to.equal('Luna');
    expect(jsonObj.chw_phone).to.equal('+50689252525');
    expect(jsonObj.chw_sms).to.equal(`${defaultSms} Test note - child health registration`);
  });

});
