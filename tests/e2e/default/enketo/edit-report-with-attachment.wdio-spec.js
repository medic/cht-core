const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const uuid = require('uuid').v4;
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Edit report with attachment', () => {

  const instanceID = uuid();
  const reportModelXml = `
<one_text_form xmlns:jr="http://openrosa.org/javarosa" id="required_note">
  <intro>initial text</intro>
  <meta>
    <instanceID>uuid:${instanceID}</instanceID>
    <deprecatedID/>
  </meta>
</one_text_form>`;


  const reportDoc ={
    _id: uuid(),
    form: 'one-text-form',
    type: 'data_record',
    reported_date: Date.now(),
    content_type: 'xml',
    //contact: userContactDoc,
    hidden_fields: ['meta'],
    fields: {
      // to prove that when xml attachment exists, it is used to populate edit form instead of fields
      intro: 'not same text as in xml attachment',
      meta: {
        instanceID: `uuid:${instanceID}`,
        deprecatedID: ''
      }
    },
    _attachments: {
      content: {
        content_type: 'application/octet-stream',
        data: Buffer.from(reportModelXml).toString('base64'),
      }
    }
  };

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
    reportDoc._id = uuid();
    await utils.saveDoc(reportDoc);

    await commonElements.goToReports();

    await reportsPage.openReport(reportDoc._id);
    await reportsPage.editReport();
    await genericForm.submitForm();

    const editedReport = await utils.getDoc(reportDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(editedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text' });

    await reportsPage.openReport(reportDoc._id);
    await reportsPage.editReport();
    await genericForm.submitForm();

    const twiceEditedReport = await utils.getDoc(reportDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(twiceEditedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text' });
  });

  it('should save edits', async () => {
    reportDoc._id = uuid();
    await utils.saveDoc(reportDoc);
    await browser.refresh();

    await commonElements.goToReports();
    await reportsPage.openReport(reportDoc._id);
    await reportsPage.editReport();
    await commonEnketoPage.setInputValue('Enter text', 'initial text updated');
    await genericForm.submitForm();

    const editedReport = await utils.getDoc(reportDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(editedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text updated' });

    await reportsPage.openReport(reportDoc._id);
    await reportsPage.editReport();
    await commonEnketoPage.setInputValue('Enter text', 'initial text updated twice');
    await genericForm.submitForm();

    const twiceEditedReport = await utils.getDoc(reportDoc._id);
    expect(twiceEditedReport._attachments).to.be.undefined;
    expect(twiceEditedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text updated twice' });
  });
});
