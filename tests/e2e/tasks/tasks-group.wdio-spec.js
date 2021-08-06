const path = require('path');
const chai = require('chai');

const utils = require('../../utils');
const sentinelUtils = require('../sentinel/utils');
const tasksPage = require('../../page-objects/tasks/tasks.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const chtConfUtils = require('../../cht-conf-utils');

const places = [
  {
    _id: 'fixture:district',
    type: 'district_hospital',
    name: 'District',
    place_id: 'district',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:center',
    type: 'health_center',
    name: 'Health Center',
    parent: { _id: 'fixture:district' },
    place_id: 'health_center',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:politicians',
    type: 'clinic',
    name: 'Politicians',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'politicians',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:artists',
    type: 'clinic',
    name: 'Artists',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'artists',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:scientists',
    type: 'clinic',
    name: 'Scientists',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'scientists',
    reported_date: new Date().getTime(),
  },
];

const people = [
  {
    _id: 'fixture:einstein',
    name: 'Albert Einstenin',
    type: 'person',
    patient_id: 'einstein',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:darwin',
    name: 'Charles Darwin',
    type: 'person',
    patient_id: 'darwin',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:tesla',
    name: 'Nikola Tesla',
    type: 'person',
    patient_id: 'tesla',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:leonardo',
    name: 'Leonardo da Vinci',
    type: 'person',
    patient_id: 'leonardo',
    parent: { _id: 'fixture:artists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:goya',
    name: 'Francisco Goya',
    type: 'person',
    patient_id: 'goya',
    parent: { _id: 'fixture:artists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:mozart',
    name: 'Wolfgang Amadeus Mozart',
    type: 'person',
    patient_id: 'mozart',
    parent: { _id: 'fixture:artists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:napoleon',
    name: 'Napoleon Bonaparte',
    type: 'person',
    patient_id: 'napoleon',
    parent: { _id: 'fixture:politicians', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:caesar',
    name: 'Julius Caesar',
    type: 'person',
    patient_id: 'caesar',
    parent: { _id: 'fixture:politicians', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:victoria',
    name: 'Queen Victoria',
    type: 'person',
    patient_id: 'victoria',
    parent: { _id: 'fixture:politicians', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' }}},
    reported_date: new Date().getTime(),
  },
];

const user = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

describe('Tasks group landing page', () => {
  before(async () => {
    await utils.saveDocs([...places, ...people]);
    await utils.createUsers([user]);
    await sentinelUtils.waitForSentinel();

    await chtConfUtils.initializeConfigDir();

    const formsPath = path.join(__dirname, 'tasks-group-config', 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);

    const tasksFilePath = path.join(__dirname, 'tasks-group-config', 'tasks.js');
    const compiledTasks = await chtConfUtils.compileNoolsConfig(tasksFilePath);
    await utils.updateSettings({ tasks: compiledTasks }, 'api');

    await loginPage.login(user.username, user.password);
    await commonPage.closeTour();
    expect(await commonPage.analyticsTab()).toBeDisplayed();
  });

  it('should have tasks', async () => {
    await tasksPage.goToTasksTab();
    //const list = await tasksPage.getTasks();
    //console.log(list);
    //chai.expect(list.value.length).to.equal(people.length + 3);

    await browser.pause(100);
  });

  after(async () => {
    await utils.deleteUsers([user]);
    await utils.revertDb([], true);
  });
});
