const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const undoDeathReportForm = require('@page-objects/default/enketo/undo-death-report.page');

describe('cht-form web component - Undo Death Report Form', () => {

  it('should submit an undo death report', async () => {
    await mockConfig.loadForm('default', 'app', 'undo_death_report');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345', name: 'John'} };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Undo death report');

    expect(await undoDeathReportForm.getConfirmationPatientName()).to.equal('John');
    await undoDeathReportForm.setConfirmUndoDeathOption();

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.patient_name).to.equal('John');
    expect(jsonObj.undo.undo_information).to.equal('yes');
  });

});
