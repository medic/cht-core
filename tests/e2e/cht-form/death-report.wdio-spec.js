const mockConfig = require('./mock-config');
const {getFormTitle} = require('@page-objects/default/enketo/generic-form.wdio.page');
const moment = require('moment/moment');
const deathReportForm = require('@page-objects/default/enketo/death-report.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Death Report Form', () => {

  it('should submit a death report', async () => {
    const url = await mockConfig.startMockApp('death_report');
    await browser.url(url);

    const date = moment().format('YYYY-MM-DD');
    const deathNote = 'Test note';
    const title  = await getFormTitle();
    expect(title).to.eq('Death report');

    await genericForm.nextPage();
    await deathReportForm.selectDeathPlace(deathReportForm.PLACE_OF_DEATH.healthFacility);
    await deathReportForm.setDeathInformation(deathNote);
    await deathReportForm.setDeathDate(date);
    await genericForm.nextPage();

    const {deathDate, deathInformation} = await deathReportForm.getSummaryDetails();
    expect(deathDate).to.equal(date);
    expect(deathInformation).to.equal(deathNote);

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    const jsonObj = JSON.parse(data)[0].fields.death_details;

    expect(jsonObj.date_of_death).to.equal(date);
    expect(jsonObj.death_information).to.equal(deathNote);
    expect(jsonObj.place_of_death).to.equal(deathReportForm.PLACE_OF_DEATH.healthFacility);

  });
});
