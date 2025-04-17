const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const utils = require('@utils');

describe('Submit Enketo form', () => {

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/assessment`));
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/required-note`));
    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.deleteDocs(['assessment', 'required-note']);
    await utils.revertDb([/^form:/], true);
  });

  it('submits on reports tab', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('assessment', false);

    await commonEnketoPage.setInputValue('Person name', 'Jones');
    await genericForm.submitForm();

    await (await reportsPage.firstReportDetailField()).waitForDisplayed();
    expect(await (await reportsPage.firstReportDetailField()).getText()).to.equal('Jones');
  });

  // If this test fails, it means something has gone wrong with the custom logic in openrosa2html5form.xsl
  // that should prevent notes from ever being required.
  it('allows forms with required notes to be submitted', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('required-note', false);
    await genericForm.submitForm();
  });

  it('cancelling form with no input does not trigger confirmation dialog', async () => {
    await commonPage.goToReports();
    const originalReportsText = await reportsPage.getAllReportsText();
    await commonPage.openFastActionReport('assessment', false);
    // Do not set any values before cancelling
    await (await genericForm.cancelButton()).click();

    await commonPage.waitForPageLoaded();
    await (await reportsPage.rightPanelSelectors.noReportSelectedLabel()).waitForDisplayed();
    // No new report added
    expect(await reportsPage.getAllReportsText()).to.deep.equal(originalReportsText);
  });

  it('cancelling form with input triggers confirmation dialog box', async () => {
    await commonPage.goToReports();
    const originalReportsText = await reportsPage.getAllReportsText();
    await commonPage.openFastActionReport('assessment', false);
    await commonEnketoPage.setInputValue('Person name', 'Jones');
    await (await genericForm.cancelButton()).click();

    await modalPage.submit();
    await commonPage.waitForPageLoaded();
    await (await reportsPage.rightPanelSelectors.noReportSelectedLabel()).waitForDisplayed();
    // No new report added
    expect(await reportsPage.getAllReportsText()).to.deep.equal(originalReportsText);
  });
});
