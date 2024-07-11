const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');

describe('Edit Person Under Area', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const offlineUserContact = personFactory.build({ parent: healthCenter });
  const onlineUserContact = personFactory.build({ parent: healthCenter });
  const offlineUser = userFactory.build({
    username: 'offline_user',
    place: healthCenter._id,
    roles: ['chw'],
    contact: offlineUserContact
  });
  const onlineUser = userFactory.build({
    username: 'online_user',
    place: healthCenter._id,
    roles: ['program_officer'],
    contact: onlineUserContact
  });
  const editedPlaceName = 'Updated Health Center';

  const docs = [...places.values()];

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([offlineUser, onlineUser]);
  });

  xit('can sync and update offlineUser HomePlace', async () => {
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await commonPage.logout();

    await loginPage.login(onlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await contactPage.editPlace(healthCenter.name, editedPlaceName, 'health_center');
    await commonPage.waitForPageLoaded();
    await commonPage.logout();

    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();

    expect(await contactPage.getContactCardText()).to.equal(healthCenter.name);
    await commonPage.sync();
    expect(await contactPage.getContactCardText()).to.equal(editedPlaceName);
  });
});
