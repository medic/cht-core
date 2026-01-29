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

  // Create a second health center for area filter testing
  const healthCenter2 = placeFactory.place().build({
    name: 'Health Center 2',
    type: 'health_center',
    parent: { _id: districtHospital._id },
  });

  const clinic2 = placeFactory.place().build({
    name: 'Clinic 2',
    type: 'clinic',
    parent: { _id: healthCenter2._id },
  });

  // CHW user (offline) - cannot use area filter
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

  // CHW Supervisor user (online) - can use area filter
  const supervisorContact = personFactory.build({
    name: 'Supervisor User',
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

  // Patients for different task scenarios
  // Patient 1: health center 1, clinic 1 - home_visit overdue
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

  // Patient 5: health center 2, clinic 2 - follow_up overdue (different area)
  const patient5 = personFactory.build({
    name: 'Patient Filter 5',
    patient_id: 'patient_filter_5',
    parent: clinic2,
    reported_date: Date.now(),
  });

  const sidebarFilterSelectors = {
    openBtn: () => $('mm-search-bar .open-filter'),
    resetBtn: () => $('.sidebar-reset'),
    overdueAccordionHeader: () => $('#overdue-filter-accordion mat-expansion-panel-header'),
    overdueAccordionBody: () => $('#overdue-filter-accordion mat-panel-description'),
    taskTypeAccordionHeader: () => $('#task-type-filter-accordion mat-expansion-panel-header'),
    taskTypeAccordionBody: () => $('#task-type-filter-accordion mat-panel-description'),
    areaAccordionHeader: () => $('#place-filter-accordion mat-expansion-panel-header'),
    areaAccordionBody: () => $('#place-filter-accordion mat-panel-description'),
  };

  const openSidebarFilter = async () => {
    if (!await sidebarFilterSelectors.resetBtn().isDisplayed()) {
      await sidebarFilterSelectors.openBtn().click();
    }
    return await sidebarFilterSelectors.resetBtn().waitForDisplayed();
  };

  const filterByOverdue = async (overdueOption) => {
    await sidebarFilterSelectors.overdueAccordionHeader().click();
    await sidebarFilterSelectors.overdueAccordionBody().waitForDisplayed();
    const option = sidebarFilterSelectors.overdueAccordionBody().$(`a*=${overdueOption}`);
    await option.waitForDisplayed();
    await option.click();
  };

  const filterByTaskType = async (taskType) => {
    await sidebarFilterSelectors.taskTypeAccordionHeader().click();
    await sidebarFilterSelectors.taskTypeAccordionBody().waitForDisplayed();
    const option = sidebarFilterSelectors.taskTypeAccordionBody().$(`a*=${taskType}`);
    await option.waitForDisplayed();
    await option.click();
  };

  const filterByArea = async (parentFacility, facility) => {
    await sidebarFilterSelectors.areaAccordionHeader().click();
    await sidebarFilterSelectors.areaAccordionBody().waitForDisplayed();

    const parent = sidebarFilterSelectors.areaAccordionBody().$(`a*=${parentFacility}`);
    await parent.waitForDisplayed();
    await parent.click();

    const facilityOption = sidebarFilterSelectors
      .areaAccordionBody()
      .$('.mm-dropdown-submenu')
      .$(`a*=${facility}`);
    await facilityOption.waitForDisplayed();
    const checkbox = facilityOption.previousElement();
    await checkbox.click();
  };

  const resetFilters = async () => {
    await sidebarFilterSelectors.resetBtn().click();
    await commonPage.waitForPageLoaded();
  };

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
    await utils.createUsers([chw, supervisor]);
    await sentinelUtils.waitForSentinel();
  });

  afterEach(async () => {
    await commonPage.logout();
  });

  after(async () => {
    await utils.deleteUsers([chw, supervisor]);
  });

  describe('Overdue filter', () => {
    beforeEach(async () => {
      await loginPage.login(chw);
      await tasksPage.compileTasks('tasks-filter-config.js', true);
      await commonPage.goToTasks();
    });

    it('should filter to show only overdue tasks', async () => {
      const allTasks = await tasksPage.getTasks();
      const initialCount = allTasks.length;
      expect(initialCount).to.be.greaterThan(0);

      await openSidebarFilter();
      await filterByOverdue('Overdue');
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

      await openSidebarFilter();
      await filterByOverdue('Not overdue');
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

      await openSidebarFilter();
      await filterByOverdue('Overdue');
      await commonPage.waitForPageLoaded();

      const filteredTasks = await tasksPage.getTasks();
      expect(filteredTasks.length).to.be.lessThan(initialCount);

      await resetFilters();

      const resetTasks = await tasksPage.getTasks();
      expect(resetTasks.length).to.equal(initialCount);
    });
  });

  describe('Task type filter', () => {
    beforeEach(async () => {
      await loginPage.login(chw);
      await tasksPage.compileTasks('tasks-filter-config.js', true);
      await commonPage.goToTasks();
    });

    it('should filter by Home Visit task type', async () => {
      await openSidebarFilter();
      await filterByTaskType('Home Visit');
      await commonPage.waitForPageLoaded();

      const filteredTasks = await tasksPage.getTasks();
      const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

      // All displayed tasks should be Home Visit type
      filteredInfos.forEach(info => {
        expect(info.formTitle).to.equal('Home Visit');
      });
    });

    it('should filter by Assessment task type', async () => {
      await openSidebarFilter();
      await filterByTaskType('Assessment');
      await commonPage.waitForPageLoaded();

      const filteredTasks = await tasksPage.getTasks();
      const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);

      // All displayed tasks should be Assessment type
      filteredInfos.forEach(info => {
        expect(info.formTitle).to.equal('Assessment');
      });
    });

    it('should filter by multiple task types', async () => {
      await openSidebarFilter();
      await filterByTaskType('Home Visit');
      await filterByTaskType('Assessment');
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

      await openSidebarFilter();
      await filterByTaskType('Home Visit');
      await commonPage.waitForPageLoaded();

      const filteredTasks = await tasksPage.getTasks();
      expect(filteredTasks.length).to.be.lessThan(initialCount);

      await resetFilters();

      const resetTasks = await tasksPage.getTasks();
      expect(resetTasks.length).to.equal(initialCount);
    });
  });

  describe('Area filter (chw_supervisor only)', () => {
    beforeEach(async () => {
      await loginPage.login(supervisor);
      await tasksPage.compileTasks('tasks-filter-config.js', true);
      await commonPage.goToTasks();
    });

    it('should display area filter for chw_supervisor role', async () => {
      await openSidebarFilter();
      const areaHeader = sidebarFilterSelectors.areaAccordionHeader();
      expect(await areaHeader.isDisplayed()).to.be.true;
    });

    it('should filter tasks by health center', async () => {
      const allTasks = await tasksPage.getTasks();
      const initialCount = allTasks.length;
      expect(initialCount).to.be.greaterThan(0);

      await openSidebarFilter();
      await filterByArea(districtHospital.name, healthCenter2.name);
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

      await openSidebarFilter();
      await filterByArea(districtHospital.name, healthCenter2.name);
      await commonPage.waitForPageLoaded();

      const filteredTasks = await tasksPage.getTasks();
      expect(filteredTasks.length).to.be.lessThan(initialCount);

      await resetFilters();

      const resetTasks = await tasksPage.getTasks();
      expect(resetTasks.length).to.equal(initialCount);
    });
  });

  describe('Area filter (CHW user)', () => {
    beforeEach(async () => {
      await loginPage.login(chw);
      await tasksPage.compileTasks('tasks-filter-config.js', true);
      await commonPage.goToTasks();
    });

    it('should not display area filter options for offline CHW user', async () => {
      await openSidebarFilter();
      const areaHeader = sidebarFilterSelectors.areaAccordionHeader();

      // Area filter should either be hidden or show "No options available"
      // depending on implementation
      if (await areaHeader.isExisting()) {
        await areaHeader.click();
        const body = sidebarFilterSelectors.areaAccordionBody();
        await body.waitForDisplayed();
        const noOptionsMessage = body.$('*=No options');
        expect(await noOptionsMessage.isDisplayed()).to.be.true;
      }
    });
  });

  describe('Combined filters', () => {
    beforeEach(async () => {
      await loginPage.login(chw);
      await tasksPage.compileTasks('tasks-filter-config.js', true);
      await commonPage.goToTasks();
    });

    it('should filter by overdue AND task type', async () => {
      await openSidebarFilter();
      await filterByOverdue('Overdue');
      await filterByTaskType('Home Visit');
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
      await openSidebarFilter();
      await filterByOverdue('Not overdue');
      await filterByTaskType('Assessment');
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

      await openSidebarFilter();
      await filterByOverdue('Overdue');
      await filterByTaskType('Home Visit');
      await commonPage.waitForPageLoaded();

      const filteredTasks = await tasksPage.getTasks();
      expect(filteredTasks.length).to.be.lessThan(initialCount);

      await resetFilters();

      const resetTasks = await tasksPage.getTasks();
      expect(resetTasks.length).to.equal(initialCount);
    });
  });
});
