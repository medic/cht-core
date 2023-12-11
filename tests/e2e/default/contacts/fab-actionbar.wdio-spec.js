const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const { genericForm } = require('@page-objects/default/contacts/contacts.wdio.page');

const places = placeFactory.generateHierarchy();
const healthCenter = places.get('health_center');
const onlineUser = userFactory.build({ place: healthCenter._id, roles: [ 'program_officer' ] });
const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
describe('FAB + Actionbar', () => {
  before(async () => {
    await utils.saveDocs([ ...places.values(), patient ]);
    await utils.createUsers([ onlineUser ]);
    await loginPage.login(onlineUser);
  });

  afterEach(async () => {
    await utils.revertSettings(false);
  });

  describe('FAB', () => {
    it('should show new household and new person create option', async () => {
      await commonElements.goToPeople(healthCenter._id);
      const fabLabels = await commonElements.getFastActionItemsLabels();

      expect(fabLabels).to.have.members(['New household', 'New person']);
    });

    it('should show fab when user only has can_create_places permission', async () => {
      await utils.updatePermissions(onlineUser.roles, [], ['can_create_people']);
      await commonElements.goToPeople(healthCenter._id);

      await commonElements.clickFastActionFAB({ waitForList: false });
      const formTitle = await genericForm.getFormTitle();
      expect(formTitle).to.equal('New household');
    });

    it('should show fab when user only has can_create_people permission', async () => {
      await utils.updatePermissions(onlineUser.roles, [], ['can_create_places']);
      await commonElements.goToPeople(healthCenter._id);

      await commonElements.clickFastActionFAB({ waitForList: false });
      const formTitle = await genericForm.getFormTitle();
      expect(formTitle).to.equal('New person');
    });
  });

  describe('Action bar', () => {
    it('should show new household and new person create option', async () => {
      await utils.updatePermissions(onlineUser.roles, ['can_view_old_action_bar']);
      await commonElements.goToPeople(healthCenter._id);
      const actionBarLabels = await commonElements.getActionBarLabels();

      expect(actionBarLabels).to.have.members([
        'New household',
        'New person',
        'New action',
      ]);
    });

    it('should not show new person when missing permission', async () => {
      await utils.updatePermissions(onlineUser.roles, ['can_view_old_action_bar'], ['can_create_people']);
      await commonElements.goToPeople(healthCenter._id);
      const actionBarLabels = await commonElements.getActionBarLabels();

      expect(actionBarLabels).to.have.members([
        'New household',
        'New action',
      ]);
    });

    it('should not show new place when missing permission', async () => {
      await utils.updatePermissions(onlineUser.roles, ['can_view_old_action_bar'], ['can_create_places']);
      await commonElements.goToPeople(healthCenter._id);
      const actionBarLabels = await commonElements.getActionBarLabels();

      expect(actionBarLabels).to.have.members([
        'New person',
        'New action',
      ]);
    });
  });
});
