const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Dates', () => {

  it('functions calculate difference between two dates', async () => {
    await mockConfig.loadForm('default', 'test', 'dates');

    const dateA = '2021-01-01';
    const dateB = '2025-11-25';

    await commonEnketoPage.setDateValue('Date A', dateA);
    await commonEnketoPage.setDateValue('Date B', dateB);
    const [{ fields }] = await mockConfig.submitForm();

    expect(fields.diff_in_days).to.equal('1789');
    expect(fields.diff_in_weeks).to.equal('255');
    expect(fields.diff_in_months).to.equal('58');
    expect(fields.diff_in_years).to.equal('4');
  });
});
