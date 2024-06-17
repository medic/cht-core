const uuid = require('uuid').v4;
const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');

describe('Message Tab - Sender Data', () => {
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
    username: 'offlineuser_messages',
    isOffline: true,
    place: healthCenter1._id,
    contact: offlineUserContact._id,
  });
  const onlineUser = userFactory.build({
    username: 'onlineuser_messages',
    roles: [ 'program_officer' ],
    place: districtHospital._id,
    contact: onlineUserContact._id,
  });
  const patient = personFactory.build({
    _id: 'patient1',
    phone: '+14152223344',
    name: 'patient1',
    parent: { _id: clinic._id, parent: { _id: healthCenter1._id, parent: { _id: districtHospital._id }}}
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

  before(async () => {
    await utils.saveDocs([
      ...places.values(), healthCenter2, offlineUserContact, onlineUserContact, patient,
      contactWithManyPlaces, userWithManyPlaces,
    ]);
    await utils.request({
      path: `/_users/${userWithManyPlaces._id}`,
      method: 'PUT',
      body: { ...userWithManyPlaces, password: userWithManyPlacesPass, type: 'user' },
    });
    await utils.createUsers([ onlineUser, offlineUser ]);
  });

  afterEach(async () => {
    await commonElements.logout();
  });

  it('should display messages with breadcrumbs for online user', async () => {
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();
    await messagesPage.sendMessage('Contact', patient.phone, patient.name);

    const { lineage} = await messagesPage.getMessageInListDetails(patient._id);
    const expectedLineage = clinic.name.concat(healthCenter1.name, districtHospital.name);

    expect(lineage).to.equal(expectedLineage);
  });

  it('should not remove facility from breadcrumbs when offline user has many facilities associated', async () => {
    await loginPage.login({ password: userWithManyPlacesPass, username: userWithManyPlaces.name });
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();
    await messagesPage.sendMessage('Contact', patient.phone, patient.name);

    const { lineage} = await messagesPage.getMessageInListDetails(patient._id);
    const expectedLineage = clinic.name.concat(healthCenter1.name);

    expect(lineage).to.equal(expectedLineage);
  });

  it('should display messages with updated breadcrumbs for offline user', async () => {
    await loginPage.login(offlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();

    const { lineage} = await messagesPage.getMessageInListDetails(patient._id);
    const expectedLineage = clinic.name;

    expect(lineage).to.equal(expectedLineage);
  });

  it('should display conversation with link and navigate to contact', async () => {
    await loginPage.login(offlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();

    await messagesPage.openMessage(patient._id);
    const header = await messagesPage.getMessageHeader();
    expect(header.name).to.equal(patient.name);
    expect(header.phone).to.equal(patient.phone);

    await messagesPage.navigateFromConversationToContact();
    const title = await contactsPage.getContactInfoName();
    expect(title).to.equal(patient.name);
  });

});
