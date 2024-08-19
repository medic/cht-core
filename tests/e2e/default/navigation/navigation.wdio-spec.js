const utils = require('../../../utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');


describe('Navigation tests', () => {
  describe('Navigation functionality', () => {
    before(async () => {
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

  describe('Navigation view', () => {
    const places = placeFactory.generateHierarchy();
    const districtHospital = places.get('district_hospital');
    const user = userFactory.build({ place: districtHospital._id, roles: ['chw'] });

    describe('as admin', () => {
      before(async () => {
        await loginPage.cookieLogin();
      });
      after(async () => {
        await commonPage.logout();
      });

      it('should display tab labels, when all tabs are enabled', async () => {
        const tabsButtonLabelsNames = await commonPage.getAllButtonLabelsNames();
        expect(tabsButtonLabelsNames).to.deep.equal(['Messages', 'Tasks', 'Reports', 'People', 'Targets']);
      });
    });

    describe('as chw', () => {
      before(async () => {
        await utils.saveDocs([...places.values()]);
        await utils.createUsers([user]);
        const permissionsToRemove = [
          'can_view_analytics',
          'can_view_analytics_tab',
          'can_view_tasks',
          'can_view_tasks_tab'
        ];

        await utils.updatePermissions(user.roles, [], permissionsToRemove);
        await loginPage.login(user);
      });

      it('should display tab labels, when some tabs are enabled', async () => {
        const tabsButtonLabelsNames = await commonPage.getAllButtonLabelsNames();
        expect(tabsButtonLabelsNames).to.deep.equal(['Messages', 'Reports', 'People']);
      });

      it('should not create feedback docs when loading missing reports or people', async () => {
        await commonPage.goToPeople('missing');
        await commonPage.goToReports('missing');
        console.log('after loading missing person');
      });
    });
  });
});
