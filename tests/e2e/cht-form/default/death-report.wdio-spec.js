const mockConfig = require('../mock-config');
const moment = require('moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Death Report Form', () => {

  it('should submit a death report', async () => {
    await mockConfig.loadForm('default', 'app', 'death_report');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const date = moment().format('YYYY-MM-DD');
    const deathNote = 'Test note';
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Death report');

    await commonEnketoPage.selectRadioButton('Place of death', 'Health facility');
    await commonEnketoPage.setTextareaValue('Provide any relevant information related to the death of',
      deathNote);
    await commonEnketoPage.setDateValue('Date of Death', date);
    await genericForm.nextPage();

    const summaryTexts = [
      date,
      deathNote
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields.death_details;

    expect(additionalDocs).to.be.empty;

    expect(jsonObj.date_of_death).to.equal(date);
    expect(jsonObj.death_information).to.equal(deathNote);
    expect(jsonObj.place_of_death).to.equal('health_facility');
  });

  it('should render form in the language set for the user', async () => {
    await mockConfig.loadForm('default', 'test', 'death_report_es');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345', name: 'John' } };
      myForm.user = { language: 'es' };
    });

    expect(await (await commonEnketoPage.spanElement('Detalles del fallecimiento')).isDisplayed()).to.be.true;
    expect(await (await commonEnketoPage.spanElement('Fecha del fallecimiento')).isDisplayed()).to.be.true;
    expect(await (await commonEnketoPage.spanElement('Lugar del fallecimiento')).isDisplayed()).to.be.true;
    expect(await (await commonEnketoPage.spanElement('Centro de salud')).isDisplayed()).to.be.true;
    expect(await (await commonEnketoPage.spanElement('Casa')).isDisplayed()).to.be.true;
    expect(await (await commonEnketoPage.spanElement('Otro')).isDisplayed()).to.be.true;
    expect(await (await commonEnketoPage.labelElement('Provea cualquier información relevante relacionada ' +
      'con el fallecimiento de John.')).isDisplayed()).to.be.true;
  });

});
