const loginPage = require('../../../page-objects/login/login.wdio.page');
const commonPage = require('../../../page-objects/common/common.wdio.page');
const utils = require('../../../utils');
const personFactory = require('../../../factories/cht/contacts/person');
const place = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const places = place.generateHierarchy();
const healthCenter = places.find((place) => place.type === 'health_center');
const clinic = places.find((place) => place.type === 'clinic');
const analyticsPage = require('../../../page-objects/analytics/analytics.wdio.page');
healthCenter.name = 'HC_' + Date.now();

const contact = personFactory.build(
  {
    name: 'contact_' + Date.now(),
    parent: {
      _id: clinic._id,
      parent: clinic.parent
    },
    phone: '+254712345670'
  });

const supervisor = userFactory.build(
  {
    username: 'supervisor' + Date.now(),
    place: clinic._id,
    contact: contact,
    roles: ['chw_supervisor']
  });



describe('Aggregates', () => {
  before(async () => {
    await utils.deleteAllDocs();
    const settings = await utils.getSettings();
    const targets = settings.tasks.targets.items;

    const counts = ['active-pregnancies', 'pregnancy-registrations-this-month', 'births-this-month'];
    const percents = ['facility-deliveries'];
    for (const item of counts) {
      targets.find(target => target.id === item).aggregate = true;
      targets.find(target => target.id === item).type = 'count';
      targets.find(target => target.id === item).goal = 4;
    }
    for (const item of percents) {
      targets.find(target => target.id === item).type = 'percent';
      targets.find(target => target.id === item).goal = 100;
      targets.find(target => target.id === item).aggregate = true;
    }
    await utils.updateSettings(settings, true, true);
    await utils.saveDocs([clinic]);
    await utils.createUsers([supervisor]);
    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('Supervisor Can view aggregates link', async () => {
    await commonPage.goToTab('analytics');
    expect(await (await analyticsPage.analytics())[1].getText()).toBe('Target aggregates');
  });
  it('Supervisor Can view targets', async () => {
    await (await analyticsPage.analytics())[1].click();
  });
});
