const mockConfig = require('../mock-config');
const moment = require('moment/moment');
const deathReportForm = require('@page-objects/default/enketo/death-report.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Death Report Form', () => {

  it('should submit a death report', async () => {
    await mockConfig.startMockApp('default', 'app', 'death_report');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const date = moment().format('YYYY-MM-DD');
    const deathNote = 'Test note';
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Death report');

    await deathReportForm.selectDeathPlace(deathReportForm.PLACE_OF_DEATH.healthFacility);
    await deathReportForm.setDeathInformation(deathNote);
    await deathReportForm.setDeathDate(date);
    await genericForm.nextPage();

    const {deathDate, deathInformation} = await deathReportForm.getSummaryDetails();
    expect(deathDate).to.equal(date);
    expect(deathInformation).to.equal(deathNote);

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields.death_details;

    expect(jsonObj.date_of_death).to.equal(date);
    expect(jsonObj.death_information).to.equal(deathNote);
    expect(jsonObj.place_of_death).to.equal(deathReportForm.PLACE_OF_DEATH.healthFacility);
  });

  it.only('should verify the Spanish translation for the first page of the form', async () => {
    await mockConfig.startMockApp('default', 'test', 'death_report_es');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345', name: 'John' } };
      myForm.user = { language: 'es' };
    });

    const labelsValues = await deathReportForm.getLabelsValues();
    expect(labelsValues.details).to.equal('Detalles del fallecimiento');
    expect(labelsValues.date).to.equal('Fecha del fallecimiento');
    expect(labelsValues.place).to.equal('Lugar del fallecimiento');
    // expect(labelsValues.healthFacility).to.equal('Centro de salud');
    expect(labelsValues.home).to.equal('Casa');
    expect(labelsValues.other).to.equal('Otro');
    expect(labelsValues.notes)
      .to.equal('Provea cualquier información relevante relacionada con el fallecimiento de John.');

  });

});
