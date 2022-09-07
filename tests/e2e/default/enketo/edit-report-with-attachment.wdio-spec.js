const genericForm = require('../../../page-objects/forms/generic-form.wdio.page');
const reportsPage = require('../../../page-objects/reports/reports.wdio.page');
const uuid = require('uuid').v4;
const common = require('../../../page-objects/common/common.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const utils = require('../../../utils');
const userData = require('../../../page-objects/forms/data/user.po.data');
const fs = require('fs');
const commonElements = require('../../../page-objects/common/common.wdio.page');
const oneTextForm = fs.readFileSync(`${__dirname}/forms/one-text-form.xml`, 'utf8');

const instanceID = uuid();
const reportModelXml = `
<one_text_form xmlns:jr="http://openrosa.org/javarosa" id="required_note">
  <intro>initial text</intro>
  <meta>
    <instanceID>uuid:${instanceID}</instanceID>
    <deprecatedID/>
  </meta>
</one_text_form>`;

const { userContactDoc, docs } = userData;
const formDoc = {
  _id: 'form:one_text_form',
  internalId: 'one_text_form',
  title: 'One text form',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(oneTextForm).toString('base64'),
    }
  }
};
const reportDoc ={
  _id: uuid(),
  form: formDoc.internalId,
  type: 'data_record',
  reported_date: Date.now(),
  content_type: 'xml',
  contact: userContactDoc,
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


describe('Edit report with attachmnet', () => {
  before(async () => {
    await utils.seedTestData(userContactDoc, [...docs, formDoc]);
    await loginPage.cookieLogin();
    await common.hideSnackbar();
  });

  it('should remove attachment when saving', async () => {
    reportDoc._id = uuid();
    await utils.saveDoc(reportDoc);

    await commonElements.goToReports();

    await reportsPage.editReport(reportDoc._id);
    // await browser.debug();
    await reportsPage.submitForm();

    const editedReport = await utils.getDoc(reportDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(editedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text' });

    await reportsPage.editReport(reportDoc._id);
    await reportsPage.submitForm();

    const twiceEditedReport = await utils.getDoc(reportDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(twiceEditedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'initial text' });
  });

  it('should save edits', async () => {
    reportDoc._id = uuid();
    await utils.saveDoc(reportDoc);

    await commonElements.goToReports();
    await reportsPage.editReport(reportDoc._id);
    await (await genericForm.fieldByName(formDoc.internalId, 'intro')).setValue('updated text');
    await reportsPage.submitForm();

    const editedReport = await utils.getDoc(reportDoc._id);
    expect(editedReport._attachments).to.be.undefined;
    expect(editedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'updated text' });

    await reportsPage.editReport(reportDoc._id);
    await (await genericForm.fieldByName(formDoc.internalId, 'intro')).setValue('twice updated text');
    await reportsPage.submitForm();

    const twiceEditedReport = await utils.getDoc(reportDoc._id);
    expect(twiceEditedReport._attachments).to.be.undefined;
    expect(twiceEditedReport.fields).excludingEvery('meta').to.deep.equal({ intro: 'twice updated text' });
  });
});
