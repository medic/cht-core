const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const { CONTACT_TYPES } = require('@medic/constants');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');

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

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should hide the create-contact action on a muted clinic when the CHW lacks the permission', async () => {
    await commonPage.goToPeople(mutedClinic._id);
    await contactPage.waitForContactLoaded();
    await browser.pause(500);
    // the muted clinic is the selected contact and its card has rendered. The FAB list is computed
    // in a separate subscription, so this is margin rather than a barrier; the counterfactual in
    // the permission-granted case is the real evidence that the assertion is load bearing.

    // The right-side FAB is hidden entirely (*ngIf="fastActions?.length") when every action is
    // filtered. Scoped to .item-content so the contacts-list left-side FAB is not matched. Holds for
    // the seeded muted clinic because it has no phone and no clinic-scoped report forms; if seed
    // data later grows action-emitting fields, this assertion will need to be tightened to inspect
    // the open FAB list rather than the trigger itself.
    expect(await $('.item-content .fast-action-trigger').isExisting()).to.be.false;
  });

  it('should show the create-contact action on a non-muted clinic', async () => {
    await commonPage.goToPeople(clinic._id);
    expect(await browser.getUrl()).to.include(clinic._id);

    // Clinic only parents `person`. With one action the FAB executes the action directly on click;
    // verifying the New person form opens proves the action is present.
    await commonPage.clickFastActionFAB({ waitForList: false });
    expect(await genericForm.getFormTitle()).to.equal('New person');

    // The untouched add form flags itself edited, so leaving it needs the Exit form modal.
    await genericForm.cancelForm();
    await modalPage.submit();
  });

  it('should block the add-contact deep link on a muted clinic when the CHW lacks the permission', async () => {
    // The FAB gate only hides the button. This proves ContactsEditComponent also refuses the route,
    // which is what closes the deep link and the task `contact` action.
    await commonPage.goToUrl(`/#/contacts/${mutedClinic._id}/add/person`);
    await commonPage.waitForPageLoaded();

    expect(await $('.item-content.empty-selection').getText())
      .to.contain('not authorized');
    expect(await $('#contact-form').isDisplayed()).to.be.false;
  });

  it('should show create-contact on muted clinic when role has can_create_contacts_under_muted_places', async () => {
    // ignoreReload: the user is offline, so the settings doc only arrives on the sync below and the
    // reload modal this helper otherwise waits 10s for can never appear.
    await utils.updatePermissions(
      ['chw'], ['can_create_contacts_under_muted_places'], [], { ignoreReload: true }
    );
    await commonPage.sync({ reload: true });

    await commonPage.goToPeople(mutedClinic._id);
    // Guards against the navigation being blocked by a leftover form: prove we are on the muted clinic.
    expect(await browser.getUrl()).to.include(mutedClinic._id);

    await commonPage.clickFastActionFAB({ waitForList: false });
    expect(await genericForm.getFormTitle()).to.equal('New person');

    // The settings change can land on a later automatic sync, raising the "Update available" prompt
    // while this form is open. Its backdrop would otherwise intercept the cancel click below.
    await commonPage.closeReloadModal(false);
    await genericForm.cancelForm();
    await modalPage.submit();
  });
});
