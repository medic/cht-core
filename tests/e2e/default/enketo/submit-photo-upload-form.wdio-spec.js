const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const path = require('path');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Submit Photo Upload form', () => {

  before(async () => {
    await commonEnketoPage.uploadForm('photo-upload');
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  beforeEach(async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('photo-upload', false);
    await enketoWidgetsPage.selectImage('photo-upload', path.join(__dirname, '/images/photo-for-upload-form.png'));
    await (enketoWidgetsPage.imagePreview('photo-upload')).waitForDisplayed();
    await genericForm.submitForm();
    await (await enketoWidgetsPage.reportImagePreview()).waitForDisplayed();
  });

  it('submit and edit (no changes)', async () => {
    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    const attachmentNames = Object.keys(initialReport._attachments);
    expect(attachmentNames).to.have.lengthOf(1);
    expect(attachmentNames[0]).to.match(/^user-file-photo-for-upload-form-\d\d?_\d\d?_\d\d?\.png$/);

    await reportsPage.openReport(reportId);
    await reportsPage.editReport();
    await (enketoWidgetsPage.imagePreview('photo-upload')).waitForDisplayed();
    await genericForm.submitForm();

    await (await enketoWidgetsPage.reportImagePreview()).waitForDisplayed();
    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'meta']).to.deep.equal(initialReport.fields);
    expect(updatedReport._attachments).excludingEvery('revpos').to.deep.equal(initialReport._attachments);
    expect(updatedReport.fields.my_photo).to.match(/^photo-for-upload-form.*\.png$/);
  });

  it('submit and edit (with changes)', async () => {
    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    const attachmentNames = Object.keys(initialReport._attachments);
    expect(attachmentNames).to.have.lengthOf(1);
    expect(attachmentNames[0]).to.match(/^user-file-photo-for-upload-form-\d\d?_\d\d?_\d\d?\.png$/);

    await reportsPage.openReport(reportId);
    await reportsPage.editReport();
    await (enketoWidgetsPage.imagePreview('photo-upload')).waitForDisplayed();
    await enketoWidgetsPage.selectImage('photo-upload', path.join(__dirname, '../../../../webapp/src/img/layers.png'));
    await (enketoWidgetsPage.imagePreview('photo-upload')).waitForDisplayed();
    await genericForm.submitForm();

    await (await enketoWidgetsPage.reportImagePreview()).waitForDisplayed();
    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'meta']).not.to.deep.equal(initialReport.fields);
    expect(updatedReport._attachments).excludingEvery('revpos').not.to.deep.equal(initialReport._attachments);

    expect(initialReport.fields.my_photo).to.match(/^photo-for-upload-form.*\.png$/);
    expect(updatedReport.fields.my_photo).to.match(/^layers.*\.png$/);
  });
});
