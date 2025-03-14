const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - form with extension-libs', () => {

  it('submits form successfully', async () => {
    await mockConfig.loadForm('default', 'test', 'with-extension-libs');

    await commonEnketoPage.setInputValue('First Number', 1);
    await commonEnketoPage.setInputValue('Second Number', 3);
    const [{ fields }] = await mockConfig.submitForm();

    expect(fields.page.first).to.equal('1');
    expect(fields.page.second).to.equal('3');
    // extension-libs are currently not operable in cht-form. Should return empty string with no error.
    expect(fields.page.average).to.equal('');
  });
});
