const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const path = require('path');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('Submit form with file uploads routed to db-doc sub-documents (#10904)', () => {
  const mainImagePath = path.join(__dirname, '/images/photo-for-upload-form.png');
  const subImagePath = path.join(__dirname, '../../../../webapp/src/img/layers.png');

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/db-doc-file-upload`));
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('should route file attachments to the correct owner doc', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('db-doc-file-upload', false);

    await commonEnketoPage.setInputValue('Name', 'Test Sub Doc Upload');
    await commonEnketoPage.addFileInputValue('Main photo', mainImagePath);
    await commonEnketoPage.addFileInputValue('Sub doc photo', subImagePath);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);

    expect(report.fields.name).to.equal('Test Sub Doc Upload');

    // The main doc should have the main_photo attachment (xpath-based name for binary widget)
    const mainAttachments = Object.keys(report._attachments || {});
    const mainPhotoAttachment = mainAttachments.find(name => name.match(/^user-file-photo-for-upload-form.*\.png$/));
    expect(mainPhotoAttachment, 'Main photo should be attached to the report doc').to.exist;

    // The sub-doc ID is stored via db-doc-ref
    const subDocId = report.fields.sub_doc_ref;
    expect(subDocId, 'Sub-doc reference should be populated by db-doc-ref').to.exist;

    // Fetch the sub-doc and verify it has the sub_photo attachment
    const subDoc = await utils.getDoc(subDocId);
    expect(subDoc, 'Sub-doc should exist in the database').to.exist;
    expect(subDoc.type).to.equal('sub_record');

    const subAttachments = Object.keys(subDoc._attachments || {});
    const subPhotoAttachment = subAttachments.find(name => name.match(/^user-file-layers.*\.png$/));
    expect(subPhotoAttachment, 'Sub-doc photo should be attached to the sub-doc').to.exist;
    expect(subDoc._attachments[subPhotoAttachment].content_type).to.equal('image/png');

    // The sub-doc file should NOT be on the main doc
    const mainHasSubFile = mainAttachments.find(name => name.match(/layers/));
    expect(mainHasSubFile, 'Sub-doc file should not appear on the main doc').to.not.exist;
  });
});
