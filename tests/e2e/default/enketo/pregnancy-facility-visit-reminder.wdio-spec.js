const moment = require('moment');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const taskPage = require('@page-objects/default/tasks/tasks.wdio.page');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('Health Facility ANC Reminder task', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: {_id: healthCenter._id, parent: healthCenter.parent}
  });
  const ancDate = moment().add(2, 'day');
  let pregnancyId;

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(pregnantWoman._id);
  });

  it('should submit the health facility ANC reminder task', async () => {
    await commonPage.openFastActionReport('pregnancy');
    await pregnancyForm.submitDefaultPregnancy();
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await reportsPage.openSelectedReport(await reportsPage.firstReport());
    pregnancyId = await reportsPage.getCurrentReportId();

    await commonPage.goToTasks();
    await taskPage.openTaskById(pregnancyId, '~pregnancy-facility-visit-reminder~anc.facility_reminder');

    expect(await genericForm.getFormTitle()).to.equal('Health facility ANC reminder');
    expect(await commonEnketoPage.isElementDisplayed('label',
      `Please remind the client to attend their ANC visit on ${ancDate.format('D MMM, YYYY')}.`)).to.be.true;

    await commonEnketoPage.selectRadioButton('Did you remind the client in-person or by phone?', 'In person');
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await reportsPage.openSelectedReport(await reportsPage.firstReport());
    await commonPage.waitForPageLoaded();

    //The pregnancyId value should be loaded into the "pregnancy_facility_visit_reminder" form via the "contact-summary"
    expect((await reportsPage.getDetailReportRowContent('pregnancy_uuid_ctx')).rowValues[0]).to.equal(pregnancyId);
    expect(Date.parse((await reportsPage.getDetailReportRowContent('visit_date_for_task')).rowValues[0]))
      .to.equal(Date.parse(ancDate.format('D MMM, YYYY')));
    expect((await reportsPage.getDetailReportRowContent('remind_method')).rowValues[0]).to.equal('in_person');
  });

});
