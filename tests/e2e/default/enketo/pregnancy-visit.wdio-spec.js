const utils = require('@utils');
const userData = require('@page-objects/default/users/user.data');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyVisitForm = require('@page-objects/default/enketo/pregnancy-visit.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Pregnancy Visit', () => {
  before(async () => {
    await pregnancyVisitForm.uploadPregnancyVisitForm();
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit and validate Pregnancy Visit form and keeps the report minified', async () => {
    const name = userData.userContactDoc.name;
    const dangerSignsQuestion = `Confirm with ${name} if ${name} has any of the following danger signs.`;

    await commonPage.openFastActionReport('pregnancy-visit', false);
    await genericForm.selectContact(name);
    await genericForm.nextPage();

    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Pain, pressure or cramping in abdomen');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion,
      'Bleeding or fluid leaking from vagina or vaginal discharge with bad odour');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Severe nausea or vomiting');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Fever of 38 degrees or higher');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Severe headache or new, blurry vision problems');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion,
      'Sudden weight gain or severe swelling of feet, ankles, face, or hands');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Less movement and kicking from the baby');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Blood in the urine or painful, burning urination');
    await commonEnketoPage.selectCheckBox(dangerSignsQuestion, 'Diarrhea that doesn\'t go away');
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:',
      'Test notes - Pregnancy visit');
    await genericForm.nextPage();

    const summaryTexts = [
      name,
      'Pain or cramping in abdomen',
      'Bleeding or fluid leaking from vagina or vaginal discharge with bad odour',
      'Severe nausea or vomiting',
      'Fever of 38 degrees or higher',
      'Severe headache or new, blurry vision problems',
      'Sudden weight gain or severe swelling of feet, ankles, face, or hands',
      'Less movement and kicking from the baby (after week 20 of pregnancy)',
      'Blood in the urine or painful, burning urination',
      'Diarrhea that doesn\'t go away',
      'Test notes - Pregnancy visit',
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);

    await reportsPage.submitForm();

    //report summary
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(name);
    expect(firstReport.form).to.equal('Pregnancy Visit');
    expect(firstReport.lineage).to.equal(userData.docs[0].name);

    //report details
    const openReportInfo = await reportsPage.getOpenReportInfo();
    expect(openReportInfo.senderName).to.equal(`Submitted by ${name}`);
    expect(openReportInfo.senderPhone).to.equal(userData.userContactDoc.phone);
    expect(openReportInfo.lineage).to.equal(userData.docs[0].name);
    expect(await (await reportsPage.selectedCaseId()).getText()).to.match(/^\d{5}$/);
  });
});

