const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');

describe('Edit ', () => {
  const CONTACT_NAME = 'Maria Gomez';
  const CONTACT_UPDATED_NAME = 'Ana Paula Gonzalez';
  const PLACE_UPDATED_NAME = 'Updated Health Center';

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const offlineUserContact = personFactory.build({ name: CONTACT_NAME, parent: healthCenter });
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

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([offlineUser, onlineUser]);
  });

  it('should update the contact name ' +
    'and then remove the primary contact from the clinic when the contact is deleted', async () => {
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.editPersonName(CONTACT_NAME, CONTACT_UPDATED_NAME);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(healthCenter._id);
    const primaryContactName = await contactPage.getPrimaryContactName();

    expect(primaryContactName).to.equal(CONTACT_UPDATED_NAME);
    expect(await contactPage.getAllRHSPeopleNames()).to.include.members([ CONTACT_UPDATED_NAME ]);

    await contactPage.selectLHSRowByText(CONTACT_UPDATED_NAME);
    await contactPage.waitForContactLoaded();
    await contactPage.deletePerson();

    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.waitForContactLoaded();
    expect(await contactPage.getAllRHSPeopleNames()).to.not.include.members([ CONTACT_UPDATED_NAME ]);

    await commonPage.logout();
  });

  it('should sync and update offlineUser HomePlace', async () => {
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await commonPage.logout();

    await loginPage.login(onlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await contactPage.editPlace(healthCenter.name, PLACE_UPDATED_NAME, 'health_center');
    await commonPage.waitForPageLoaded();
    await commonPage.logout();

    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();

    expect(await contactPage.getContactCardText()).to.equal(healthCenter.name);
    await commonPage.sync();
    expect(await contactPage.getContactCardText()).to.equal(PLACE_UPDATED_NAME);
  });

});
