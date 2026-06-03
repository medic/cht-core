const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');

const BADGE_ATTACHMENT = 'user-file-inline-binary-report/badge';
const BADGE_REFERENCE = 'inline-binary-report/badge';

describe('Submit inline-binary report form', () => {

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/inline-binary-report`));
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('preserves an untouched inline-binary field and its attachment on edit', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('inline-binary-report', false);
    await commonEnketoPage.setInputValue('Patient Name', 'Ada');
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    // On create the inline-binary default is attached and the field rewritten to
    // the bare reference.
    const reportId = await reportsPage.getCurrentReportId();
    expect(reportId).to.exist;
    const initialReport = await utils.getDoc(reportId);
    expect(Object.keys(initialReport._attachments)).to.deep.equal([BADGE_ATTACHMENT]);
    expect(initialReport.fields.badge).to.equal(BADGE_REFERENCE);

    // Edit only the visible field, leaving the inline binary untouched.
    await reportsPage.openReport(reportId);
    await commonPage.accessEditOption();
    await commonEnketoPage.setInputValue('Patient Name', 'Ada Lovelace');
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields.patient_name).to.equal('Ada Lovelace');
    expect(updatedReport.fields.badge).to.equal(BADGE_REFERENCE);
    expect(updatedReport._attachments[BADGE_ATTACHMENT]).to.exist;
  });
});
