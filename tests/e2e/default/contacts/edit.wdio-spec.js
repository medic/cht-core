const cloneDeep = require('lodash/cloneDeep');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Edit ', () => {
  const CONTACT_NAME = 'Maria Gomez';
  const CONTACT_UPDATED_NAME = 'Ana Paula Gonzalez';
  const PLACE_UPDATED_NAME = 'Updated Health Center';

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const offlineUserContact = personFactory.build({ name: CONTACT_NAME, parent: healthCenter });
  const onlineUserContact = personFactory.build({ parent: healthCenter });
  healthCenter.contact = cloneDeep(offlineUserContact);

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

  // User without can_update_contacts permission
  const restrictedUser = userFactory.build({
    username: 'restricted_user',
    place: healthCenter._id,
    roles: ['chw'],
    contact: personFactory.build({ parent: healthCenter })
  });

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([offlineUser, onlineUser, restrictedUser]);
  });

  afterEach(async () => {
    // Dismiss any open overlays/modals/backdrops before the next test runs
    await commonPage.hideModalOverlay();
    // Navigate away to a clean state so no stale overlays remain
    try {
      await browser.keys('Escape');
    } catch {
      // ignore if no overlay to dismiss
    }
    try {
      await commonPage.closeReloadModal(false);
    } catch {
      // ignore if no modal
    }
  });

  it('should update a contact, delete the same contact then unassign primary contact from facility', async () => {
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

  it('should not show edit option when user lacks can_update_contacts permission', async () => {
    // Ensure no leftover overlays from previous test
    await browser.execute(() => {
      const backdrops = document.querySelectorAll('.cdk-overlay-backdrop');
      backdrops.forEach(el => el.remove());
    });

    await loginPage.login(restrictedUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.waitForContactLoaded();

    await commonPage.openMoreOptionsMenu();

    const isEditVisible = await commonPage.isMenuOptionVisible('edit');
    expect(isEditVisible).to.be.false;

    await commonPage.logout();
  });

  it('should sync and update the offline user\'s home place', async () => {
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await commonPage.logout();

    await loginPage.login(onlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await contactPage.editPlace(healthCenter.name, PLACE_UPDATED_NAME, CONTACT_TYPES.HEALTH_CENTER);
    await commonPage.waitForPageLoaded();
    await commonPage.logout();

    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();

    expect(await contactPage.getContactInfoName()).to.equal(healthCenter.name);
    await commonPage.sync();
    expect(await contactPage.getContactInfoName()).to.equal(PLACE_UPDATED_NAME);
  });

});
