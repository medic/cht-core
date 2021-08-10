const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const utils = require('../../utils');
const faker = require('faker');

const centerName = faker.address.city();
const centerContact = faker.name.findName();
const area = faker.address.city();
const areaContact = faker.name.findName();
const household = faker.address.city();
const householdContact = faker.name.findName();

describe('Create new lineage structure', () => {
  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
    await browser.execute(() => {
      // eslint-disable-next-line no-undef
      window.jQuery('.snackbar-content').hide();
    });
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('Create new health center', async () => {
    await contactPage.addPlace('district_hospital', centerName, centerContact);
    expect(await contactPage.getPrimaryContactName()).toBe(centerContact);
  });

  it('Create new area', async () => {
    await contactPage.addPlace('health_center', area, areaContact);
    expect(await contactPage.getPrimaryContactName()).toBe(areaContact);
  });

  it('Create new household', async () => {
    await contactPage.addPlace('clinic', household, householdContact);
    expect(await contactPage.getPrimaryContactName()).toBe(householdContact);
  });

  it('Create new person', async () => {
    expect(await contactPage.addPerson('James')).toBe('James');
  });
});
