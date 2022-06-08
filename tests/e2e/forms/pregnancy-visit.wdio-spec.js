const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const pregnancyVisitForm = require('../../page-objects/forms/pregnancy-visit-form.wdio.page');

describe('Pregnancy Visit', () => {
  before(async () => {
    await pregnancyVisitForm.uploadPregnancyVisitForm();
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit and validate Pregnancy Visit form and keeps the report minified', async () => {
    await reportsPage.openForm('Pregnancy Visit');
    await pregnancyVisitForm.selectPatient('jack');
    await genericForm.nextPage();
    const selectedDangerSigns = await pregnancyVisitForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await pregnancyVisitForm.addNotes();
    await genericForm.nextPage();

    expect(await pregnancyVisitForm.dangerSignLabel().getText()).to.equal('Danger Signs');
    expect(await pregnancyVisitForm.dangerSignSummary().length).to.equal(selectedDangerSigns + 1);
    expect(await pregnancyVisitForm.followUpMessage().getText())
      .to.have.string('Please note that Jack has one or more danger signs for a high risk pregnancy');
    await reportsPage.submitForm();

    await genericForm.verifyReport();
  });
});

