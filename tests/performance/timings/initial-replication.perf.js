const commonPage = require('../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../page-objects/default/login/login.wdio.page');
const performancetotal = require('wdio-performancetotal-service').performancetotal;
const constants = require('../../constants');
const utils = require('../../utils');
const TABTIME = 1000; //1 seconds - to change once we have seeded data

const loadTab  = async (entities, time = TABTIME) => {
  performancetotal.sampleStart(entities);
  await browser.url(`/#/${entities}`);
  performancetotal.sampleEnd(entities);
  console.log('time to load ' + entities + ': ', performancetotal.getSampleTime(entities));
  expect(performancetotal.getSampleTime(entities)).to.be.at.most(time);
};

const docs = []; // to specify docs to load
describe('Navigation tests', async () => {
  before(async () => {
    await utils.seedTestData(constants.USER_CONTACT_ID, docs); //could use any other method - see sclability suite
  });

  it(`login within ${TABTIME} seconds`, async () => {
    performancetotal.sampleStart('login');
    await loginPage.cookieLogin();
    expect(performancetotal.getSampleTime('login')).to.be.at.most(1 * 60 * 1000);
  });

  it(`should load Messages within ${TABTIME} seconds`, async () => {
    await loadTab('messages');
    expect(await commonPage.isMessagesListPresent());
  });

  it(`should open tasks tab within ${TABTIME} seconds`, async () => {
    await loadTab('tasks');
    expect(await commonPage.isTasksListPresent());
  });

  it(`should load Reports ${TABTIME} seconds`, async () => {
    await loadTab('reports');
    expect(await commonPage.isReportsListPresent());
  });

  it(`should load Contacts or Peoples within ${TABTIME} seconds`, async () => {
    await loadTab('contacts');
    expect(await commonPage.isPeopleListPresent());
  });

  it(`should load Analytics within ${TABTIME} seconds`, async () => {
    await loadTab('analytics');
    expect(await commonPage.isTargetMenuItemPresent());
    expect(await commonPage.isTargetAggregatesMenuItemPresent());
  });
});
