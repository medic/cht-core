const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Undo Death Report Form', () => {

  it('should submit an undo death report', async () => {
    await mockConfig.loadForm('default', 'app', 'undo_death_report');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345', name: 'John'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Undo death report');

    expect(await commonEnketoPage.isElementDisplayed('span', 'John')).to.be.true;
    await commonEnketoPage.selectRadioButton('Submitting this form will undo the death report of John. ' +
      'Are you sure you want to undo the death report?', 'Yes');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.patient_name).to.equal('John');
    expect(jsonObj.undo.undo_information).to.equal('yes');
  });

});
