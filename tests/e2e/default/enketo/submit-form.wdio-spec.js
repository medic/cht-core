const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Submit Enketo form', () => {

  before(async () => {
    await commonEnketoPage.uploadForm('assessment');
    await commonEnketoPage.uploadForm('required-note');
    await loginPage.cookieLogin();
  });

  it('submits on reports tab', async () => {
    await commonElements.goToReports();
    await commonElements.openFastActionReport('assessment', false);

    await commonEnketoPage.setInputValue('Person name', 'Jones');
    await genericForm.submitForm();

    await (await reportsPage.firstReportDetailField()).waitForDisplayed();
    expect(await (await reportsPage.firstReportDetailField()).getText()).to.equal('Jones');
  });

  // If this test fails, it means something has gone wrong with the custom logic in openrosa2html5form.xsl
  // that should prevent notes from ever being required.
  it('allows forms with required notes to be submitted', async () => {
    await commonElements.goToReports();
    await commonElements.openFastActionReport('required-note', false);
    await genericForm.submitForm();
  });

  it('cancelling form with no input does not trigger confirmation dialog', async () => {
    await commonElements.goToReports();
    const originalReportsText = await reportsPage.getAllReportsText();
    await commonElements.openFastActionReport('assessment', false);
    // Do not set any values before cancelling
    await (await genericForm.cancelButton()).click();

    await commonElements.waitForPageLoaded();
    await (await reportsPage.noReportSelectedLabel()).waitForDisplayed();
    // No new report added
    expect(await reportsPage.getAllReportsText()).to.deep.equal(originalReportsText);
  });

  it('cancelling form with input triggers confirmation dialog box', async () => {
    await commonElements.goToReports();
    const originalReportsText = await reportsPage.getAllReportsText();
    await commonElements.openFastActionReport('assessment', false);
    await commonEnketoPage.setInputValue('Person name', 'Jones');
    await (await genericForm.cancelButton()).click();

    await modalPage.submit();
    await commonElements.waitForPageLoaded();
    await (await reportsPage.noReportSelectedLabel()).waitForDisplayed();
    // No new report added
    expect(await reportsPage.getAllReportsText()).to.deep.equal(originalReportsText);
  });
});
