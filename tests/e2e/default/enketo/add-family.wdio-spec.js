const familyForm = require('../../../page-objects/forms/add-family-form.wdio.page');
const genericForm = require('../../../page-objects/forms/generic-form.wdio.page');
const common = require('../../../page-objects/common/common.wdio.page');
const utils = require('../../../utils');
const userData = require('../../../page-objects/forms/data/user.po.data');
const reportsPage = require('../../../page-objects/reports/reports.wdio.page');
const { cookieLogin } = require('../../../page-objects/login/login.wdio.page');

describe('Family form', () => {
  const contactId = userData.contactId;
  const docs = userData.docs;
  const formTitle = familyForm.docs[0].title;

  before(async () => {
    await utils.saveDocs(docs);
    await familyForm.configureForm(contactId);
    await cookieLogin();
  });

  it('Submit Add Family form', async () => {
    await common.goToReports();
    await reportsPage.openForm(formTitle);
    await familyForm.fillPrimaryCaregiver('test');
    await genericForm.nextPage();
    await familyForm.fillPrimaryTel();
    await genericForm.nextPage();
    await familyForm.fillSexAndAge();
    await genericForm.nextPage();
    await familyForm.fillChildren();
    await genericForm.nextPage();
    await familyForm.registerChildrenOption();
    await genericForm.nextPage();
    await familyForm.womenBetween();
    await genericForm.nextPage();
    await familyForm.registerWomenOption();
    await genericForm.nextPage();
    await familyForm.finalSurvey(0, 0, 0, 0);
    await reportsPage.submitForm();
    await familyForm.reportCheck('test Family', 'boreholes', 'true', 'true', 'ucid');
    await genericForm.editForm();
    await familyForm.fillPrimaryCaregiver('modified');
    await genericForm.nextPage(7);
    await familyForm.finalSurvey(1, 1, 1, 1);
    await reportsPage.submitForm();
    await familyForm.reportCheck(
      'modified Family',
      'boreholes spring',
      'false',
      'false',
      'ucid condoms'
    );

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);
    expect(report.contact).to.deep.equal({ _id: 'e2e_contact_test_id' });
  });
});
