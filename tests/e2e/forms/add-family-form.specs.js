const familyForm = require('../../page-objects/forms/add-family-form.po');
const genericForm = require('../../page-objects/forms/generic-form.po');
const common = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');

describe('Family form', () => {
  const contactId = userData.contactId;
  const docs = userData.docs;

  beforeAll(async () => {
    await utils.saveDocs(docs);
    await familyForm.configureForm(contactId);
  });

  afterEach(async () => {
    await utils.resetBrowser();
  });

  afterAll(async () => {
    await utils.afterEach();
  });

  it('Submit Add Family form', async () => {
    await common.hideSnackbar();
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
    await genericForm.validateReportNative();
  });
});
