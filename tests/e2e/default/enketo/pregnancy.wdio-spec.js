const moment = require('moment');
const utils = require('../../../utils');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const tasksPage = require('../../../page-objects/default/tasks/tasks.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('../../../page-objects/default/analytics/analytics.wdio.page');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('../../../page-objects/default/enketo/pregnancy.wdio.page');

describe('Pregnancy registration', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.find(place => place.type === 'health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'), 
    parent: {_id: healthCenter._id, parent: healthCenter.parent} 
  });
  let countRiskFactors = 0;
  let countDangerSigns = 0;

  before(async () => {
    await utils.saveDocs([...places, pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.goToPeople(pregnantWoman._id);
  });

  it('Submit new pregnancy', async () => {
    const edd = moment().add(1, 'month');
    const nextANCVisit = moment().add(1, 'day');

    await contactPage.createNewAction('Pregnancy registration');
    await pregnancyForm.selectGestationAge();
    await genericForm.nextPage();
    await pregnancyForm.setDeliveryDate(edd.format('YYYY-MM-DD'));
    await genericForm.nextPage();

    const confirmationDetails = await pregnancyForm.getConfirmationDetails();
    expect(confirmationDetails.eddConfirm).to.equal(edd.format('D MMM, YYYY'));

    await genericForm.nextPage();
    await pregnancyForm.setANCVisitsPast();
    await genericForm.nextPage();
    await pregnancyForm.selectYesNoOption(pregnancyForm.KNOW_FUTURE_VISITS);
    await pregnancyForm.setFutureVisitDate(nextANCVisit.format('YYYY-MM-DD'));
    await genericForm.nextPage();
    countRiskFactors += await pregnancyForm.selectYesNoOption(pregnancyForm.FIRST_PREGNANCY, 'no');
    countRiskFactors += await pregnancyForm.selectYesNoOption(pregnancyForm.MISCARRIAGE);
    await genericForm.nextPage();
    countRiskFactors += await pregnancyForm.selectAllRiskFactors(pregnancyForm.FIRST_PREGNANCY_VALUE.no);
    countRiskFactors += await pregnancyForm.selectYesNoOption(pregnancyForm.ADITIONAL_FACTORS, 'no');
    await genericForm.nextPage();
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.VAGINAL_BLEEDING);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.FITS);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.ABDOMINAL_PAIN);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.HEADACHE);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.VERY_PALE);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.FEVER);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.REDUCE_FETAL_MOV);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.BREAKING_OF_WATER);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.EASILY_TIRED);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.SWELLING_HANDS);
    countDangerSigns += await pregnancyForm.selectYesNoOption(pregnancyForm.BREATHLESSNESS);
    await genericForm.nextPage();
    await pregnancyForm.selectYesNoOption(pregnancyForm.LLIN);
    await genericForm.nextPage();
    await pregnancyForm.selectYesNoOption(pregnancyForm.IRON_FOLATE);
    await genericForm.nextPage();
    await pregnancyForm.selectYesNoOption(pregnancyForm.DEWORMING_MEDICATION);
    await genericForm.nextPage();
    await genericForm.nextPage();
    await pregnancyForm.selectYesNoOption(pregnancyForm.HIV_TESTED);
    await genericForm.nextPage();

    const summaryDetails = await pregnancyForm.getSummaryDetails();
    expect(summaryDetails.patientNameSumm).to.equal(pregnantWoman.name);
    expect(summaryDetails.weeksPregnantSumm).to.equal(confirmationDetails.weeksPregnantConfirm);
    expect(summaryDetails.eddSumm).to.equal(edd.format('D MMM, YYYY'));
    expect(summaryDetails.riskFactorsSumm).to.equal(countRiskFactors);
    expect(summaryDetails.dangerSignsSumm).to.equal(countDangerSigns);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    expect(await (await contactPage.pregnancyCard()).isDisplayed()).to.be.true;

    const pregnancyCardInfo = await contactPage.getPregnancyCardInfo();
    expect(pregnancyCardInfo.weeksPreg).to.equal(confirmationDetails.weeksPregnantConfirm);
    expect(pregnancyCardInfo.deliveryDate).to.equal(edd.format('D MMM, YYYY'));
    expect(pregnancyCardInfo.risk).to.equal('High risk');
    expect(pregnancyCardInfo.ancVisit).to.equal(nextANCVisit.format('D MMM, YYYY'));

  });

  it('Verify tasks created', async () => {
    const tasksTitles = ['Health facility ANC reminder', 'Danger sign follow up', 'Pregnancy home visit'];

    await commonPage.goToTasks();
    const tasks = await tasksPage.getTasks();    
    expect(tasks.length).to.equal(3);
    for(let i = 0; i < tasks.length; i++){
      const task = await tasksPage.getTaskInfo(tasks[i]);
      expect(task.contactName).to.equal(pregnantWoman.name);
      expect(task.formTitle).to.equal(tasksTitles[i]);
    }
  });

  it('Verify report created', async () => {
    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());

    expect(firstReport.heading).to.equal(pregnantWoman.name);
    expect(firstReport.form).to.equal('Pregnancy registration');
  });

  it('Verify targets', async () => {
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
