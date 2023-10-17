const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Child Health Registration Form', () => {

  it('should submit a child health registration', async () => {
    const url = await mockConfig.startMockApp('standard', 'child_health_registration');
    await browser.url(url);

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = {
        contact: {
          _id: '12345',
          patient_id: '79376',
          name: 'Cleo',
          parent: { contact: { phone: '+50689252525', name: 'Luna' } }
        }
      };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Child Health Registration');

    //TEST IN PROGRESS
    await browser.pause(5000);
  });

});
