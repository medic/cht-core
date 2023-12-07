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

    const dangerSigns = await pregnancyVisitForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await pregnancyVisitForm.setNote(note);
    await genericForm.nextPage();

    const summaryDetails = await pregnancyVisitForm.getSummaryDetails();
    expect(summaryDetails.countDangerSigns).to.equal(dangerSigns.length);
    expect(summaryDetails.followUpSmsNote2).to.include(pregnantWoman.name);
    expect(summaryDetails.followUpSmsNote2).to.include(pregnantWoman.patient_id);
    expect(summaryDetails.followUpSmsNote2).to.include(note);

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
