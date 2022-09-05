const fs = require('fs');

const utils = require('../../../utils');
const userData = require('../../../page-objects/forms/data/user.po.data');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const commonPage = require('../../../page-objects/common/common.wdio.page');
const reportsPage = require('../../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../../page-objects/forms/generic-form.wdio.page');
const pregnancyDangerSignForm = require('../../../page-objects/forms/pregnancy-danger-sign-form.wdio.page');

const xml = fs.readFileSync(`${__dirname}/forms/pregnancy-danger-sign-follow-up.xml`, 'utf8');
const formDocument = {
  _id: 'form:pregnancy-danger-sign-follow-up',
  internalId: 'pregnancy-danger-sign-follow-up',
  title: 'Pregnancy danger sign follow-up',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64')
    }
  }
};

describe('Pregnancy danger sign follow-up form', () => {
  before(async () => {
    await utils.saveDoc(formDocument);
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit and validate Pregnancy danger sign follow-up form and keeps the report minified', async () => {
    await reportsPage.openForm('Pregnancy danger sign follow-up');
    await pregnancyDangerSignForm.selectPatient('jack');
    await genericForm.nextPage();
    await pregnancyDangerSignForm.selectVisitedHealthFacility();
    await pregnancyDangerSignForm.selectNoDangerSigns();
    await reportsPage.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
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
