const familyForm = require('../../page-objects/forms/add-family-form.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const common = require('../../page-objects/common/common.wdio.page.js');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');

describe('Family form', () => {
  const contactId = userData.contactId;
  const docs = userData.docs;

  before(async () => {
    await utils.saveDocs(docs);
    await familyForm.configureForm(contactId);
  });

  it('Submit Add Family form', async () => {
    await common.goToReportsNative(true);
    await genericForm.selectFormNative('any');
    await familyForm.fillPrimaryCaregiver('test');
    await genericForm.nextPageNative();
    await familyForm.fillPrimaryTel();
    await genericForm.nextPageNative();
    await familyForm.fillSexAndAge();
    await genericForm.nextPageNative();
    await familyForm.fillChildren();
    await genericForm.nextPageNative();
    await familyForm.registerChildrenOption();
    await genericForm.nextPageNative();
    await familyForm.womenBetween();
    await genericForm.nextPageNative();
    await familyForm.registerWomenOption();
    await genericForm.nextPageNative();
    await familyForm.finalSurvey(0, 0, 0, 0);
    await genericForm.submitReports();
    await familyForm.reportCheck('test Family', 'boreholes', 'true', 'true', 'ucid');
    await genericForm.editFormNative();
    await familyForm.fillPrimaryCaregiver('modified');
    await genericForm.nextPageNative(8);
    await familyForm.finalSurvey(1, 1, 1, 1);
    await genericForm.submitReports();
    await familyForm.reportCheck(
      'modified Family',
      'boreholes spring',
      'false',
      'false',
      'ucid condoms'
    );
    await genericForm.reportApproveNative();
    await genericForm.invalidateReportNative();
    const reportId = await reportsPage.getCurrentReportId();
    const invalidatedReport = await utils.getDoc(reportId);
    expect(invalidatedReport.verified).to.be.false;
    expect(invalidatedReport.contact).to.equal({ _id: 'e2e_contact_test_id' });

    await genericForm.validateReportNative();
    const validatedReport = await utils.getDoc(reportId);
    expect(validatedReport.verified).to.be.true;
    expect(validatedReport.contact).to.equal({ _id: 'e2e_contact_test_id' });
  });
});
