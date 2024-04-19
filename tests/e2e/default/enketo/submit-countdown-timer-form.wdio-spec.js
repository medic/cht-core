const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Countdown timer widget', () => {

  before(async () => {
    await commonEnketoPage.uploadForm('countdown-timer');
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('interact with timer and submit', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport('countdown-timer', false);
    await enketoWidgetsPage.clickTimer('countdown'); // start
    await enketoWidgetsPage.clickTimer('countdown'); // stop
    await genericForm.nextPage();
    await genericForm.submitForm({ ignoreValidationErrors: true });
    // Triggers error because timer is required
    await genericForm.waitForValidationErrors();
    await enketoWidgetsPage.clickTimer('countdown');
    // Errors disappear once timer completes
    await genericForm.waitForValidationErrorsToDisappear();
    await genericForm.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);
    expect(report.fields.group).to.deep.equal({ timer: '' }); // there is no output from the widget for notes
    expect(report.fields.group_2).to.deep.equal({ trigger: 'OK' });
  });

});
