const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Submit Z-Score form', () => {
  const charts = [
    {
      id: 'weight-for-age',
      data: {
        male: [
          { key: 0, points: [  1.701, 2.08, 2.459, 2.881, 3.346, 3.859, 4.419, 5.031, 5.642 ] },
          { key: 1, points: [ 1.692, 2.065, 2.437, 2.854, 3.317, 3.83, 4.394, 5.013, 5.633 ] },
          { key: 2, points: [ 1.707, 2.08, 2.454, 2.872, 3.337, 3.852, 4.421, 5.045, 5.669 ] }
        ],
        female: [
          { key: 0, points: [ 1.671, 2.033, 2.395, 2.794, 3.232, 3.711, 4.23, 4.793, 5.356 ] },
          { key: 1, points: [ 1.635, 1.994, 2.352, 2.752, 3.196, 3.685, 4.222, 4.81, 5.398 ] },
          { key: 2, points: [ 1.643, 2.002, 2.362, 2.764, 3.21, 3.704, 4.249, 4.846, 5.443 ] }
        ],
      }
    },
    {
      id: 'height-for-age',
      data: {
        male: [
          { key: 0, points: [ 42.312, 44.205, 46.098, 47.991, 49.884, 51.777, 53.67, 55.564, 57.457 ] },
          { key: 1, points: [ 42.481, 44.376, 46.271, 48.165, 50.06, 51.955, 53.85, 55.744, 57.639 ] },
          { key: 2, points: [ 42.65, 44.547, 46.443, 48.339, 50.236, 52.132, 54.029, 55.925, 57.822 ] }
        ],
        female: [
          { key: 0, points: [ 41.697, 43.56, 45.422, 47.285, 49.148, 51.01, 52.873, 54.736, 56.598 ] },
          { key: 1, points: [ 41.854, 43.72, 45.585, 47.451, 49.317, 51.182, 53.048, 54.914, 56.779 ] },
          { key: 2, points: [ 42.011, 43.88, 45.748, 47.617, 49.485, 51.354, 53.223, 55.091, 56.96 ] }
        ]
      }
    },
    {
      id: 'weight-for-height',
      data: {
        male: [
          { key: 45, points: [ 1.71, 1.877, 2.043, 2.23, 2.441, 2.68, 2.951,  3.261, 3.571 ] },
          { key: 45.1, points: [ 1.722, 1.89, 2.057, 2.245, 2.458, 2.698, 2.971, 3.283, 3.595 ] },
          { key: 45.2, points: [ 1.734, 1.903, 2.072, 2.261, 2.474, 2.716, 2.991, 3.305, 3.618 ] }
        ],
        female: [
          { key: 45, points: [ 1.737, 1.902, 2.066, 2.252, 2.461, 2.698, 2.967, 3.275, 3.584 ] },
          { key: 45.1, points: [ 1.749, 1.915, 2.081, 2.267, 2.478, 2.716, 2.988, 3.298, 3.609 ] },
          { key: 45.2, points: [ 1.761, 1.928, 2.095, 2.283, 2.495, 2.735, 3.008, 3.321, 3.633 ] }
        ]
      }
    }
  ];

  const setPatient = async (sex, height, weight, age) => {
    await commonEnketoPage.selectRadioButton('Gender', sex);
    await commonEnketoPage.setInputValue('How tall are you? (cm)', height);
    await commonEnketoPage.setInputValue('How much do you weigh? (kg)', weight);
    await commonEnketoPage.setInputValue('How old are you? (days)', age);
  };

  const validateValues = async (heightForAge, weightForAge, weightForHeight) => {
    await genericForm.formTitle().click();
    expect(await commonEnketoPage.getInputValue('height for age')).to.equal(heightForAge);
    await genericForm.formTitle().click();
    expect(await commonEnketoPage.getInputValue('weight for age')).to.equal(weightForAge);
    await genericForm.formTitle().click();
    expect(await commonEnketoPage.getInputValue('weight for height')).to.equal(weightForHeight);
  };

  before(async () => {
    const chartsDoc = {
      _id: 'zscore-charts',
      charts: charts
    };
    await commonEnketoPage.uploadForm('z-score');
    await utils.saveDoc(chartsDoc);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  it('Autofills zscore fields with correct values', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('z-score', false);

    await setPatient('Female', 45, 2, 0);
    await validateValues('-2.226638023630504', '-3.091160220994475', '-2.402439024390243');

    await setPatient('Male', 45, 2, 0);
    await validateValues('-2.5800316957210767', '-3.211081794195251', '-2.259036144578314');

    await setPatient('Female', 45.2, 5, 1);
    await validateValues('-2.206434316353886', '3.323129251700681', '4');

    await setPatient('Male', 45.2, 5, 1);
    await validateValues('-2.5651715039577816', '2.9789983844911148', '4');

    await genericForm.submitForm();
  });

  it('saves z-score values', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('z-score', false);

    await setPatient('Female', 45.1, 3, 2);
    await validateValues('-2.346895074946466', '-0.4708520179372194', '2.0387096774193547');

    await genericForm.submitForm();
    expect(await reportsPage.fieldByIndex(1)).to.equal('45.1');
    expect(await reportsPage.fieldByIndex(2)).to.equal('3');
    expect(await reportsPage.fieldByIndex(3)).to.equal('female');
    expect(await reportsPage.fieldByIndex(4)).to.equal('2');
    expect(await reportsPage.fieldByIndex(5)).to.equal('2.0387096774193547');
    expect(await reportsPage.fieldByIndex(6)).to.equal('-0.4708520179372194');
    expect(await reportsPage.fieldByIndex(7)).to.equal('-2.346895074946466');

    const reportId = await reportsPage.getCurrentReportId();
    const initialReport = await utils.getDoc(reportId);

    await reportsPage.editReport();
    await genericForm.submitForm();

    const updatedReport = await utils.getDoc(reportId);
    expect(updatedReport.fields).excludingEvery(['instanceID', 'meta']).to.deep.equal(initialReport.fields);
  });
});
