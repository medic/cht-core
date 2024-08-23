const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Phone Widget', () => {
  it('submits valid phone numbers with no errors', async () => {
    await mockConfig.loadForm('default', 'test', 'phone_widget');

    await commonEnketoPage.setInputValue('Deprecated Phone', '+254712345671');
    await commonEnketoPage.setInputValue('Phone – allow duplicates', '+254712345673');
    await commonEnketoPage.setInputValue('Phone – unique', '+254712345674');

    const [{ fields }] = await mockConfig.submitForm();

    expect(fields).excluding(['meta']).to.deep.equal({
      phone_widgets: {
        deprecated_phone: '+254712345671',
        phone: '+254712345673',
        phone_unique: '+254712345674',
      }
    });
  });

  it('shows error when required phone numbers are not provided', async () => {
    await mockConfig.loadForm('default', 'test', 'phone_widget');

    await genericForm.submitForm({ waitForPageLoaded: false });

    expect(await commonEnketoPage.isRequiredMessageDisplayed('Deprecated Phone')).to.be.true;
    expect(await commonEnketoPage.isRequiredMessageDisplayed('Phone – allow duplicates')).to.be.false;
    expect(await commonEnketoPage.isRequiredMessageDisplayed('Phone – unique')).to.be.true;

    await commonEnketoPage.setInputValue('Deprecated Phone', '+254712345671');
    await commonEnketoPage.setInputValue('Phone – unique', '+254712345674');

    expect(await commonEnketoPage.isRequiredMessageDisplayed('Deprecated Phone')).to.be.false;
    expect(await commonEnketoPage.isRequiredMessageDisplayed('Phone – unique')).to.be.false;

    const [{ fields }] = await mockConfig.submitForm();

    expect(fields).excluding(['meta']).to.deep.equal({
      phone_widgets: {
        deprecated_phone: '+254712345671',
        phone: '',
        phone_unique: '+254712345674',
      }
    });
  });

  it('shows error when invalid phone numbers are provided', async () => {
    await mockConfig.loadForm('default', 'test', 'phone_widget');

    await commonEnketoPage.setInputValue('Deprecated Phone', '+111111111111');
    await commonEnketoPage.setInputValue('Phone – allow duplicates', 'hello world');
    await commonEnketoPage.setInputValue('Phone – unique', '1');

    await genericForm.submitForm({ waitForPageLoaded: false });

    expect(await commonEnketoPage.isConstraintMessageDisplayed('Deprecated Phone')).to.be.true;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – allow duplicates')).to.be.true;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – unique')).to.be.true;

    await commonEnketoPage.setInputValue('Deprecated Phone', '+254712345671');
    await commonEnketoPage.setInputValue('Phone – allow duplicates', '+254712345673');
    await commonEnketoPage.setInputValue('Phone – unique', '+254712345674');

    expect(await commonEnketoPage.isConstraintMessageDisplayed('Deprecated Phone')).to.be.false;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – allow duplicates')).to.be.false;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – unique')).to.be.false;

    const [{ fields }] = await mockConfig.submitForm();

    expect(fields).excluding(['meta']).to.deep.equal({
      phone_widgets: {
        deprecated_phone: '+254712345671',
        phone: '+254712345673',
        phone_unique: '+254712345674',
      }
    });
  });

  it('normalizes phone numbers before saving', async () => {
    await mockConfig.loadForm('default', 'test', 'phone_widget');

    await commonEnketoPage.setInputValue('Deprecated Phone', '+.2/5-4 7.1.2.3.4.5.6.7.1.       ');
    await commonEnketoPage.setInputValue('Phone – allow duplicates', '+254-712-345-673');
    await commonEnketoPage.setInputValue('Phone – unique', ' +254 712 345 674 ');

    const [{ fields }] = await mockConfig.submitForm();

    expect(fields).excluding(['meta']).to.deep.equal({
      phone_widgets: {
        deprecated_phone: '+254712345671',
        phone: '+254712345673',
        phone_unique: '+254712345674',
      }
    });
  });
});
