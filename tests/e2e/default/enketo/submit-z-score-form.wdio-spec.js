const ZScoreForm = require('../../../page-objects/default/enketo/z-score.wdio.page');
const userData = require('../../../page-objects/default/users/user.data');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const common = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const utils = require('../../../utils');

describe('Submit Z-Score form', () => {
  before(async () => {
    await ZScoreForm.configureForm(userData.userContactDoc);
    await loginPage.cookieLogin();
    await common.hideSnackbar();
  });

  it('Autofills zscore fields with correct values', async () => {
    await common.goToReports();
    await reportsPage.openForm(ZScoreForm.docs[0].title);

    await ZScoreForm.setPatient({ sex: 'female', height: 45, weight: 2, age: 0 });

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.226638023630504');
    expect(await ZScoreForm.getWeightForAge()).to.equal('-3.091160220994475');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('-2.402439024390243');

    await ZScoreForm.setPatient({ sex: 'male', height: 45, weight: 2, age: 0 });

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.5800316957210767');
    expect(await ZScoreForm.getWeightForAge()).to.equal('-3.211081794195251');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('-2.259036144578314');

    await ZScoreForm.setPatient({ sex: 'female', height: 45.2, weight: 5, age: 1 });

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.206434316353886');
    expect(await ZScoreForm.getWeightForAge()).to.equal('3.323129251700681');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('4');

    await ZScoreForm.setPatient({ sex: 'male', height: 45.2, weight: 5, age: 1 });

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.5651715039577816');
    expect(await ZScoreForm.getWeightForAge()).to.equal('2.9789983844911148');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('4');

    await reportsPage.submitForm();
  });

  it('saves z-score values', async () => {
    await common.goToReports();
    await reportsPage.openForm(ZScoreForm.docs[0].title);

    await ZScoreForm.setPatient({ sex: 'female', height: 45.1, weight: 3, age: 2 });

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.346895074946466');
    expect(await ZScoreForm.getWeightForAge()).to.equal('-0.4708520179372194');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('2.0387096774193547');

    await reportsPage.submitForm();
    expect(await reportsPage.fieldByIndex(1)).to.equal('45.1');
    expect(await reportsPage.fieldByIndex(2)).to.equal('3');
    expect(await reportsPage.fieldByIndex(3)).to.equal('female');
    expect(await reportsPage.fieldByIndex(4)).to.equal('2');
    expect(await reportsPage.fieldByIndex(5)).to.equal('2.0387096774193547');
    expect(await reportsPage.fieldByIndex(6)).to.equal('-0.4708520179372194');
    expect(await reportsPage.fieldByIndex(7)).to.equal('-2.346895074946466');

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);

    await reportsPage.editReport(reportId);
    await reportsPage.submitForm();

    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'meta']).to.deep.equal(initialReport.fields);
  });
});
