const countdownTimerPage = require('@page-objects/default/enketo/countdown-timer.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

const { userContactDoc, docs } = userData;

describe('Countdown timer widget', () => {

  before(async () => {
    await utils.saveDocs(docs);
    await countdownTimerPage.configureForm(userContactDoc);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('interact with timer and submit', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport(countdownTimerPage.INTERNAL_ID, false);
    await countdownTimerPage.clickTimer(); // start
    await countdownTimerPage.clickTimer(); // stop
    await genericForm.nextPage();
    await genericForm.submitButton().click();
    // Triggers error because timer is required
    await genericForm.waitForValidationErrors();
    await countdownTimerPage.clickTimer();
    // Errors disappear once timer completes
    await genericForm.waitForValidationErrorsToDisappear();
    await reportsPage.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);
    expect(report.fields.group).to.deep.equal({ timer: '' }); // there is no output from the widget for notes
    expect(report.fields.group_2).to.deep.equal({ trigger: 'OK' });
  });

});
