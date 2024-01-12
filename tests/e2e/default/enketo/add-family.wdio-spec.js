const fs = require('fs');

const familyForm = require('@page-objects/default/enketo/add-family.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const { cookieLogin } = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

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
    await familyForm.submitFamilyForm();
    await familyForm.reportCheck('test Family', 'boreholes', 'true', 'true', 'ucid');
    await genericForm.editForm();
    await commonEnketoPage.setInputValue('Names', 'modified');
    await genericForm.nextPage(7);
    await commonEnketoPage.selectCheckBox('What is the family\'s source of drinking water?', 'Spring');
    await commonEnketoPage.selectRadioButton('Do they have mosquito nets', 'No');
    await commonEnketoPage.selectRadioButton('Do they have an hygienic toilet', 'No');
    await commonEnketoPage.selectCheckBox('Which method of Family Planning is being used', 'Condoms');
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
