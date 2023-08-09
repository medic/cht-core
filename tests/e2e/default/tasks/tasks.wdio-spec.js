const path = require('path');
const chtConfUtils = require('@utils/cht-conf');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const { expect } = require('chai');

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
];

const clinics = [
  {
    _id: 'fixture:scientists',
    type: 'clinic',
    name: 'Scientists',
    parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } },
    place_id: 'scientists',
    reported_date: new Date().getTime(),
  }
];

const people = [
  {
    _id: 'fixture:einstein',
    name: 'Albert Einstenin',
    type: 'person',
    patient_id: 'einstein',
    parent: { _id: 'fixture:scientists', parent: { _id: 'fixture:center', parent: { _id: 'fixture:district' } } },
    reported_date: new Date().getTime(),
  }
];

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
  known: true,
};

const updateSettings = async (settings) => {
  await utils.updateSettings(settings, 'api');
  await browser.refresh();
};

const compileTasks = async (tasksFileName) => {
  await chtConfUtils.initializeConfigDir();
  const tasksFilePath = path.join(__dirname, `config/${tasksFileName}`);
  return await chtConfUtils.compileNoolsConfig({ tasks: tasksFilePath });
};

describe('Task list', () => {
  before(async () => {
    await utils.saveDocs([...places, ...clinics, ...people]);
    await utils.createUsers([chw]);
    await loginPage.login(chw);
  });

  after(async () => {
    await browser.deleteCookies();
    await browser.refresh();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('Should show error message for bad config', async () => {
    const settings = await compileTasks('tasks-error-config.js');
    await updateSettings(settings);
    await browser.url('/#/tasks');

    const { errorMessage, url, username, errorStack } = await tasksPage.getErrorLog();

    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching tasks');
    expect(await (await errorStack.isDisplayed())).to.be.true;
    expect(await (await errorStack.getText())).to
      .include('TypeError: Cannot read properties of undefined (reading \'name\')');
  });
});
