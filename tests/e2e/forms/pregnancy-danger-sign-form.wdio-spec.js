const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const pregnancyDangerSignForm = require('../../page-objects/forms/pregnancy-danger-sign-form.wdio.page');

describe('Pregnancy danger sign follow-up form', () => {
  before(async () => {
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('Submit and validate Pregnancy danger sign follow-up form and keeps the report minified', async () => {
    await reportsPage.openForm('Pregnancy danger sign follow-up');
    await pregnancyDangerSignForm.selectPatient('jack');
    await genericForm.nextPage();
    await pregnancyDangerSignForm.selectVisitedHealthFacility();
    await pregnancyDangerSignForm.selectNoDangerSigns();
    await (await genericForm.submitButton()).click();
    await (await $('.details>ul>li')).waitForDisplayed();

    const currentUrl = await browser.getUrl();
    const reportBaseUrl = utils.getBaseUrl() + 'reports/';
    const reportId = currentUrl.slice(reportBaseUrl.length);
    const initialReport = await utils.getDoc(reportId);
    expect(initialReport.verified).to.be.undefined;

    await genericForm.openReportReviewMenu();
    await genericForm.invalidateReport();

    const invalidatedReport = await utils.getDoc(reportId);
    expect(invalidatedReport.verified).to.be.false;
    expect(invalidatedReport.patient).to.be.undefined;

    await genericForm.validateReport();
    const validatedReport = await utils.getDoc(reportId);
    expect(validatedReport.verified).to.be.true;
    expect(validatedReport.patient).to.be.undefined;
  });
});
