const photoUpload = require('../../../page-objects/default/enketo/photo-upload.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const utils = require('../../../utils');
const userData = require('../../../page-objects/default/users/user.data');
const path = require('path');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');

const { userContactDoc, docs } = userData;

describe('Submit Photo Upload form', () => {
  before(async () => {
    await utils.saveDocs(docs);
    await photoUpload.configureForm(userContactDoc);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('submit and edit (no changes)', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport(photoUpload.docs[0].internalId, false);
    await photoUpload.selectImage(path.join(__dirname, '/images/photo-for-upload-form.png'));
    await (photoUpload.imagePreview()).waitForDisplayed();

    await reportsPage.submitForm();

    await (await photoUpload.reportImagePreview()).waitForDisplayed();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    expect(Object.keys(initialReport._attachments)).to.deep.equal(['user-file/photo-upload/my_photo']);

    await reportsPage.editReport(reportId);
    await (photoUpload.imagePreview()).waitForDisplayed();
    await reportsPage.submitForm();

    await (await photoUpload.reportImagePreview()).waitForDisplayed();
    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'meta']).to.deep.equal(initialReport.fields);
    expect(updatedReport._attachments).excludingEvery('revpos').to.deep.equal(initialReport._attachments);
    expect(updatedReport.fields.my_photo).to.match(/^photo-for-upload-form.*\.png$/);
  });

  it('submit and edit (with changes)', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport(photoUpload.docs[0].internalId, false);
    await photoUpload.selectImage(path.join(__dirname, '/images/photo-for-upload-form.png'));
    await (photoUpload.imagePreview()).waitForDisplayed();

    await reportsPage.submitForm();

    await (await photoUpload.reportImagePreview()).waitForDisplayed();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);
    expect(Object.keys(initialReport._attachments)).to.deep.equal(['user-file/photo-upload/my_photo']);

    await reportsPage.editReport(reportId);
    await (photoUpload.imagePreview()).waitForDisplayed();
    await photoUpload.selectImage(path.join(__dirname, '../../../../webapp/src/img/layers.png'));
    await (photoUpload.imagePreview()).waitForDisplayed();
    await reportsPage.submitForm();

    await (await photoUpload.reportImagePreview()).waitForDisplayed();
    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'meta']).not.to.deep.equal(initialReport.fields);
    expect(updatedReport._attachments).excludingEvery('revpos').not.to.deep.equal(initialReport._attachments);

    expect(initialReport.fields.my_photo).to.match(/^photo-for-upload-form.*\.png$/);
    expect(updatedReport.fields.my_photo).to.match(/^layers.*\.png$/);
  });
});
