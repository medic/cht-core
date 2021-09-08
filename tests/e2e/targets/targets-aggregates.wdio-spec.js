const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const utils = require('../../utils');
const personFactory = require('../../factories/cht/contacts/person');
const place = require('../../factories/cht/contacts/place');
const userFactory = require('../../factories/cht/users/users');
const places = place.generateHierarchy();
const healthCenter = places.find((place) => place.type === 'health_center');
const clinic = places.find((place) => place.type === 'clinic');
const analyticsPage = require('../../page-objects/analytics/analytics.wdio.page.js');

healthCenter.name = 'HC_' + Date.now();

const contact = personFactory.build({
  name: 'contact_' + Date.now(),
  parent: {
    _id: clinic._id,
    parent: clinic.parent
  },
  phone: '+254712345670'
});

const supervisor = userFactory.build({
  username: 'supervisor_' + Date.now(),
  place: clinic._id,
  contact: contact,
  knwn:true,
  language:'en',
  roles: ['chw_supervisor']
});

describe('Aggregates', () => {

  before(async () => {
    const settings = await utils.getSettings();
    const permissions = settings.permissions;
    for(const permission of Object.values(permissions)){
      if(!permission.includes('chw_supervisor')){
        permission.push('chw_supervisor');
      }
    }
    const tasks = settings.tasks;

    const counts = ['active-pregnancies', 'pregnancy-registrations-this-month', 'births-this-month'];
    const percents = ['facility-deliveries'];
    for (const item of counts) {
      tasks.targets.items.find(target => target.id === item).aggregate = true;
      tasks.targets.items.find(target => target.id === item).type = 'count';
      tasks.targets.items.find(target => target.id === item).goal = 4;
    }
    for (const item of percents) {
      tasks.targets.items.find(target => target.id === item).type = 'percent';
      tasks.targets.items.find(target => target.id === item).goal = 100;
      tasks.targets.items.find(target => target.id === item).aggregate = true;
    }
    await utils.updateSettings({ tasks, permissions }, true);
    await utils.saveDocs([clinic]);
    await utils.createUsers([supervisor]);
    await loginPage.cookieLogin(supervisor.username, supervisor.password, false);
  });

  after(async () => {
    await utils.deleteAllDocs();
    await utils.revertDb([], true);
  });

  it('Supervisor Can view aggregates link', async () => {
    await commonPage.closeTour();
    await (await commonPage.analyticsTab()).click();
    expect(await (await analyticsPage.analytics())[1].getText()).toBe('Target aggregates');
  });

  it('Supervisor Can view aggregate List', async () => {
    await (await analyticsPage.analytics())[1].click();
    const aggregates = await analyticsPage.getAllAggregates();
    expect(aggregates).toEqual(['New pregnancies', 'Live births', 'Active pregnancies', 'In-facility deliveries']);
  });

  it('Supervisor Can view aggregate Details', async () => {
    await (await analyticsPage.targetAggregatesItems())[0].click();
    expect(await (await analyticsPage.aggregateHeading()).getText()).toBe('New pregnancies');
    expect(await (await analyticsPage.aggregateLabel()).getText()).toBe('CHWs meeting goal');
    expect(await (await analyticsPage.aggregateSummary()).getText()).toBe('0 of 0');
  });
});
