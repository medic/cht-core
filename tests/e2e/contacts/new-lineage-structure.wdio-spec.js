const faker = require('faker');
const chai = require('chai');

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
    chai.expect(await contactPage.getPrimaryContactName()).to.equal(centerContact);
  });

  it('Create new area', async () => {
    await contactPage.addPlace('health_center', area, areaContact);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    chai.expect(await contactPage.getPrimaryContactName()).to.equal(areaContact);
  });

  it('Create new household', async () => {
    await contactPage.addPlace('clinic', household, householdContact);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    chai.expect(await contactPage.getPrimaryContactName()).to.equal(householdContact);
  });

  it('Create new person', async () => {
    chai.expect(await contactPage.addPerson('James')).to.equal('James');
  });

  it('should edit a person with a phone number', async () => {
    await contactPage.selectLHSRowByText(centerName);

    const name = 'Padishah Emperor';
    const phone = '+40755789789';
    chai.expect(await contactPage.addPerson(name, { phone })).to.equal(name);
    chai.expect(await contactPage.getContactSummaryField('person.field.phone')).to.equal(phone);

    const updatedName = 'Paul Atreides';
    chai.expect(await contactPage.editPerson(name, updatedName)).to.equal(updatedName);
    chai.expect(await contactPage.getContactSummaryField('person.field.phone')).to.equal(phone);

  });
});
