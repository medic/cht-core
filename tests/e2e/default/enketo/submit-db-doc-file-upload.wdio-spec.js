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
  const subImagePath2 = path.join(__dirname, '../../../../webapp/src/img/icon.png');

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/db-doc-file-upload`));
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/db-doc-multi-file-upload`));
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/db-doc-repeat-file-upload`));
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

  it('should route file attachments correctly with multiple sub-docs', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('db-doc-multi-file-upload', false);

    await commonEnketoPage.setInputValue('Name', 'Test Multi Sub Doc');
    await commonEnketoPage.addFileInputValue('Main photo', mainImagePath);
    await commonEnketoPage.addFileInputValue('Sub doc A photo', subImagePath);
    await commonEnketoPage.addFileInputValue('Sub doc B photo', subImagePath2);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);

    expect(report.fields.name).to.equal('Test Multi Sub Doc');

    const mainAttachments = Object.keys(report._attachments || {});
    const mainPhotoAttachment = mainAttachments.find(name => name.match(/^user-file-photo-for-upload-form.*\.png$/));
    expect(mainPhotoAttachment, 'Main photo should be attached to the report doc').to.exist;

    // Verify sub-doc A
    const subDocAId = report.fields.sub_doc_a_ref;
    expect(subDocAId, 'Sub-doc A reference should be populated').to.exist;

    const subDocA = await utils.getDoc(subDocAId);
    expect(subDocA.type).to.equal('sub_record_a');

    const subAAttachments = Object.keys(subDocA._attachments || {});
    const subAPhoto = subAAttachments.find(name => name.match(/^user-file-layers.*\.png$/));
    expect(subAPhoto, 'Sub-doc A photo should be attached to sub-doc A').to.exist;
    expect(subDocA._attachments[subAPhoto].content_type).to.equal('image/png');

    // Verify sub-doc B
    const subDocBId = report.fields.sub_doc_b_ref;
    expect(subDocBId, 'Sub-doc B reference should be populated').to.exist;

    const subDocB = await utils.getDoc(subDocBId);
    expect(subDocB.type).to.equal('sub_record_b');

    const subBAttachments = Object.keys(subDocB._attachments || {});
    const subBPhoto = subBAttachments.find(name => name.match(/^user-file-icon.*\.png$/));
    expect(subBPhoto, 'Sub-doc B photo should be attached to sub-doc B').to.exist;
    expect(subDocB._attachments[subBPhoto].content_type).to.equal('image/png');

    // Cross-contamination checks: no sub-doc files on main doc
    const mainHasSubAFile = mainAttachments.find(name => name.match(/layers/));
    expect(mainHasSubAFile, 'Sub-doc A file should not appear on the main doc').to.not.exist;
    const mainHasSubBFile = mainAttachments.find(name => name.match(/icon/));
    expect(mainHasSubBFile, 'Sub-doc B file should not appear on the main doc').to.not.exist;

    // No cross-contamination between sub-docs
    const subAHasSubBFile = subAAttachments.find(name => name.match(/icon/));
    expect(subAHasSubBFile, 'Sub-doc B file should not appear on sub-doc A').to.not.exist;
    const subBHasSubAFile = subBAttachments.find(name => name.match(/layers/));
    expect(subBHasSubAFile, 'Sub-doc A file should not appear on sub-doc B').to.not.exist;
  });

  it('should route file attachments to sub-docs inside repeat groups', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('db-doc-repeat-file-upload', false);

    await commonEnketoPage.setInputValue('Name', 'Test Repeat Sub Doc');

    // The repeat starts with zero instances, so add the first intance before uploading
    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.addFileInputValue('Repeat photo', mainImagePath, { repeatIndex: 0 });

    // Add a second repeat and upload a different file
    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.addFileInputValue('Repeat photo', subImagePath, { repeatIndex: 1 });

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);

    expect(report.fields.name).to.equal('Test Repeat Sub Doc');

    // There should be two repeat sections, each with a db-doc-ref
    const repeatSections = report.fields.repeat_section;
    expect(repeatSections).to.be.an('array');
    expect(repeatSections.length).to.equal(2);

    // Verify first repeat sub-doc
    const repeatDoc1Id = repeatSections[0].repeat_doc_ref;
    expect(repeatDoc1Id, 'First repeat doc reference should be populated').to.exist;

    const repeatDoc1 = await utils.getDoc(repeatDoc1Id);
    expect(repeatDoc1.type).to.equal('repeat_record');

    const repeat1Attachments = Object.keys(repeatDoc1._attachments || {});
    const repeat1Photo = repeat1Attachments.find(name => name.match(/^user-file-photo-for-upload-form.*\.png$/));
    expect(repeat1Photo, 'First repeat doc should have its photo attached').to.exist;

    // Verify second repeat sub-doc
    const repeatDoc2Id = repeatSections[1].repeat_doc_ref;
    expect(repeatDoc2Id, 'Second repeat doc reference should be populated').to.exist;

    const repeatDoc2 = await utils.getDoc(repeatDoc2Id);
    expect(repeatDoc2.type).to.equal('repeat_record');

    const repeat2Attachments = Object.keys(repeatDoc2._attachments || {});
    const repeat2Photo = repeat2Attachments.find(name => name.match(/^user-file-layers.*\.png$/));
    expect(repeat2Photo, 'Second repeat doc should have its photo attached').to.exist;

    // No file attachments should be on the main report doc
    const mainAttachments = Object.keys(report._attachments || {});
    const mainUserFiles = mainAttachments.filter(name => name.startsWith('user-file-'));
    expect(mainUserFiles, 'No user files should be on the main doc').to.be.empty;

    // No cross-contamination between repeat sub-docs
    const repeat1HasRepeat2File = repeat1Attachments.find(name => name.match(/layers/));
    expect(repeat1HasRepeat2File, 'Repeat 2 file should not appear on repeat 1 doc').to.not.exist;
    const repeat2HasRepeat1File = repeat2Attachments.find(name => name.match(/photo-for-upload-form/));
    expect(repeat2HasRepeat1File, 'Repeat 1 file should not appear on repeat 2 doc').to.not.exist;
  });
});
