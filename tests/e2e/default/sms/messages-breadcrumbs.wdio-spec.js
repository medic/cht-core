const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const messagesPage = require('../../../page-objects/default/sms/messages.wdio.page');

describe('Tasks tab breadcrumbs', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const health_center = places.get('health_center');
  const district_hospital = places.get('district_hospital');
  const contact = {
    _id: 'fixture:user:user1',
    name: 'OfflineUser',
    phone: '+12068881234',
    place: health_center._id,
    type: 'person',
    parent: {
      _id: health_center._id,
      parent: health_center.parent
    },
  };
  const contact2 = {
    _id: 'fixture:user:user2',
    name: 'OnlineUser',
    phone: '+12068881235',
    place: district_hospital._id,
    type: 'person',
    parent: {
      _id: district_hospital._id,
    },
  };
  const offlineUser = userFactory.build({
    username: 'offlineuser',
    isOffline: true,
    place: health_center._id,
    contact: contact._id,
  });
  const onlineUser = userFactory.build({
    username: 'onlineuser',
    roles: [ 'program_officer' ],
    place: district_hospital._id,
    contact: contact2._id,
  });
  const patient = personFactory.build({
    _id: 'patient1',
    phone: '+14152223344',
    name: 'patient1',
    parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}}
  });

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, contact2, patient ]);
    await utils.createUsers([ onlineUser, offlineUser ]);
  });

  afterEach(async () => {
    await commonElements.logout();
  });

  it('should display messages with breadcrumbs for online user', async () => {
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();
    await messagesPage.sendMessageToPhone('Contact', patient.phone);

    await messagesPage.waitForMessagesInLHS();
    const message = await messagesPage.messageByIndex(1);
    const messagesLineages =  await (await messagesPage.listMessageLineage(message)).getText();

    const expectedLineage = clinic.name.concat(health_center.name, district_hospital.name);

    expect(messagesLineages).to.equal(expectedLineage);
  });


  it('should display messages with updated breadcrumbs for offline user', async () => {
    await loginPage.login(offlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToMessages();

    await messagesPage.waitForMessagesInLHS();
    const message = await messagesPage.messageByIndex(1);
    const messagesLineages =  await (await messagesPage.listMessageLineage(message)).getText();

    const expectedLineage = clinic.name;

    expect(messagesLineages).to.equal(expectedLineage);
  });

});
