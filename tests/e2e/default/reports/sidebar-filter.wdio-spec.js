const moment = require('moment');

const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportFactory = require('@factories/cht/reports/generic-report');

describe('Reports Sidebar Filter', () => {
  const places = placeFactory.generateHierarchy();

  const districtHospital = places.get('district_hospital');
  const districtHospitalContact = personFactory.build({ parent: districtHospital });
  const districtHospitalUser = userFactory.build({
    username: 'user_filter_district_hospital',
    place: districtHospital._id,
    roles: ['chw'],
    contact: districtHospitalContact,
  });

  const healthCenter = places.get('health_center');
  const healthCenterContact = personFactory.build({ parent: healthCenter });
  const healthCenterUser = userFactory.build({
    username: 'user_filter_health_center',
    place: healthCenter._id,
    roles: ['program_officer'],
    contact: healthCenterContact,
  });

  const patient = personFactory.build({ parent: healthCenterUser });
  const today = moment();
  const reports = [
    reportFactory
      .report()
      .build(
        {
          form: 'P',
          reported_date: moment([today.year(), today.month(), 1, 23, 30]).subtract(4, 'month').valueOf()
        },
        { patient, submitter: healthCenterContact, fields: { lmp_date: 'Feb 3, 2022' } }
      ),
    reportFactory
      .report()
      .build(
        {
          form: 'P',
          reported_date: moment([today.year(), today.month(), 12, 10, 30]).subtract(1, 'month').valueOf()
        },
        { patient, submitter: districtHospitalContact, fields: { lmp_date: 'Feb 16, 2022' } }
      ),
    reportFactory
      .report()
      .build(
        {
          form: 'V',
          reported_date: moment([today.year(), today.month(), 15, 0, 30]).subtract(5, 'month').valueOf()
        },
        { patient, submitter: healthCenterContact, fields: { ok: 'Yes!' } }
      ),
    reportFactory
      .report()
      .build(
        {
          form: 'V',
          reported_date: moment([today.year(), today.month(), 16, 9, 10]).subtract(1, 'month').valueOf()
        },
        { patient, submitter: districtHospitalContact, fields: { ok: 'Yes!' } }
      ),
  ];
  let savedReports;

  before(async () => {
    await utils.saveDocs([...places.values(), patient]);
    savedReports = (await utils.saveDocs(reports)).map(result => result.id);
    await utils.createUsers([districtHospitalUser, healthCenterUser]);
  });

  afterEach(async () => {
    await commonPage.logout();
    await utils.revertSettings(true);
  });

  it('should filter by date', async () => {
    const pregnancyDistrictHospital = savedReports[1];
    const visitDistrictHospital = savedReports[3];
    await browser.url('/');

    await loginPage.login(districtHospitalUser);
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await (await reportsPage.firstReport()).waitForDisplayed();
    expect((await reportsPage.allReports()).length).to.equal(savedReports.length);

    await reportsPage.openSidebarFilter();
    await reportsPage.openSidebarFilterDateAccordion();
    await reportsPage.setSidebarFilterFromDate();
    await reportsPage.setSidebarFilterToDate();
    await commonPage.waitForPageLoaded();

    expect((await reportsPage.allReports()).length).to.equal(2);
    expect(await (await reportsPage.reportByUUID(pregnancyDistrictHospital)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(visitDistrictHospital)).isDisplayed()).to.be.true;
  });

  it('should filter by user associated place when the permission to default filter is enabled', async () => {
    const pregnancyHealthCenter = savedReports[0];
    const visitHealthCenter = savedReports[2];
    await browser.url('/');

    await loginPage.login(healthCenterUser);
    await commonPage.waitForPageLoaded();

    const settings = await utils.getSettings();
    const newSettings = {
      permissions: { ...settings.permissions, can_default_facility_filter: ['program_officer'] },
    };
    await utils.updateSettings(newSettings);

    await commonPage.goToReports();
    await (await reportsPage.firstReport()).waitForDisplayed();

    expect((await reportsPage.allReports()).length).to.equal(2);
    expect(await (await reportsPage.reportByUUID(pregnancyHealthCenter)).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(visitHealthCenter)).isDisplayed()).to.be.true;
  });
});

