const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const childHealthRegistrationPage = require('@page-objects/standard/enketo/child-health-registration.wdio.page');

describe('cht-form web component - Child Health Registration Form', () => {

  it('should submit a child health registration', async () => {
    await mockConfig.startMockApp('standard', 'app', 'child_health_registration');

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

    const formInfo = await childHealthRegistrationPage.getFormInformation();
    expect(formInfo.parentName).to.equal('Luna');
    expect(formInfo.parentPhone).to.equal('+50689252525');
    expect(formInfo.defaultSms).to.equal(defaultSms);

    await childHealthRegistrationPage.setPersonalNote('Test note - child health registration');
    await genericForm.nextPage();

    const summaryInformation = await childHealthRegistrationPage.getSummaryInformation();
    expect(summaryInformation.childId).to.equal('98765');
    expect(summaryInformation.childName).to.equal('Cleo');
    expect(summaryInformation.parentContactName).to.equal('Luna');
    expect(summaryInformation.parentContactPhone).to.equal('+50689252525');
    expect(summaryInformation.smsContent).to.equal(`${defaultSms} Test note - child health registration`);

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
