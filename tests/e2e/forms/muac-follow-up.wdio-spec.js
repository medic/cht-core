const moment = require('moment');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const assessmentForm = require('../../page-objects/forms/assessment-form.wdio.page');
const formTitle = assessmentForm.formDocument.title;

describe('Assessment', () => {
  before(async () => {
    await assessmentForm.uploadForm();
    userData.userContactDoc.date_of_birth = moment().subtract(4, 'months').format('YYYY-MM-DD');
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.closeTour();
    await commonPage.waitForPageLoaded();
    await commonPage.goToReports();
  });

  it('Submit Assessment form', async () => {
    await reportsPage.openForm(formTitle);
    await assessmentForm.selectPatient(userData.userContactDoc.name);
    await genericForm.nextPage();

    await genericForm.selectYes();
    await genericForm.nextPage();

    //Normal - lime
    await assessmentForm.insertMuacScore(13);
    expect(await assessmentForm.getMuacAssessmentDisplayed('lime')).to.equal(true);

    //moderate - yellow
    await assessmentForm.insertMuacScore(12);
    expect(await assessmentForm.getMuacAssessmentDisplayed('yellow')).to.equal(true);

    //severe - red
    await assessmentForm.insertMuacScore(11);
    expect(await assessmentForm.getMuacAssessmentDisplayed('red')).to.equal(true);

    // submit
    await genericForm.nextPage();
    await (await reportsPage.submitForm());
    //report summary
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(userData.userContactDoc.name);
    expect(firstReport.form).to.equal(formTitle);
    expect(firstReport.lineage).to.equal(userData.userContactDoc.parent.name);

    //report details
    expect(await (await reportsPage.submitterName()).getText())
      .to.equal(`Submitted by ${userData.userContactDoc.name} `);
    expect(await (await reportsPage.submitterPhone()).getText()).to.equal(userData.userContactDoc.phone);
    expect(await (await reportsPage.submitterPlace()).getText()).to.equal(userData.userContactDoc.parent.name);
    expect(await (await reportsPage.selectedCaseId()).getText()).to.equal(userData.docs[0].contact._id);

    //muac fields
    const muacScore = await reportsPage
      .getReportDetailFieldValueByLabel('report.assessment.group_nutrition_assessment.muac_score');
    expect(muacScore).to.equal('11');

    const muacColor = await reportsPage
      .getReportDetailFieldValueByLabel('report.assessment.group_nutrition_assessment.group_muac_color');
    expect(muacColor).to.not.be.empty;

    const muacReferral = await reportsPage
      .getReportDetailFieldValueByLabel('report.assessment.group_diagnosis.r_referral_sam_24h');
    expect(muacReferral).to.not.be.empty;
  });
});
