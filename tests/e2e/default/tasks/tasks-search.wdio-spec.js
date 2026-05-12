const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Tasks Free Text Search', () => {

  const places = placeFactory.generateHierarchy();
  const clinic = places.get(CONTACT_TYPES.CLINIC);
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const chwContact = personFactory.build({
    name: 'Megan Spice',
    phone: '+12068881234',
    place: healthCenter._id,
    parent: healthCenter,
  });

  const chw = userFactory.build({
    username: 'offlineuser_tasks_search',
    isOffline: true,
    place: healthCenter._id,
    contact: chwContact._id,
  });

  const patientWithAccents = personFactory.build({
    name: 'Élodie Patient',
    patient_id: 'patient_elodie',
    parent: clinic,
    reported_date: Date.now(),
  });

  const patientPlain = personFactory.build({
    name: 'Bob Patient',
    patient_id: 'patient_bob',
    parent: clinic,
    reported_date: Date.now(),
  });

  before(async () => {
    await utils.saveDocs([
      ...places.values(),
      chwContact,
      patientWithAccents,
      patientPlain,
    ]);
    await utils.createUsers([ chw ]);
    await sentinelUtils.waitForSentinel();

    // Compile task configuration via API before login.
    // Avoid `sync: true` here because that requires interacting with the UI hamburger menu.
    await tasksPage.compileTasks('tasks-breadcrumbs-config.js', false);
    await loginPage.login(chw);
    await commonPage.tabsSelector.analyticsTab().waitForDisplayed();
    await commonPage.sync();
  });

  after(async () => {
    await utils.deleteUsers([ chw ]);
    await utils.revertDb([/^form:/], true);
    await utils.revertSettings(true);
  });

  it('filters tasks by contact name (diacritics-insensitive) and clears search', async () => {
    await commonPage.goToTasks();

    const initialCount = await tasksPage.getTaskListCount();
    expect(initialCount).to.be.greaterThan(0);

    await searchPage.performSearch('elodie');
    await browser.waitUntil(async () => (await tasksPage.getTaskListCount()) !== initialCount, {
      timeout: 10000,
      timeoutMsg: 'Expected task list to be filtered after search'
    });

    const filteredInfos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());
    expect(filteredInfos.length).to.be.greaterThan(0);
    filteredInfos.forEach(info => expect(info.contactName).to.equal(patientWithAccents.name));

    await searchPage.clearSearch();
    await browser.waitUntil(async () => (await tasksPage.getTaskListCount()) === initialCount, {
      timeout: 10000,
      timeoutMsg: 'Expected task list to be restored after clearing search'
    });
  });

  it('filters tasks by task title substring', async () => {
    await commonPage.goToTasks();
    await searchPage.performSearch('person_create');

    const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());
    expect(infos.length).to.be.greaterThan(0);
    infos.forEach(info => expect(info.formTitle).to.contain('person_create'));

    await searchPage.clearSearch();
  });
});

