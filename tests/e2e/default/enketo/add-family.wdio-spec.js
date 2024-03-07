const familyForm = require('@page-objects/default/enketo/add-family.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const { cookieLogin } = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Family form', () => {

  before(async () => {
    await commonEnketoPage.uploadForm('add-family-multiple-repeats');
    await cookieLogin();
  });

  it('Submit Add Family form', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('add-family-multiple-repeats', false);
    await familyForm.submitFamilyForm();
    await familyForm.reportCheck('test Family', 'boreholes', 'true', 'true', 'ucid');
    await reportsPage.editReport();
    await commonEnketoPage.setInputValue('Names', 'modified');
    await genericForm.nextPage(7);
    await commonEnketoPage.selectCheckBox('What is the family\'s source of drinking water?', 'Spring');
    await commonEnketoPage.selectRadioButton('Do they have mosquito nets', 'No');
    await commonEnketoPage.selectRadioButton('Do they have an hygienic toilet', 'No');
    await commonEnketoPage.selectCheckBox('Which method of Family Planning is being used', 'Condoms');
    await genericForm.submitForm();
    await familyForm.reportCheck('modified Family', 'boreholes spring', 'false', 'false', 'ucid condoms');

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);
    expect(report.contact).to.deep.equal({ _id: 'e2e_contact_test_id' });
  });
});
