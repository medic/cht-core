const ZScoreForm = require('@page-objects/default/enketo/z-score.wdio.page');
const userData = require('@page-objects/default/users/user.data');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const setPatient = async (sex, height, weight, age) => {
  await commonEnketoPage.selectRadioButton('Gender', sex);
  await commonEnketoPage.setInputValue('How tall are you? (cm)', height);
  await commonEnketoPage.setInputValue('How much do you weigh? (kg)', weight);
  await commonEnketoPage.setInputValue('How old are you? (days)', age);

};

describe('Submit Z-Score form', () => {
  before(async () => {
    await ZScoreForm.configureForm(userData.userContactDoc);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('Autofills zscore fields with correct values', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport(ZScoreForm.docs[0].internalId, false);

    await setPatient('Female', 45, 2, 0);

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.226638023630504');
    expect(await ZScoreForm.getWeightForAge()).to.equal('-3.091160220994475');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('-2.402439024390243');

    await setPatient('Male', 45, 2, 0);

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.5800316957210767');
    expect(await ZScoreForm.getWeightForAge()).to.equal('-3.211081794195251');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('-2.259036144578314');

    await setPatient('Female', 45.2, 5, 1);

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.206434316353886');
    expect(await ZScoreForm.getWeightForAge()).to.equal('3.323129251700681');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('4');

    await setPatient('Male', 45.2, 5, 1);

    expect(await ZScoreForm.getHeightForAge()).to.equal('-2.5651715039577816');
    expect(await ZScoreForm.getWeightForAge()).to.equal('2.9789983844911148');
    expect(await ZScoreForm.getWeightForHeight()).to.equal('4');

    await reportsPage.submitForm();
  });

  it('saves z-score values', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport(ZScoreForm.docs[0].internalId, false);

    await setPatient('Female', 45.1, 3, 2);

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
