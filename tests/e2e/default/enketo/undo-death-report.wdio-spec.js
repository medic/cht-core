const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const deathReportForm = require('@page-objects/default/enketo/death-report.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

describe('Submit an undo death report', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const person = personFactory.build({ parent: {_id: healthCenter._id, parent: healthCenter.parent} });

  before(async () => {
    await utils.saveDocs([...places.values(), person]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);

    await commonPage.goToPeople(person._id);
    await commonPage.openFastActionReport('death_report');
    await deathReportForm.submitDeathReport();
    await commonPage.sync(true);
  });

  it('should submit an undo death report, ' +
    'verify that it was registered successfully and ' +
    'verify that the counter for the Deaths, in the targets section, was set to 0.', async () => {

    // Submit an Undo death report
    await commonPage.openFastActionReport('undo_death_report');
    await commonEnketoPage.selectRadioButton(
      'Submitting this form will undo the death report of ' +
      person.name +
      '. Are you sure you want to undo the death report?',
      'Yes'
    );
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await commonPage.sync(true);

    expect(await (await contactPage.deathCardSelectors.deathCard()).isDisplayed()).to.be.false;

    // Verify that the report was created successfully
    await commonPage.goToReports();
    const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
    expect(firstReport.heading).to.equal(person.name);
    expect(firstReport.form).to.equal('Undo death report');

    // Verify that the counter for the Deaths, in the targets section, was set to 0.
    await commonPage.goToAnalytics();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', goal: '20', count: '0', countNumberColor: TARGET_UNMET_COLOR },
      { title: 'Live births', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR },
    ]);

  });
});
