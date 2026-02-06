const mockConfig = require('../mock-config');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const path = require('path');

/**
 * Integration tests for contact form with file attachments.
 *
 * Note: The cht-form web component tests form rendering and submission,
 * but doesn't include ContactSaveService logic. These tests verify that:
 * 1. File upload widgets render and accept files
 * 2. Attachments are included in form submission
 *
 * The actual contact document creation (type: 'person') and attachment
 * processing via ContactSaveService is tested via E2E tests.
 */
describe('cht-form web component - Contact form with attachments', () => {
  const imagePath = path.join(__dirname, '../../../e2e/default/enketo/images/photo-for-upload-form.png');

  it('should include file attachment in form submission', async () => {
    await mockConfig.loadForm('default', 'test', 'contact-with-attachments');
    await commonEnketoPage.setInputValue('Full name', 'Test Person With Photo');
    await commonEnketoPage.addFileInputValue('Photo', imagePath);
    const [doc] = await mockConfig.submitForm();

    expect(doc.fields.person.name).to.equal('Test Person With Photo');

    expect(doc._attachments).to.exist;
    const attachmentNames = Object.keys(doc._attachments);
    expect(attachmentNames).to.have.lengthOf(1);
    expect(attachmentNames[0]).to.match(/^user-file-photo-for-upload-form.*\.png$/);
  });

  it('should include multiple attachments in form submission', async () => {
    const imagePath2 = path.join(__dirname, '../../../../webapp/src/img/layers.png');

    await mockConfig.loadForm('default', 'test', 'contact-with-attachments');
    await commonEnketoPage.setInputValue('Full name', 'Test Person With Multiple Files');

    await commonEnketoPage.addFileInputValue('Photo', imagePath);
    await commonEnketoPage.addFileInputValue('Document', imagePath2);

    const [doc] = await mockConfig.submitForm();

    expect(doc.fields.person.name).to.equal('Test Person With Multiple Files');

    expect(doc._attachments).to.exist;
    const attachmentNames = Object.keys(doc._attachments);
    expect(attachmentNames).to.have.lengthOf(2);
  });
});
