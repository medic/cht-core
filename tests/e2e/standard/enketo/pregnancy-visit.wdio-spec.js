const moment = require('moment');
const utils = require('@utils');
const gatewayApiUtils = require('@utils/gateway-api');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const contactPage = require('@page-objects/standard/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/standard/enketo/pregnancy.wdio.page');
const pregnancyVisitForm = require('@page-objects/standard/enketo/pregnancy-visit.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('Pregnancy Visit', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const user = userFactory.build({ place: healthCenter._id, roles: ['district_admin'] });
  const pregnantWoman = personFactory.build({ 
    patient_id: '12345', 
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'), 
    parent: {_id: healthCenter._id, parent: healthCenter.parent} 
  });

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
    await commonPage.goToPeople(pregnantWoman._id);

    // Submit new pregnancy for pregnantWoman.
    await pregnancyForm.submitPregnancy();
    await commonPage.waitForPageLoaded();
  });

  it('Submit new pregnancy visit - webapp', async () => {
    const note = 'Test note - pregnancy visit';
    await commonPage.openFastActionReport('pregnancy_visit');

    await pregnancyVisitForm.selectAllDangerSigns('', pregnantWoman.name);
    await genericForm.nextPage();
    await commonEnketoPage.setTextareaValue('You can add a personal note to the SMS here:', note);
    await genericForm.nextPage();

    const summaryTexts = [
      pregnantWoman.name,
      pregnantWoman.patient_id,
      'Pregnancy visit completed',
      'Pain or cramping in abdomen',
      'Bleeding or fluid leaking from vagina or vaginal discharge with bad odour',
      'Severe nausea or vomiting',
      'Fever of 38 degrees or higher',
      'Severe headache or new, blurry vision problems',
      'Sudden weight gain or severe swelling of feet, ankles, face, or hands',
      'Less movement and kicking from the baby (after week 20 of pregnancy)',
      'Blood in the urine or painful, burning urination',
      'Diarrhea that doesn\'t go away'
    ];

    await commonEnketoPage.validateSummaryReport(summaryTexts);
    expect(await commonEnketoPage.isElementDisplayed('label',
      `Nice work, ! ${pregnantWoman.name} (${pregnantWoman.patient_id}) has attended ANC at the health facility. ` +
      `Please note that ${pregnantWoman.name} has one or more danger signs for a high risk pregnancy. ` +
      `We will send you a message when they are due for their next visit. Thank you! ${note}`)).to.be.true;

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    const visits = (await contactPage.getPregnancyCardVisits()).split(' of ')[0];
    expect(visits).to.equal('1');

    // Verify the created report.
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(pregnantWoman.name);
    expect(firstReportInfo.form).to.equal('Pregnancy Visit');
  });

  it('Submit new pregnancy visit - SMS V form', async () => {
    await gatewayApiUtils.api.postMessage({
      id: 'V-id',
      from: user.phone,
      content: `V ${pregnantWoman.patient_id}`
    });

    await commonPage.goToPeople(pregnantWoman._id);
    const visits = (await contactPage.getPregnancyCardVisits()).split(' of ')[0];
    expect(visits).to.equal('2');

    // Verify the created report.
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(pregnantWoman.name);
    expect(firstReportInfo.form).to.equal('Pregnancy Visit (SMS)');
  });
});
