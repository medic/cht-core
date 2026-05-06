const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Tasks Free Text Search', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const clinic = places.get(CONTACT_TYPES.CLINIC);

  const chwContact = personFactory.build({
    name: 'CHW Search User',
    phone: '+12068881235',
    place: healthCenter._id,
    parent: healthCenter,
  });

  const chw = userFactory.build({
    username: 'offlineuser_search_tasks',
    isOffline: true,
    place: healthCenter._id,
    contact: chwContact._id,
  });

  const patient1 = personFactory.build({
    name: 'Margaret Williams',
    patient_id: 'patient_search_1',
    parent: clinic,
    reported_date: Date.now(),
  });

  const patient2 = personFactory.build({
    name: 'Rajesh Kumar',
    patient_id: 'patient_search_2',
    parent: clinic,
    reported_date: Date.now(),
  });

  before(async () => {
    await utils.saveDocs([
      ...places.values(),
      chwContact,
      patient1,
      patient2,
    ]);
    await utils.createUsers([chw]);
    await tasksPage.compileTasks('tasks-filter-config.js', false);
    await sentinelUtils.waitForSentinel();
    await loginPage.login(chw);
  });

  after(async () => {
    await utils.deleteUsers([chw]);
  });

  beforeEach(async () => {
    await commonPage.goToTasks();
    await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
  });

  it('should filter tasks by contact name', async () => {
    const allTasks = await tasksPage.getTasks();
    const totalCount = allTasks.length;
    expect(totalCount).to.be.greaterThan(0);

    await searchPage.performSearch('Margaret');

    const filteredTasks = await tasksPage.getTasks();
    const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);
    expect(filteredInfos.length).to.be.greaterThan(0);
    expect(filteredInfos.length).to.be.lessThan(totalCount);
    filteredInfos.forEach(info => {
      expect(info.contactName).to.equal('Margaret Williams');
    });

    await searchPage.clearSearch();
    await browser.waitUntil(async () => (await tasksPage.getTasks()).length === totalCount);
  });

  it('should filter tasks by task title', async () => {
    const allTasks = await tasksPage.getTasks();
    const totalCount = allTasks.length;

    await searchPage.performSearch('Assessment');

    const filteredTasks = await tasksPage.getTasks();
    const filteredInfos = await tasksPage.getTasksListInfos(filteredTasks);
    expect(filteredInfos.length).to.be.greaterThan(0);
    expect(filteredInfos.length).to.be.lessThan(totalCount);
    filteredInfos.forEach(info => {
      expect(info.formTitle).to.equal('Assessment');
    });

    await searchPage.clearSearch();
    await browser.waitUntil(async () => (await tasksPage.getTasks()).length === totalCount);
  });

  it('should show no tasks when search has no match', async () => {
    await searchPage.performSearch('xyznonexistent');

    const noTasksMessage = await tasksPage.isTaskElementDisplayed('p', 'No tasks found');
    expect(noTasksMessage).to.be.true;

    await searchPage.clearSearch();
    await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
  });

  it('should restore full task list when search is cleared', async () => {
    const allTasks = await tasksPage.getTasks();
    const totalCount = allTasks.length;

    await searchPage.performSearch('Rajesh');
    const filteredTasks = await tasksPage.getTasks();
    expect(filteredTasks.length).to.be.lessThan(totalCount);

    await searchPage.clearSearch();
    await browser.waitUntil(async () => (await tasksPage.getTasks()).length === totalCount);

    const restoredTasks = await tasksPage.getTasks();
    expect(restoredTasks.length).to.equal(totalCount);
  });

  it('should combine search with sidebar filters', async () => {
    const allTasks = await tasksPage.getTasks();
    const totalCount = allTasks.length;

    await searchPage.performSearch('Margaret');
    const searchFiltered = await tasksPage.getTasks();
    const searchCount = searchFiltered.length;

    await tasksPage.openSidebarFilter();
    await tasksPage.filterByTaskType('Home Visit');
    await commonPage.waitForPageLoaded();

    const combinedTasks = await tasksPage.getTasks();
    const combinedInfos = await tasksPage.getTasksListInfos(combinedTasks);

    expect(combinedInfos.length).to.be.greaterThan(0);
    expect(combinedInfos.length).to.be.at.most(searchCount);
    combinedInfos.forEach(info => {
      expect(info.contactName).to.equal('Margaret Williams');
      expect(info.formTitle).to.equal('Home Visit');
    });

    await tasksPage.resetFilters();
    await searchPage.clearSearch();
    await browser.waitUntil(async () => (await tasksPage.getTasks()).length === totalCount);
  });
});
