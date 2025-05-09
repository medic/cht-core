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
    contact: districtHospitalContact,
  });

  const healthCenter = places.get('health_center');
  const healthCenterContact = personFactory.build({ parent: healthCenter });
  const healthCenterUser = userFactory.build({
    username: 'user_filter_health_center',
    place: healthCenter._id,
    roles: [ 'program_officer' ],
    contact: healthCenterContact,
  });

  const patient = personFactory.build({ parent: healthCenterUser });
  const today = moment();
  const pregnancyHealthCenter = reportFactory
    .report()
    .build(
      {
        form: 'pregnancy',
        verified: true,
        reported_date: moment([today.year(), today.month(), 1, 23, 30]).subtract(4, 'month').valueOf()
      },
      { patient, submitter: healthCenterContact, fields: { lmp_date: 'Feb 3, 2022' } }
    );
  const pregnancyDistrictHospital = reportFactory
    .report()
    .build(
      {
        form: 'pregnancy',
        reported_date: moment([today.year(), today.month(), 12, 10, 30]).subtract(1, 'month').valueOf()
      },
      { patient, submitter: districtHospitalContact, fields: { lmp_date: 'Feb 16, 2022' } }
    );
  const visitHealthCenter = reportFactory
    .report()
    .build(
      {
        form: 'pregnancy_home_visit',
        verified: false,
        reported_date: moment([today.year(), today.month(), 15, 0, 30]).subtract(5, 'month').valueOf()
      },
      { patient, submitter: healthCenterContact, fields: { ok: 'Yes!' } }
    );
  const visitDistrictHospital = reportFactory
    .report()
    .build(
      {
        form: 'pregnancy_home_visit',
        verified: true,
        reported_date: moment([today.year(), today.month(), 16, 9, 10]).subtract(1, 'month').valueOf()
      },
      { patient, submitter: districtHospitalContact, fields: { ok: 'Yes!' } }
    );
  const reports = [
    pregnancyHealthCenter,
    pregnancyDistrictHospital,
    visitHealthCenter,
    visitDistrictHospital
  ];

  before(async () => {
    await utils.saveDocs([ ...places.values(), patient ]);
    await utils.createUsers([ districtHospitalUser, healthCenterUser ]);
    const savedReports = await utils.saveDocs(reports);
    savedReports.forEach((savedReport, index) => reports[index]._id = savedReport.id);
  });

  afterEach(async () => {
    await commonPage.logout();
    await utils.revertSettings(true);
  });

  after(async () => await utils.deleteUsers([ districtHospitalUser, healthCenterUser ]));

  it('should filter by date', async () => {
    await loginPage.login(districtHospitalUser);
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().waitForDisplayed();
    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(reports.length);

    await reportsPage.openSidebarFilter();
    await reportsPage.openSidebarFilterDateAccordion();
    await reportsPage.setSidebarFilterFromDate();
    await reportsPage.setSidebarFilterToDate();
    await commonPage.waitForPageLoaded();

    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(pregnancyDistrictHospital._id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(visitDistrictHospital._id).isDisplayed()).to.be.true;
  });

  it('should filter by form', async () => {
    await loginPage.login(districtHospitalUser);
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().waitForDisplayed();
    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(reports.length);

    await reportsPage.openSidebarFilter();
    await reportsPage.filterByForm('Pregnancy home visit');
    await commonPage.waitForPageLoaded();

    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(visitHealthCenter._id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(visitDistrictHospital._id).isDisplayed()).to.be.true;
  });

  it('should filter by place', async () => {
    await loginPage.login(districtHospitalUser);
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().waitForDisplayed();
    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(reports.length);

    await reportsPage.openSidebarFilter();
    await reportsPage.filterByFacility(districtHospital.name, healthCenter.name);
    await commonPage.waitForPageLoaded();

    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(visitHealthCenter._id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(pregnancyHealthCenter._id).isDisplayed()).to.be.true;
  });

  it('should filter by status', async () => {
    await loginPage.login(districtHospitalUser);
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().waitForDisplayed();
    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(reports.length);

    await reportsPage.openSidebarFilter();
    await reportsPage.filterByStatus('Reviewed: correct');
    await commonPage.waitForPageLoaded();

    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(pregnancyHealthCenter._id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(visitDistrictHospital._id).isDisplayed()).to.be.true;
  });

  it('should filter by user associated place when the permission to default filter is enabled', async () => {
    await loginPage.login(healthCenterUser);
    await commonPage.waitForPageLoaded();

    const settings = await utils.getSettings();
    const newSettings = {
      permissions: { ...settings.permissions, can_default_facility_filter: [ 'program_officer' ] },
    };
    await utils.updateSettings(newSettings);

    await commonPage.goToReports();
    await reportsPage.leftPanelSelectors.firstReport().waitForDisplayed();

    expect(await reportsPage.leftPanelSelectors.allReports().length).to.equal(2);
    expect(await reportsPage.leftPanelSelectors.reportByUUID(pregnancyHealthCenter._id).isDisplayed()).to.be.true;
    expect(await reportsPage.leftPanelSelectors.reportByUUID(visitHealthCenter._id).isDisplayed()).to.be.true;
  });
});

