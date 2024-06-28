const moment = require('moment');
const uuid = require('uuid').v4;

const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportFactory = require('@factories/cht/reports/generic-report');

describe('Reports tab breadcrumbs', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter1 = places.get('health_center');
  const districtHospital = places.get('district_hospital');
  const healthCenter2 = placeFactory.place().build({
    name: 'health_center_2',
    type: 'health_center',
    parent: { _id: districtHospital._id },
  });
  const offlineUserContact = {
    _id: 'fixture:user:user1',
    name: 'OfflineUser',
    phone: '+12068881234',
    place: healthCenter1._id,
    type: 'person',
    parent: { _id: healthCenter1._id, parent: healthCenter1.parent },
  };
  const onlineUserContact = {
    _id: 'fixture:user:user2',
    name: 'OnlineUser',
    phone: '+12068881235',
    place: districtHospital._id,
    type: 'person',
    parent: { _id: districtHospital._id },
  };
  const offlineUser = userFactory.build({
    username: 'offlineuser_breadcrumbs',
    isOffline: true,
    place: healthCenter1._id,
    contact: offlineUserContact._id,
  });
  const onlineUser = userFactory.build({
    username: 'onlineuser_breadcrumbs',
    roles: [ 'program_officer' ],
    place: districtHospital._id,
    contact: onlineUserContact._id,
  });
  const patient = personFactory.build({
    _id: 'patient1',
    parent: { _id: clinic._id, parent: { _id: healthCenter1._id, parent: { _id: districtHospital._id } } },
  });
  const contactWithManyPlaces = personFactory.build({
    parent: { _id: healthCenter1._id, parent: { _id: districtHospital._id } },
  });
  const userWithManyPlaces = {
    _id: 'org.couchdb.user:offline_many_facilities',
    language: 'en',
    known: true,
    type: 'user-settings',
    roles: [ 'chw' ],
    facility_id: [ healthCenter1._id, healthCenter2._id ],
    contact_id: contactWithManyPlaces._id,
    name: 'offline_many_facilities'
  };
  const userWithManyPlacesPass = uuid();

  const today = moment();
  const report1 = reportFactory
    .report()
    .build(
      {
        form: 'P',
        reported_date: moment([today.year(), today.month(), 1, 23, 30]).subtract(4, 'month').valueOf(),
        patient_id: 'patient1',
      },
      { patient, submitter: offlineUser.contact, fields: { lmp_date: 'Feb 3, 2022', patient_id: 'patient1' } },
    );
  const report2 = reportFactory
    .report()
    .build(
      {
        form: 'P',
        reported_date: moment([today.year(), today.month(), 1, 23, 30]).subtract(4, 'month').valueOf(),
        patient_id: 'patient1',
      },
      {
        patient,
        submitter: userWithManyPlaces.contact_id,
        fields: { lmp_date: 'Feb 3, 2022', patient_id: 'patient1' },
      },
    );

  before(async () => {
    await utils.saveDocs([
      ...places.values(), healthCenter2, offlineUserContact, onlineUserContact,
      contactWithManyPlaces, userWithManyPlaces, patient, report1, report2,
    ]);
    await utils.request({
      path: `/_users/${userWithManyPlaces._id}`,
      method: 'PUT',
      body: { ...userWithManyPlaces, password: userWithManyPlacesPass, type: 'user' },
    });
    await utils.createUsers([ onlineUser, offlineUser ]);
  });

  afterEach(async () => await commonElements.logout());

  it('should display reports with breadcrumbs for online user', async () => {
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
    await (await reportsPage.firstReport()).waitForDisplayed();
    await commonElements.waitForPageLoaded();

    const reportLineages = await reportsPage.reportsListDetails();
    const expectedLineage = clinic.name.concat(healthCenter1.name, districtHospital.name);

    expect(reportLineages[0].lineage).to.equal(expectedLineage);
  });

  it('should not remove facility from breadcrumbs when offline user has many facilities associated', async () => {
    await loginPage.login({ password: userWithManyPlacesPass, username: userWithManyPlaces.name });
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
    await (await reportsPage.firstReport()).waitForDisplayed();
    await commonElements.waitForPageLoaded();

    const reportLineages = await reportsPage.reportsListDetails();
    const expectedLineage = clinic.name.concat(healthCenter1.name);

    expect(reportLineages[0].lineage).to.equal(expectedLineage);
  });

  it('should display reports with updated breadcrumbs for offline user', async () => {
    await loginPage.login(offlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
    await (await reportsPage.firstReport()).waitForDisplayed();
    await commonElements.waitForPageLoaded();

    const reportLineages = await reportsPage.reportsListDetails();
    const expectedLineage = clinic.name;

    expect(reportLineages[0].lineage).to.equal(expectedLineage);
  });
});
