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

describe('Pregnancy registration', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  let countRiskFactors = 0;
  let countDangerSigns = 0;

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  it('Should submit a new pregnancy', async () => {
    const edd = moment().add(30, 'days');
    const nextANCVisit = moment().add(1, 'day');

    await commonPage.goToPeople(pregnantWoman._id);
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.selectGestationAge();
    await genericForm.nextPage();
    await pregnancyForm.setDeliveryDate(edd.format('YYYY-MM-DD'));
    await genericForm.nextPage();

    const confirmationDetails = await pregnancyForm.getConfirmationDetails();
    expect(Date.parse(confirmationDetails.eddConfirm)).to.equal(Date.parse(edd.format('D MMM, YYYY')));

    await genericForm.nextPage();
    await pregnancyForm.setANCVisitsPast();
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.KNOWN_FUTURE_VISITS);
    await pregnancyForm.setFutureVisitDate(nextANCVisit.format('YYYY-MM-DD'));
    await genericForm.nextPage();
    countRiskFactors += await genericForm.selectYesNoOption(pregnancyForm.FIRST_PREGNANCY, 'no');
    countRiskFactors += await genericForm.selectYesNoOption(pregnancyForm.MISCARRIAGE);
    await genericForm.nextPage();
    countRiskFactors += await pregnancyForm.selectAllRiskFactors(pregnancyForm.FIRST_PREGNANCY_VALUE.no);
    countRiskFactors += await genericForm.selectYesNoOption(pregnancyForm.ADDITIONAL_FACTORS, 'no');
    await genericForm.nextPage();
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.VAGINAL_BLEEDING);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.FITS);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.ABDOMINAL_PAIN);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.HEADACHE);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.VERY_PALE);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.FEVER);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.REDUCE_FETAL_MOV);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.BREAKING_OF_WATER);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.EASILY_TIRED);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.SWELLING_HANDS);
    countDangerSigns += await genericForm.selectYesNoOption(pregnancyForm.BREATHLESSNESS);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.LLIN);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.IRON_FOLATE);
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.DEWORMING_MEDICATION);
    await genericForm.nextPage();
    await genericForm.nextPage();
    await genericForm.selectYesNoOption(pregnancyForm.HIV_TESTED);
    await genericForm.nextPage();

    const summaryDetails = await pregnancyForm.getSummaryDetails();
    expect(summaryDetails.patientNameSumm).to.equal(pregnantWoman.name);
    expect(summaryDetails.weeksPregnantSumm).to.equal(confirmationDetails.weeksPregnantConfirm);
    expect(Date.parse(summaryDetails.eddSumm)).to.equal(Date.parse(edd.format('D MMM, YYYY')));
    expect(summaryDetails.riskFactorsSumm).to.equal(countRiskFactors);
    expect(summaryDetails.dangerSignsSumm).to.equal(countDangerSigns);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    expect(await (await contactPage.pregnancyCard()).isDisplayed()).to.be.true;

    const pregnancyCardInfo = await contactPage.getPregnancyCardInfo();
    expect(pregnancyCardInfo.weeksPregnant).to.equal(confirmationDetails.weeksPregnantConfirm);
    expect(Date.parse(pregnancyCardInfo.deliveryDate)).to.equal(Date.parse(edd.format('D MMM, YYYY')));
    expect(pregnancyCardInfo.risk).to.equal('High risk');
    expect(Date.parse(pregnancyCardInfo.ancVisit)).to.equal(Date.parse(nextANCVisit.format('D MMM, YYYY')));

  });

  it('Should verify that all tasks related with the high risk pregnancy were created', async () => {
    const tasksTitles = ['Health facility ANC reminder', 'Danger sign follow up', 'Pregnancy home visit'];

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
      { title: 'Deaths', goal: '0', count: '0' },
      { title: 'New pregnancies', goal: '20', count: '1' },
      { title: 'Live births', count: '0' },
      { title: 'Active pregnancies', count: '1' },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0' },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0' },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0' }
    ]);
  });
});
