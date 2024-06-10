const { v4: uuid } = require('uuid');
const path = require('path');

const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const chtConfUtils = require('@utils/cht-conf');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonElements = require('@page-objects/default/common/common.wdio.page');

describe('Tasks tab breadcrumbs', () => {

  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter1 = places.get('health_center');
  const districtHospital = places.get('district_hospital');
  const healthCenter2 = placeFactory.place().build({
    name: 'health_center_2',
    type: 'health_center',
    parent: { _id: districtHospital._id },
  });
  const chwContact = {
    _id: 'fixture:user:user1',
    name: 'chw',
    phone: '+12068881234',
    type: 'person',
    place: healthCenter1._id,
    parent: {
      _id: healthCenter1._id,
      parent: healthCenter1.parent
    },
  };
  const supervisorContact = {
    _id: 'fixture:user:user2',
    name: 'supervisor',
    phone: '+12068881235',
    type: 'person',
    place: districtHospital._id,
    parent: {
      _id: districtHospital._id,
    },
  };
  const chw = userFactory.build({
    username: 'offlineuser_tasks',
    isOffline: true,
    place: healthCenter1._id,
    contact: chwContact._id,
  });
  const supervisor = userFactory.build({
    username: 'supervisor_tasks',
    roles: [ 'chw_supervisor' ],
    place: districtHospital._id,
    contact: supervisorContact._id,
  });
  const patient = personFactory.build({
    _id: 'patient1',
    name: 'patient1',
    type: 'person',
    patient_id: 'patient1',
    parent: { _id: clinic._id, parent: { _id: healthCenter1._id, parent: { _id: districtHospital._id }}},
    reported_date: new Date().getTime(),
  });
  const patient2 = personFactory.build({
    _id: 'patient2',
    name: 'patient2',
    type: 'person',
    patient_id: 'patient2',
    parent: { _id: healthCenter1._id, parent: { _id: districtHospital._id }},
    reported_date: new Date().getTime(),
  });
  const contactWithManyPlaces = personFactory.build({
    parent: { _id: healthCenter1._id, parent: { _id: districtHospital._id } },
  });
  const userWithManyPlaces = {
    _id: 'org.couchdb.user:offline_many_facilities',
    language: 'en',
    known: true,
    type: 'user-settings',
    roles: [ 'chw' ],
    facility_id: [ healthCenter1._id, healthCenter2._id ],
    contact_id: contactWithManyPlaces._id,
    name: 'offline_many_facilities'
  };
  const userWithManyPlacesPass = uuid();

  before(async () => {
    await utils.saveDocs([
      ...places.values(), healthCenter2, chwContact, supervisorContact, patient, patient2,
      contactWithManyPlaces, userWithManyPlaces,
    ]);
    await utils.request({
      path: `/_users/${userWithManyPlaces._id}`,
      method: 'PUT',
      body: { ...userWithManyPlaces, password: userWithManyPlacesPass, type: 'user' },
    });
    await utils.createUsers([ chw, supervisor ]);
    await sentinelUtils.waitForSentinel();

    await chtConfUtils.initializeConfigDir();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    const tasksFilePath = path.join(__dirname, 'config/tasks-breadcrumbs-config.js');
    const { tasks } = await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
    await utils.updateSettings({ tasks }, 'api');
  });

  describe('for chw', () => {
    afterEach(async () => await commonElements.logout());

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should not remove facility from breadcrumbs when offline user has many facilities associated', async () => {
      await loginPage.login({ password: userWithManyPlacesPass, username: userWithManyPlaces.name });
      await commonPage.waitForPageLoaded();
      await tasksPage.goToTasksTab();
      const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());

      expect(infos).to.have.deep.members([
        {
          contactName: 'Mary Smith',
          formTitle: 'person_create',
          lineage: healthCenter1.name,
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient1',
          formTitle: 'person_create',
          lineage: clinic.name + healthCenter1.name,
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient2',
          formTitle: 'person_create',
          lineage: healthCenter1.name,
          dueDateText: 'Due today',
          overdue: true
        },
      ]);
    });

    it('should display correct tasks with breadcrumbs for chw', async () => {
      await loginPage.login(chw);
      await commonPage.waitForPageLoaded();
      await tasksPage.goToTasksTab();
      const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());

      expect(infos).to.have.deep.members([
        {
          contactName: 'Mary Smith',
          formTitle: 'person_create',
          lineage: '',
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient1',
          formTitle: 'person_create',
          lineage: clinic.name,
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient2',
          formTitle: 'person_create',
          lineage: '',
          dueDateText: 'Due today',
          overdue: true
        },
      ]);
    });

    it('should open task with expression', async () => {
      await loginPage.login(chw);
      await commonPage.waitForPageLoaded();
      await tasksPage.goToTasksTab();
      const task = await tasksPage.getTaskByContactAndForm('patient1', 'person_create');
      await task.click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
    });
  });

  describe('for supervisor', () => {
    before(async () => {
      await loginPage.login(supervisor);
    });

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should display correct tasks with breadcrumbs for supervisor', async () => {
      await tasksPage.goToTasksTab();
      const infos = await tasksPage.getTasksListInfos(await tasksPage.getTasks());

      expect(infos).to.have.deep.members([
        {
          contactName: 'Mary Smith',
          formTitle: 'person_create',
          lineage: healthCenter1.name,
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient1',
          formTitle: 'person_create',
          lineage: clinic.name + healthCenter1.name,
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient2',
          formTitle: 'person_create',
          lineage: healthCenter1.name,
          dueDateText: 'Due today',
          overdue: true
        },
      ]);
    });
  });
});


