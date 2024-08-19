const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const uuid = require('uuid').v4;
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { editReportWithAttachmentDoc } = require('@page-objects/default/enketo/custom-doc.wdio.page');

describe('Edit report with attachment', () => {  

  before(async () => {
    const formDoc = await commonEnketoPage.uploadForm('one-text-form', false);
    formDoc.context = {
      expression: 'summary.alive',
    };
    await utils.saveDoc(formDoc);
    await loginPage.cookieLogin();
    await commonElements.waitForPageLoaded();
    await commonElements.hideSnackbar();
  });

  it('should remove attachment when saving', async () => {
    editReportWithAttachmentDoc._id = uuid();
    await utils.saveDoc(editReportWithAttachmentDoc);

    await commonElements.goToReports();

    await reportsPage.openReport(editReportWithAttachmentDoc._id);
    await reportsPage.editReport();
    await genericForm.submitForm();

    const editedReport = await utils.getDoc(editReportWithAttachmentDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(editedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text' });

    await reportsPage.openReport(editReportWithAttachmentDoc._id);
    await reportsPage.editReport();
    await genericForm.submitForm();

    const twiceEditedReport = await utils.getDoc(editReportWithAttachmentDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(twiceEditedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text' });
  });

  it('should save edits', async () => {
    editReportWithAttachmentDoc._id = uuid();
    await utils.saveDoc(editReportWithAttachmentDoc);
    await browser.refresh();

    await commonElements.goToReports();
    await reportsPage.openReport(editReportWithAttachmentDoc._id);
    await reportsPage.editReport();
    await commonEnketoPage.setInputValue('Enter text', 'initial text updated');
    await genericForm.submitForm();

    const editedReport = await utils.getDoc(editReportWithAttachmentDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(editedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text updated' });

    await reportsPage.openReport(editReportWithAttachmentDoc._id);
    await reportsPage.editReport();
    await commonEnketoPage.setInputValue('Enter text', 'initial text updated twice');
    await genericForm.submitForm();

    const twiceEditedReport = await utils.getDoc(editReportWithAttachmentDoc._id);
    expect(twiceEditedReport._attachments).to.be.undefined;
    expect(twiceEditedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text updated twice' });
  });
});
