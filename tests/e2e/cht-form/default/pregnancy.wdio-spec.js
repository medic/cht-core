const mockConfig = require('../mock-config');
const moment = require('moment');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Pregnancy Form', () => {

  it('should submit a new pregnancy ', async () => {
    await mockConfig.loadForm('default', 'app', 'pregnancy');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345'} };
    });

    const edd = moment().add(8, 'days');
    const nextANCVisit = moment().add(2, 'day').format('YYYY-MM-DD');
    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Pregnancy registration');
    await pregnancyForm.submitDefaultPregnancy(false);

    const summaryTexts = [
      '38', //weeks pregnant
      edd.format('D MMM, YYYY'),
      'Previous miscarriages or stillbirths',
      'Previous difficulties in childbirth',
      'Has delivered four or more children',
      'Last baby born less than one year ago',
      'Heart condition',
      'Asthma',
      'High blood pressure',
      'Diabetes',
      'Vaginal bleeding',
      'Fits',
      'Severe abdominal pain',
      'Severe headache',
      'Very pale',
      'Fever',
      'Reduced or no fetal movements',
      'Breaking of water',
      'Getting tired easily',
      'Swelling of face and hands',
      'Breathlessness'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

    expect(Date.parse(jsonObj.gestational_age.g_edd)).to.equal(Date.parse(edd.format('D MMM, YYYY')));
    expect(jsonObj.t_pregnancy_follow_up).to.equal('yes');
    expect(Date.parse(jsonObj.t_pregnancy_follow_up_date)).to.equal(Date.parse(nextANCVisit));
    expect(jsonObj.danger_signs.r_danger_sign_present).to.equal('yes');
    expect(jsonObj.risk_factors.r_risk_factor_present).to.equal('yes');
  });

});
