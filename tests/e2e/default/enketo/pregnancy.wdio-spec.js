const moment = require('moment');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

describe('Pregnancy registration', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('Should submit a new pregnancy', async () => {
    const edd = moment().add(8, 'days');
    const nextANCVisit = moment().add(2, 'day');
    const riskFactorsQuestion = 'Does the woman have any of these risk factors?';

    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy');

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
    await pregnancyForm.setFutureVisitDate(nextANCVisit.format('YYYY-MM-DD'));
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Is this the woman\'s first pregnancy?', 'No');
    await commonEnketoPage.selectRadioButton('Has the woman had any miscarriages or stillbirths?', 'Yes');
    await genericForm.nextPage();
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Previous difficulties in childbirth');
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Has delivered four or more children');
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Last baby born less than one year ago');
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Heart condition');
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Asthma');
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'High blood pressure');
    await commonEnketoPage.selectCheckBox(riskFactorsQuestion, 'Diabetes');
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
      pregnantWoman.name,
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

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    expect(await (await contactPage.pregnancyCard()).isDisplayed()).to.be.true;

    const pregnancyCardInfo = await contactPage.getPregnancyCardInfo();
    expect(pregnancyCardInfo.weeksPregnant).to.equal('38');
    expect(Date.parse(pregnancyCardInfo.deliveryDate)).to.equal(Date.parse(edd.format('D MMM, YYYY')));
    expect(pregnancyCardInfo.risk).to.equal('High risk');
    expect(Date.parse(pregnancyCardInfo.ancVisit)).to.equal(Date.parse(nextANCVisit.format('D MMM, YYYY')));

  });

  it('Should verify that all tasks related with the high risk pregnancy were created', async () => {
    const tasksTitles = ['Health facility ANC reminder', 'Danger sign follow up', 'Delivery'];

    await commonPage.goToTasks();
    const tasks = await tasksPage.getTasks();
    expect(tasks.length).to.equal(3);

    for (const task of tasks) {
      const taskInfo = await tasksPage.getTaskInfo(task);
      expect(taskInfo.contactName).to.equal(pregnantWoman.name);
      expect(tasksTitles).to.include(taskInfo.formTitle);
      tasksTitles.splice(tasksTitles.indexOf(taskInfo.formTitle), 1);
    }
  });

  it('Should verify that the report related the pregnancy was created', async () => {
    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());

    expect(firstReport.heading).to.equal(pregnantWoman.name);
    expect(firstReport.form).to.equal('Pregnancy registration');
  });

  it('Should verify that the counters for the active pregnancies and the new pregnancies were updated.', async () => {
    await commonPage.goToAnalytics();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', goal: '20', count: '1', countNumberColor: TARGET_UNMET_COLOR },
      { title: 'Live births', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', count: '1', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR  }
    ]);
  });
});
