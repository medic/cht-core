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

    await commonEnketoPage.selectRadioButton('How would you like to report the pregnancy?',
      'Expected date of delivery (EDD)');
    await genericForm.nextPage();
    await commonEnketoPage.setDateValue('Please enter the expected date of delivery.', edd.format('YYYY-MM-DD'));
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.setInputValue('How many times has the woman been to the health facility for ANC?', '0');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('If the woman has a specific upcoming ANC appointment date, ' +
      'enter it here. You will receive a task three days before to remind her to attend.', 'Enter date');
    await pregnancyForm.setFutureVisitDate(nextANCVisit);
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Is this the woman\'s first pregnancy?', 'No');
    await commonEnketoPage.selectRadioButton('Has the woman had any miscarriages or stillbirths?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox('Previous difficulties in childbirth');
    await commonEnketoPage.selectCheckBox('Has delivered four or more children');
    await commonEnketoPage.selectCheckBox('Last baby born less than one year ago');
    await commonEnketoPage.selectCheckBox('Heart condition');
    await commonEnketoPage.selectCheckBox('Asthma');
    await commonEnketoPage.selectCheckBox('High blood pressure');
    await commonEnketoPage.selectCheckBox('Diabetes');
    await commonEnketoPage.selectRadioButton(
      'Are there additional factors that could make this pregnancy high-risk?',
      'No'
    );
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Vaginal bleeding', 'Yes');
    await commonEnketoPage.selectRadioButton('Fits', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe abdominal pain', 'Yes');
    await commonEnketoPage.selectRadioButton('Severe headache', 'Yes');
    await commonEnketoPage.selectRadioButton('Very pale', 'Yes');
    await commonEnketoPage.selectRadioButton('Fever', 'Yes');
    await commonEnketoPage.selectRadioButton('Reduced or no fetal movements', 'Yes');
    await commonEnketoPage.selectRadioButton('Breaking of water', 'Yes');
    await commonEnketoPage.selectRadioButton('Getting tired easily', 'Yes');
    await commonEnketoPage.selectRadioButton('Swelling of face and hands', 'Yes');
    await commonEnketoPage.selectRadioButton('Breathlessness', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Does the woman use a long-lasting insecticidal net (LLIN)?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Is the woman taking iron folate daily?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Has the woman received deworming medication?', 'Yes');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Has the woman been tested for HIV in the past 3 months?', 'Yes');
    await genericForm.nextPage();

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
