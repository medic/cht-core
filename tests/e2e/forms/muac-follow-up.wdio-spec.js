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
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit Assessment form', async () => {
    await reportsPage.openForm('Assess Patient');
    await assessmentForm.selectPatient(userData.userContactDoc.name);
    await genericForm.nextPage();
    //alive
    await genericForm.selectYes();
    await genericForm.nextPage();

    //fever
    await assessmentForm.waitForQuestion('fever');
    await genericForm.selectNo();
    await genericForm.nextPage();

    //cough
    await assessmentForm.waitForQuestion('cough');
    await genericForm.selectNo();
    await genericForm.nextPage();

    //diarrhoea
    await assessmentForm.waitForQuestion('diarrhea');
    await genericForm.selectNo();
    await genericForm.nextPage();

    //danger signs
    await assessmentForm.waitForQuestion('danger_signs');
    await genericForm.selectAllBoxes();
    await genericForm.nextPage();

    // vaccines
    await assessmentForm.waitForQuestion('imm');
    await genericForm.selectNo();
    await genericForm.nextPage();

    // deworming
    await assessmentForm.waitForQuestion('deworm_vit');
    await assessmentForm.checkDewormingBox();
    await genericForm.nextPage();

    await assessmentForm.insertMuacScore(13);
    //expect normal
    await assessmentForm.insertMuacScore(12);
    //exect moderate
    await assessmentForm.insertMuacScore(11);
    //expect severe
    //
    genericForm.selectNo();
    await genericForm.nextPage();
  });

  it('Check MUAC follow up task', async () => {
    await tasksPage.goToTasksTab();
    await tasksPage.getTasks();
    //check this list
  });
});
