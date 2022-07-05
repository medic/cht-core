const moment = require('moment');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const assessmentForm = require('../../page-objects/forms/assessment-form.wdio.page');
describe('Assessment', () => {
  before(async () => {
    await assessmentForm.uploadForm();
    await browser.pause(5000);
    userData.userContactDoc.date_of_birth = moment().subtract(4, 'months').format('YYYY-MM-DD');
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await browser.pause(5000);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
    await browser.pause(5000);
  });

  it('Submit Assessment form', async () => {
    await reportsPage.openForm('Assess Patient');
    await assessmentForm.selectPatient(userData.userContactDoc.name);
    await genericForm.nextPage();

    await genericForm.selectYes();
    await genericForm.nextPage();

    // await assessmentForm.selectRadioButton('fever', 'no');
    // await genericForm.nextPage();

    // await assessmentForm.selectRadioButton('cough', 'no');
    // await genericForm.nextPage();

    // await assessmentForm.selectRadioButton('diarrhea', 'no');
    // await genericForm.nextPage();

    // await genericForm.waitForDangerSigns();
    // await genericForm.nextPage();

    // await assessmentForm.selectVaccines('no');
    // await genericForm.nextPage();

    // await genericForm.selectAllBoxes();
    // await genericForm.nextPage();

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

  });
});
