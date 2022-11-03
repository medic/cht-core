// const moment = require('moment');

const utils = require('../../../utils');
// const commonElements = require('../../../page-objects/default/common/common.wdio.page');
// const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const tasksPage = require('../../../page-objects/default/tasks/tasks.wdio.page');
const chtConfUtils = require('../../../cht-conf-utils');
const path = require('path');
const sentinelUtils = require('../../../utils/sentinel');

const places = placeFactory.generateHierarchy();
const clinic = places.find(p => p.type === 'clinic');
const health_center = places.find(p => p.type === 'health_center');
const district_hospital = places.find(p => p.type === 'district_hospital');
const contact = {
  _id: 'fixture:user:user1',
  name: 'chw',
  phone: '+12068881234',
  type: 'person',
  place: health_center._id,
  parent: {
    _id: health_center._id,
    parent: health_center.parent
  },
};
const contact2 = {
  _id: 'fixture:user:user2',
  name: 'supervisor',
  phone: '+12068881235',
  type: 'person',
  place: district_hospital._id,
  parent: {
    _id: district_hospital._id,
  },
};
const chw = userFactory.build({
  username: 'offlineuser',
  isOffline: true,
  place: health_center._id,
  contact: contact._id,
});
const supervisor = userFactory.build({
  username: 'supervisor',
  roles: [ 'chw_supervisor' ],
  place: district_hospital._id,
  contact: contact2._id,
});
const patient = personFactory.build({
  _id: 'patient1',
  name: 'patient1',
  type: 'person',
  patient_id: 'patient1',
  parent: { _id: clinic._id, parent: { _id: health_center._id, parent: { _id: district_hospital._id }}},
  reported_date: new Date().getTime(),
});
const patient2 = personFactory.build({
  _id: 'patient2',
  name: 'patient2',
  type: 'person',
  patient_id: 'patient2',
  parent: { _id: health_center._id, parent: { _id: district_hospital._id }},
  reported_date: new Date().getTime(),
});

const getTasksInfos = async (tasks) => {
  const infos = [];
  for (const task of tasks) {
    infos.push(await tasksPage.getTaskInfo(task));
  }
  return infos;
};

describe('Tasks tab breadcrumbs', () => {
  before(async () => {
    await utils.saveDocs([ ...places, contact, contact2, patient, patient2 ]);
    await utils.createUsers([ chw, supervisor ]);
    await sentinelUtils.waitForSentinel();

    await chtConfUtils.initializeConfigDir();

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    const tasksFilePath = path.join(__dirname, 'tasks-breadcrumbs-config.js');
    const { tasks } = await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
    await utils.updateSettings({ tasks }, 'api');
  });

  describe('for chw', () => {
    before(async () => {
      await loginPage.login(chw);
    });

    after(async () => {
      await browser.deleteCookies();
      await browser.refresh();
    });

    it('should display correct tasks with breadcrumbs for chw', async () => {
      await tasksPage.goToTasksTab();
      const infos = await getTasksInfos(await tasksPage.getTasks());

      expect(infos).to.have.deep.members([
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
      const infos = await getTasksInfos(await tasksPage.getTasks());

      expect(infos).to.have.deep.members([
        {
          contactName: 'patient1',
          formTitle: 'person_create',
          lineage: clinic.name+health_center.name,
          dueDateText: 'Due today',
          overdue: true
        },
        {
          contactName: 'patient2',
          formTitle: 'person_create',
          lineage: health_center.name,
          dueDateText: 'Due today',
          overdue: true
        },
      ]);
    });
  });
});


