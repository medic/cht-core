const faker = require('faker');

const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const utils = require('../../utils');
const sentinelUtils = require('../sentinel/utils');

const centerName = faker.address.city();
const centerContact = faker.name.findName();
const area = faker.address.city();
const areaContact = faker.name.findName();
const household = faker.address.city();
const householdContact = faker.name.findName();

describe('Create new lineage structure', () => {
  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
    await commonPage.goToPeople();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  afterEach(async () => {
    // https://github.com/medic/cht-core/issues/7244
    // avoid race conditions by not starting next test until all changes were processed by Sentinel
    // todo remove this when/after fixing https://github.com/medic/cht-core/issues/7250
    await sentinelUtils.waitForSentinel();
  });

  it('Create new health center', async () => {
    await contactPage.addPlace('district_hospital', centerName, centerContact);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    expect(await contactPage.getPrimaryContactName()).toBe(centerContact);
  });

  it('Create new area', async () => {
    await contactPage.addPlace('health_center', area, areaContact);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    expect(await contactPage.getPrimaryContactName()).toBe(areaContact);
  });

  it('Create new household', async () => {
    await contactPage.addPlace('clinic', household, householdContact);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    expect(await contactPage.getPrimaryContactName()).toBe(householdContact);
  });

  it('Create new person', async () => {
    expect(await contactPage.addPerson('James')).toBe('James');
  });
});
