const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const deathConfirmationPage = require('@page-objects/standard/enketo/death-confirmation.wdio.page');
const moment = require('moment');

describe('cht-form web component - Death Confirmation Form', () => {
  it('should submit a death confirmation', async () => {
    await mockConfig.startMockApp('standard', 'app', 'death_confirmation');

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
    expect(title).to.equal('Death Confirmation');

    const date = moment().format('YYYY-MM-DD');

    const formInfo = await deathConfirmationPage.getFormInformation();
    expect(formInfo.submittedReportChildName).to.equal('Cleo');
    expect(formInfo.deathConfirmationNoteChildName).to.equal('Cleo');
    expect(formInfo.deathConfirmationNoteChwName).to.equal('Luna');
    expect(formInfo.deathConfirmationNoteChwPhone).to.equal('+50689252525');

    await deathConfirmationPage.selectConfirmDeathValue('yes');
    await deathConfirmationPage.selectDeathPlace('facility');
    await deathConfirmationPage.setAdditionalNotes('Test notes - death confirmation');
    await deathConfirmationPage.setDeathDate(date);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.patient_uuid).to.equal('12345');
    expect(jsonObj.patient_id).to.equal('98765');
    expect(jsonObj.child_name).to.equal('Cleo');
    expect(jsonObj.chw_name).to.equal('Luna');
    expect(jsonObj.chw_phone).to.equal('+50689252525');
    expect(jsonObj.death_report.death).to.equal('yes');
    expect(jsonObj.death_report.date_of_death).to.equal(date);
    expect(jsonObj.death_report.place).to.equal('facility');
    expect(jsonObj.death_report.notes).to.equal('Test notes - death confirmation');
  });

});
