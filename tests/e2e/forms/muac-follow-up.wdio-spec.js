const moment = require('moment');
const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const assessmentForm = require('../../page-objects/forms/assessment-form.wdio.page');
const tasksPage = require('../../page-objects/tasks/tasks.wdio.page');


describe('Assessment', () => {
  before(async () => {
    await assessmentForm.uploadForm();
    await browser.pause(1000);
    userData.userContactDoc.date_of_birth = moment().subtract(4, 'months').format('YYYY-MM-DD');
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await browser.pause(1000);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit Assessment form', async () => {
    await reportsPage.openForm('Assess Patient');
    await assessmentForm.selectPatient(userData.userContactDoc.name);
    await genericForm.nextPage();

    await genericForm.selectYes();
    await genericForm.nextPage();

    await assessmentForm.selectRadioButton('fever', 'no');
    await genericForm.nextPage();

    await assessmentForm.selectRadioButton('cough', 'no');
    await genericForm.nextPage();

    await assessmentForm.selectRadioButton('diarrhea', 'no');
    await genericForm.nextPage();

    await genericForm.selectAllBoxes();
    await genericForm.nextPage();

    await assessmentForm.selectRadioButton('imm', 'no');
    await genericForm.nextPage();

    await assessmentForm.checkDewormingBox();
    await genericForm.nextPage();

    await assessmentForm.insertMuacScore(13);
    expect(await (await assessmentForm.muacNormal).isDisplayed()).to.be.true;

    await assessmentForm.insertMuacScore(12);
    expect(await (await assessmentForm.muacModerate).isDisplayed()).to.be.true;

    await assessmentForm.insertMuacScore(11);
    expect(await (await assessmentForm.muacSevere).isDisplayed()).to.be.true;

    assessmentForm.selectOedemia('no');
    assessmentForm.selectBreastfeeding('no');
    genericForm.nextPage();
    await (await genericForm.submitButton()).click();
    await browser.pause(1000);
  });

  it('Check MUAC follow up task', async () => {
    await tasksPage.goToTasksTab();
    await tasksPage.getTasks();
    //check this list
  });
});
