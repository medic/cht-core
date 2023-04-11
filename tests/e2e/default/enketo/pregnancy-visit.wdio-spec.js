const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyVisitForm = require('@page-objects/default/enketo/pregnancy-visit.wdio.page');

describe('Pregnancy Visit', () => {
  before(async () => {
    await pregnancyVisitForm.uploadPregnancyVisitForm();
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit and validate Pregnancy Visit form and keeps the report minified', async () => {
    await reportsPage.openForm('Pregnancy Visit');
    await pregnancyVisitForm.selectPatient(userData.userContactDoc.name);
    await genericForm.nextPage();
    const selectedDangerSigns = await pregnancyVisitForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await pregnancyVisitForm.addNotes();
    await genericForm.nextPage();

    expect(await pregnancyVisitForm.dangerSignLabel().getText()).to.equal('Danger Signs');
    expect(await pregnancyVisitForm.dangerSignSummary().length).to.equal(selectedDangerSigns + 1);
    expect(await pregnancyVisitForm.followUpMessage().getText())
      .to.have.string(`${userData.userContactDoc.name} has one or more danger signs for a high risk pregnancy`);
    await reportsPage.submitForm();

    //report summary
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(userData.userContactDoc.name);
    expect(firstReport.form).to.equal('Pregnancy Visit');
    expect(firstReport.lineage).to.equal(userData.docs[0].name);

    //report details
    expect(await (await reportsPage.submitterName()).getText())
      .to.equal(`Submitted by ${userData.userContactDoc.name} `);
    expect(await (await reportsPage.submitterPhone()).getText()).to.equal(userData.userContactDoc.phone);
    expect(await (await reportsPage.submitterPlace()).getText()).to.equal(userData.docs[0].name);
    expect(await (await reportsPage.selectedCaseId()).getText()).to.match(/^\d{5}$/);
  });
});

