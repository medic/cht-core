const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const dangerSignPage = require('@page-objects/default/enketo/danger-sign.wdio.page');

describe('Pregnancy danger sign follow-up form', () => {
  before(async () => {
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('Submit and validate Pregnancy danger sign follow-up form and keeps the report minified', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport('pregnancy_danger_sign_follow_up', false);
    await genericForm.selectContact('jack');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'No');
    await reportsPage.submitForm();

    await genericForm.verifyReport();
  });

  it('should submit and edit Pregnancy danger sign follow-up form (no changes)', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport('pregnancy_danger_sign_follow_up', false);
    await genericForm.selectContact('jill');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'No');
    await reportsPage.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);

    expect(initialReport._attachments).to.equal(undefined);

    await reportsPage.editReport(reportId);
    await genericForm.nextPage();
    await reportsPage.submitForm();

    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'deprecatedID']).to.deep.equal(initialReport.fields);

  });

  it('should submit and edit Pregnancy danger sign follow-up form with changes', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport('pregnancy_danger_sign_follow_up', false);
    await genericForm.selectContact('jill');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'Yes');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'No');
    await reportsPage.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);

    expect(initialReport._attachments).to.equal(undefined);

    await reportsPage.editReport(reportId);
    await genericForm.selectContact('jack');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'No');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'Yes');
    await dangerSignPage.selectAllDangerSignsPregnancy();
    await reportsPage.submitForm();

    const updatedReport = await utils.getDoc(reportId);

    await commonPage.openFastActionReport('pregnancy_danger_sign_follow_up', false);
    await genericForm.selectContact('jack');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Did the woman visit the health facility as recommended?', 'No');
    await commonEnketoPage.selectRadioButton('Is she still experiencing any danger signs?', 'Yes');
    await dangerSignPage.selectAllDangerSignsPregnancy();
    await reportsPage.submitForm();

    const compareReportId = await reportsPage.getCurrentReportId();
    const compareReport = await utils.getDoc(compareReportId);

    expect(updatedReport.fields).excludingEvery(['instanceID', 'deprecatedID']).to.deep.equal(compareReport.fields);
  });
});
