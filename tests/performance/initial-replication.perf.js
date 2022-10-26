const commonPage = require('../page-objects/default/common/common.wdio.page');
const loginPage = require('../page-objects/default/login/login.wdio.page');
const performancetotal = require('wdio-performancetotal-service').performancetotal;
const constants = require('../constants');
const utils = require('../utils');
const TABTIME = 2 * 1000; //2 seconds - to change once we have seeded data

const loadTab  = async (entities, time = TABTIME) => {
  performancetotal.sampleStart(entities);
  //   const tab = await $(`#${entities}-tab.${entities}-tab`);
  //   await tab.click();
  await browser.url(`/#/${entities}`);
  performancetotal.sampleEnd(entities);
  expect(performancetotal.getSampleTime(entities)).to.be.at.most(time);
};

const docs = []; // to specify docs to load
describe('Navigation tests', async () => {
  before(async () => {
    await utils.seedTestData(constants.USER_CONTACT_ID, docs); //could use any other method - see sclability suite
  });

  it('login within 1 minute', async () => {
    performancetotal.sampleStart('login');
    await loginPage.cookieLogin();
    expect(performancetotal.getSampleTime('login')).to.be.at.most(1 * 60 * 1000);
  });

  it('should load Messages within 2 seconds', async () => {
    await loadTab('messages');
    expect(await commonPage.isMessagesListPresent());
  });

  it('should open tasks tab', async () => {
    await loadTab('tasks');
    expect(await commonPage.isTasksListPresent());
  });

  it('should open Reports or History tab', async () => {
    await loadTab('reports');
    expect(await commonPage.isReportsListPresent());
  });

  it('should open Contacts or Peoples tab', async () => {
    await loadTab('contacts');
    expect(await commonPage.isPeopleListPresent());
  });

  it('should open Analytics tab', async () => {
    await loadTab('analytics');
    expect(await commonPage.isTargetMenuItemPresent());
    expect(await commonPage.isTargetAggregatesMenuItemPresent());
  });
});
