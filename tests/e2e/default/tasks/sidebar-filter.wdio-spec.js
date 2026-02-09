const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');

describe('Tasks Sidebar Filter', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const healthCenter1 = places.get('health_center');
  const clinic1 = places.get('clinic');

  const healthCenter2 = placeFactory.place().build({
    name: 'Health Center 2',
    type: 'health_center',
    parent: districtHospital,
  });

  const clinic2 = placeFactory.place().build({
    name: 'Clinic 2',
    type: 'clinic',
    parent: healthCenter2,
  });

  const chwContact = personFactory.build({
    name: 'CHW User',
    phone: '+12068881234',
    place: healthCenter1._id,
    parent: healthCenter1,
  });

  const chw = userFactory.build({
    username: 'offlineuser_filter_tasks',
    isOffline: true,
    place: healthCenter1._id,
    contact: chwContact._id,
  });

  const chw2 = userFactory.build({
    username: 'offlineuser_filter_tasks_multiple_facilities',
    isOffline: true,
    place: [healthCenter1._id, healthCenter2._id],
    contact: chwContact._id,
  });

  const supervisorContact = personFactory.build({
    name: 'Supervisor User',
    isOffline: true,
    phone: '+12068885678',
    place: districtHospital._id,
    parent: districtHospital,
  });

  const supervisor = userFactory.build({
    username: 'supervisor_filter_tasks',
    place: districtHospital._id,
    contact: supervisorContact._id,
    roles: ['chw_supervisor'],
  });

  const patient1 = personFactory.build({
    name: 'Patient Filter 1',
    patient_id: 'patient_filter_1',
    parent: clinic1,
    reported_date: Date.now(),
  });

  // Patient 2: health center 1, clinic 1 - home_visit not overdue
  const patient2 = personFactory.build({
    name: 'Patient Filter 2',
    patient_id: 'patient_filter_2',
    parent: clinic1,
    reported_date: Date.now(),
  });

  // Patient 3: health center 1, clinic 1 - assessment overdue
  const patient3 = personFactory.build({
    name: 'Patient Filter 3',
    patient_id: 'patient_filter_3',
    parent: clinic1,
    reported_date: Date.now(),
  });

  // Patient 4: health center 1, clinic 1 - assessment not overdue
  const patient4 = personFactory.build({
    name: 'Patient Filter 4',
    patient_id: 'patient_filter_4',
    parent: clinic1,
    reported_date: Date.now(),
  });

  // Patient 5: health center 2, clinic 2 - follow_up overdue
  const patient5 = personFactory.build({
    name: 'Patient Filter 5',
    patient_id: 'patient_filter_5',
    parent: clinic2,
    reported_date: Date.now(),
  });

  before(async () => {
    await utils.saveDocs([
      ...places.values(),
      healthCenter2,
      clinic2,
      chwContact,
      supervisorContact,
      patient1,
      patient2,
      patient3,
      patient4,
      patient5,
    ]);
    await utils.updatePermissions(['chw'], ['can_have_multiple_places'], [], { ignoreReload: true });
    await utils.createUsers([chw, chw2, supervisor]);
    await tasksPage.compileTasks('tasks-filter-config.js', false);
    await sentinelUtils.waitForSentinel();
  });

  after(async () => {
    await utils.deleteUsers([chw, chw2, supervisor]);
  });

  describe('For chws who do not see area filter', () => {
    before(async () => {
      await loginPage.login(chw);
    });
    beforeEach(async () => {
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });
    after(async () => {
      await commonPage.reloadSession();
    });

    describe('Overdue filter', () => {
      it('should filter to show only overdue tasks', async () => {
        const allTasks = await tasksPage.getTasks();
        expect(allTasks.length).to.be.greaterThan(0);

        await tasksPage.openSidebarFilter();
        await tasksPage.filterByOverdue('Overdue');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should be overdue
        filteredInfos.forEach(info => {
          expect(info.overdue).to.be.true;
        });
      });

      it('should filter to show only not overdue tasks', async () => {
        const allTasks = await tasksPage.getTasks();
        const initialCount = allTasks.length;
        expect(initialCount).to.be.greaterThan(0);

        await tasksPage.openSidebarFilter();
        await tasksPage.filterByOverdue('Not overdue');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should not be overdue
        filteredInfos.forEach(info => {
          expect(info.overdue).to.be.false;
        });
      });

      it('should reset overdue filter', async () => {
        const allTasks = await tasksPage.getTasks();
        const initialCount = allTasks.length;

        await tasksPage.openSidebarFilter();
        await tasksPage.filterByOverdue('Overdue');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        expect(filteredTasks.length).to.be.lessThan(initialCount);

        await tasksPage.resetFilters();
        await commonPage.waitForPageLoaded();

        const resetTasks = await tasksPage.getTasks();
        expect(resetTasks.length).to.equal(initialCount);
      });
    });

    describe('Task type filter', () => {
      it('should filter by Home Visit task type', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByTaskType('Home Visit');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should be Home Visit type
        filteredInfos.forEach(info => {
          expect(info.formTitle).to.equal('Home Visit');
        });
      });

      it('should filter by Assessment task type', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByTaskType('Assessment');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should be Assessment type
        filteredInfos.forEach(info => {
          expect(info.formTitle).to.equal('Assessment');
        });
      });

      it('should filter by multiple task types', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByTaskType('Home Visit');
        await tasksPage.filterByTaskType('Assessment');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should be either Home Visit or Assessment
        filteredInfos.forEach(info => {
          expect(['Home Visit', 'Assessment']).to.include(info.formTitle);
        });
      });

      it('should reset task type filter', async () => {
        const allTasks = await tasksPage.getTasks();
        const initialCount = allTasks.length;

        await tasksPage.openSidebarFilter();
        await tasksPage.filterByTaskType('Home Visit');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        expect(filteredTasks.length).to.be.lessThan(initialCount);

        await tasksPage.resetFilters();
        await commonPage.waitForPageLoaded();

        const resetTasks = await tasksPage.getTasks();
        expect(resetTasks.length).to.equal(initialCount);
      });
    });

    describe('Area filter (CHW user)', () => {
      it('should not display area filter options for offline CHW user', async () => {
        await tasksPage.openSidebarFilter();
        expect(await tasksPage.sidebarFilterSelectors.areaAccordionHeader().isExisting()).to.equal(false);
      });
    });

    describe('Combined filters', () => {
      it('should filter by overdue AND task type', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByOverdue('Overdue');
        await tasksPage.filterByTaskType('Home Visit');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should be overdue AND Home Visit type
        filteredInfos.forEach(info => {
          expect(info.overdue).to.be.true;
          expect(info.formTitle).to.equal('Home Visit');
        });
      });

      it('should filter by not overdue AND task type', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByOverdue('Not overdue');
        await tasksPage.filterByTaskType('Assessment');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // All displayed tasks should be not overdue AND Assessment type
        filteredInfos.forEach(info => {
          expect(info.overdue).to.be.false;
          expect(info.formTitle).to.equal('Assessment');
        });
      });

      it('should clear all filters at once', async () => {
        const allTasks = await tasksPage.getTasks();
        const initialCount = allTasks.length;

        await tasksPage.openSidebarFilter();
        await tasksPage.filterByOverdue('Overdue');
        await tasksPage.filterByTaskType('Home Visit');
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        expect(filteredTasks.length).to.be.lessThan(initialCount);

        await tasksPage.resetFilters();
        await commonPage.waitForPageLoaded();

        const resetTasks = await tasksPage.getTasks();
        expect(resetTasks.length).to.equal(initialCount);
      });
    });
  });

  describe('For chws who do see area filter', () => {
    before(async () => {
      await loginPage.login(chw2);
    });

    beforeEach(async () => {
      await commonPage.goToTasks();
    });

    after(async () => {
      await commonPage.reloadSession();
    });

    describe('Area filter', () => {
      it('should display area filter', async () => {
        expect((await tasksPage.getTasks()).length).to.be.greaterThan(0);

        await tasksPage.openSidebarFilter();
        expect(await tasksPage.isAreaFilterDisplayed()).to.be.true;
      });

      it('should filter tasks by health center', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByArea(healthCenter2.name);
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // Should only show tasks for patients in Health Center 2
        filteredInfos.forEach(info => {
          expect(info.contactName).to.equal('Patient Filter 5');
        });
      });
    });
  });

  describe('For supervisors who do see area filter', () => {
    before(async () => {
      await loginPage.login(supervisor);
    });

    beforeEach(async () => {
      await commonPage.goToTasks();
    });

    describe('Area filter', () => {
      it('should display area filter', async () => {
        expect((await tasksPage.getTasks()).length).to.be.greaterThan(0);

        await tasksPage.openSidebarFilter();
        expect(await tasksPage.isAreaFilterDisplayed()).to.be.true;
      });

      it('should filter tasks by health center', async () => {
        await tasksPage.openSidebarFilter();
        await tasksPage.filterByArea(healthCenter2.name, districtHospital.name);
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

        // Should only show tasks for patients in Health Center 2
        filteredInfos.forEach(info => {
          expect(info.contactName).to.equal('Patient Filter 5');
        });
      });

      it('should reset area filter', async () => {
        const allTasks = await tasksPage.getTasks();
        const initialCount = allTasks.length;

        await tasksPage.openSidebarFilter();
        await tasksPage.filterByArea(healthCenter2.name, districtHospital.name);
        await commonPage.waitForPageLoaded();

        const filteredTasks = await tasksPage.getTasks();
        expect(filteredTasks.length).to.be.lessThan(initialCount);

        await tasksPage.resetFilters();
        await commonPage.waitForPageLoaded();

        const resetTasks = await tasksPage.getTasks();
        expect(resetTasks.length).to.equal(initialCount);
      });
    });
  });
});
