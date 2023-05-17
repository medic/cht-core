const utils = require('../../../utils');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');

describe('Navigation tests', async () => {
  describe('Navigation functionality', async () => {
    beforeEach(async () => {
      await loginPage.cookieLogin();
    });

    after(async () => {
      await commonPage.logout();
    });

    it('should open Messages tab', async () => {
      await commonPage.goToMessages();
      expect(await commonPage.isMessagesListPresent());
    });

    it('should open tasks tab', async () => {
      await commonPage.goToTasks();
      expect(await commonPage.isTasksListPresent());
    });

    it('should open Reports or History tab', async () => {
      await commonPage.goToReports();
      expect(await commonPage.isReportsListPresent());
    });

    it('should open Contacts or Peoples tab', async () => {
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent());
    });

    it('should open Analytics tab', async () => {
      await commonPage.goToAnalytics();
      expect(await commonPage.isTargetMenuItemPresent());
      expect(await commonPage.isTargetAggregatesMenuItemPresent());
    });
  });

  describe('Navigation view', async () => {
    const places = placeFactory.generateHierarchy();
    const districtHospital = places.get('district_hospital');
    const user = userFactory.build({ place: districtHospital._id, roles: ['program_officer'] });

    beforeEach(async () => {
      await utils.saveDocs([...places.values()]);
      await utils.createUsers([user]);
    });

    afterEach(async () => {
      await commonPage.logout();
      await utils.deleteUsers([user]);
      await utils.revertDb([/^form:/], true);
      await utils.revertSettings(true);
    });

    it('should display tab labels, when all tabs are enabled', async () => {
      await loginPage.cookieLogin();
      const tabsButtonLabelsNames = await commonPage.getAllButtonLabelsNames();
      expect(tabsButtonLabelsNames.length).to.deep.equal(5);
      expect(tabsButtonLabelsNames).to.deep.equal(['Messages', 'Tasks', 'Reports', 'People', 'Targets']);
    });

    it('should display tab labels, when some tabs are enabled', async () => {
      const permissionsToRemove = ['can_view_analytics', 'can_view_analytics_tab', 'can_view_tasks', 'can_view_tasks_tab'];
      await utils.updatePermissions(user.roles, [], permissionsToRemove);

      await loginPage.login(user);
      const tabsButtonLabelsNames = await commonPage.getAllButtonLabelsNames();
      expect(tabsButtonLabelsNames.length).to.deep.equal(3);
      expect(tabsButtonLabelsNames).to.deep.equal(['Messages', 'Reports', 'People']);
    });
  });
});
