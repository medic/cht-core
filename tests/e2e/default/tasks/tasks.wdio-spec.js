const path = require('path');
const chtConfUtils = require('@utils/cht-conf');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const chtDbUtils = require('@utils/cht-db');

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
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter = places.get('health_center');

  const contact = {
    _id: 'fixture:user:user1',
    name: 'CHW',
    phone: '+12068881234',
    type: 'person',
    place: healthCenter._id,
    parent: {
      _id: healthCenter._id,
      parent: healthCenter.parent
    },
  };
  const chw = userFactory.build({
    isOffline: true,
    place: healthCenter._id,
    contact: contact._id,
  });
  const owl = personFactory.build({
    name: 'Owl',
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, owl ]);
    await utils.createUsers([ chw ]);
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
    await commonPage.goToTasks();

    const { errorMessage, url, username, errorStack } = await tasksPage.getErrorLog();

    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching tasks');
    expect(await (await errorStack.isDisplayed())).to.be.true;
    expect(await (await errorStack.getText())).to
      .include('TypeError: Cannot read properties of undefined (reading \'name\')');

    const feedbackDocs = await chtDbUtils.feedBackDocs();
    expect(feedbackDocs.length).to.equal(1);
    await chtDbUtils.clearFeedbackDocs();
  });
});
