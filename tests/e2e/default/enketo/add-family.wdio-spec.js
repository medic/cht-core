const fs = require('fs');

const familyForm = require('../../../page-objects/default/enketo/add-family.wdio.page');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const utils = require('../../../utils');
const userData = require('../../../page-objects/default/users/user.data');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const { cookieLogin } = require('../../../page-objects/default/login/login.wdio.page');

describe('Family form', () => {
  const contactId = userData.contactId;
  const userDocs = userData.docs;
  const formXML = fs.readFileSync(`${__dirname}/forms/add-family-multiple-repeats.xml`, 'utf8');
  const formDoc = {
    _id: 'form:add-family',
    internalId: 'add-family',
    title: 'AddFamily',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(formXML).toString('base64'),
      },
    },
  };

  before(async () => {
    await utils.saveDocs(userDocs);
    await utils.seedTestData(contactId, [ formDoc ]);
    await cookieLogin();
  });

  it('Submit Add Family form', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport(formDoc.internalId, false);
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
