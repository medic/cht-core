const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Hide create-contact actions on muted places', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const clinic = places.get(CONTACT_TYPES.CLINIC);

  const mutedClinic = placeFactory.place().build({
    name: 'Muted Clinic',
    type: CONTACT_TYPES.CLINIC,
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    muted: new Date(),
  });

  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });

  before(async () => {
    await utils.saveDocs([...places.values(), mutedClinic]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  afterEach(async () => {
    // Tests 2 and 3 leave a partially-filled form on screen; refresh to bypass the Exit-form modal.
    await browser.refresh();
    await commonPage.waitForPageLoaded();
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should hide the create-contact action on a muted clinic when the CHV lacks the permission', async () => {
    await commonPage.goToPeople(mutedClinic._id);

    // The right-side FAB is hidden entirely (*ngIf="fastActions?.length") when every action is
    // filtered. Scoped to .item-content so the contacts-list left-side FAB is not matched. Holds for
    // the seeded muted clinic because it has no phone and no clinic-scoped report forms; if seed
    // data later grows action-emitting fields, this assertion will need to be tightened to inspect
    // the open FAB list rather than the trigger itself.
    expect(await $('.item-content .fast-action-trigger').isExisting()).to.be.false;
  });

  it('should show the create-contact action on a non-muted clinic', async () => {
    await commonPage.goToPeople(clinic._id);

    // Clinic only parents `person`. With one action the FAB executes the action directly on click;
    // verifying the New person form opens proves the action is present.
    await commonPage.clickFastActionFAB({ waitForList: false });
    await $('#form-title').waitForDisplayed();
    expect(await $('#form-title').getText()).to.equal('New person');
  });

  it('shows create-contact on muted clinic when role has can_create_contacts_under_muted_places', async () => {
    await utils.updatePermissions(['chw'], ['can_create_contacts_under_muted_places'], []);
    await commonPage.sync({ reload: true });

    await commonPage.goToPeople(mutedClinic._id);

    await commonPage.clickFastActionFAB({ waitForList: false });
    await $('#form-title').waitForDisplayed();
    expect(await $('#form-title').getText()).to.equal('New person');
  });
});
