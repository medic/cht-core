const chai = require('chai');

const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const sentinelUtils = require('@utils/sentinel');

const centerName = 'Franklin';
const centerContact = 'Center Contact';
const area = 'Georgia';
const areaContact = 'Area Contact';
const household = 'Barbados';
const householdContact = 'House Contact';

describe.skip('Create new lineage structure', () => {
  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
    await commonPage.goToPeople();
    await commonPage.waitForPageLoaded();
  });

  afterEach(async () => {
    // https://github.com/medic/cht-core/issues/7244
    // avoid race conditions by not starting next test until all changes were processed by Sentinel
    // todo remove this when/after fixing https://github.com/medic/cht-core/issues/7250
    await sentinelUtils.waitForSentinel();
    await commonPage.goToPeople();
    await commonPage.waitForPageLoaded();
  });

  it('Create new health center', async () => {
    await contactPage.addPlace({ placeName: centerName, contactName: centerContact }, false);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    chai.expect(await contactPage.getPrimaryContactName()).to.equal(centerContact);
  });

  it('Create new area', async () => {
    await contactPage.selectLHSRowByText(centerName);
    await contactPage.addPlace({ type: 'health_center', placeName: area, contactName: areaContact });
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    chai.expect(await contactPage.getPrimaryContactName()).to.equal(areaContact);
  });

  it('Create new household', async () => {
    await contactPage.selectLHSRowByText(area);
    await contactPage.addPlace({ type: 'clinic', placeName: household, contactName: householdContact });
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    chai.expect(await contactPage.getPrimaryContactName()).to.equal(householdContact);
  });

  it('Create new person', async () => {
    await contactPage.selectLHSRowByText(household);
    chai.expect(await contactPage.addPerson({ name: 'James' })).to.equal('James');
  });

  it('should edit a person with a phone number', async () => {
    await contactPage.selectLHSRowByText(centerName);

    const name = 'Padishah Emperor';
    const phone = '+40755789789';
    chai.expect(await contactPage.addPerson({ name, phone })).to.equal(name);
    chai.expect(await contactPage.getContactSummaryField('person.field.phone')).to.equal(phone);

    const updatedName = 'Paul Atreides';
    chai.expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
    chai.expect(await contactPage.getContactSummaryField('person.field.phone')).to.equal(phone);
  });

  it('should edit a name of the health facility', async () => {
    await contactPage.selectLHSRowByText(centerName);
    const name = 'Georgiana';
    chai.expect(await contactPage.addPerson({ name })).to.equal(name);
    const updatedName = 'Karina';
    chai.expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
  });

  it('should delete the primary contact of health facility', async () => {
    await contactPage.selectLHSRowByText(area);
    await contactPage.waitForContactLoaded();
    chai.expect(await contactPage.getAllRHSPeopleNames()).to.have.members([ areaContact ]);

    await contactPage.selectLHSRowByText(areaContact);
    await contactPage.waitForContactLoaded();
    await contactPage.deletePerson();

    await contactPage.selectLHSRowByText(area);
    await contactPage.waitForContactLoaded();
    chai.expect(await contactPage.getAllRHSPeopleNames()).to.not.have.members([ areaContact ]);
  });

  it('should edit the name of the CHW area', async () => {
    await contactPage.selectLHSRowByText(area);
    const name = 'Paul Luca';
    chai.expect(await contactPage.addPerson({ name })).to.equal(name);
    const updatedName = 'Cora Mi';
    chai.expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
  });

  it('should edit the name of the Family', async () => {
    await contactPage.selectLHSRowByText(household);
    const name = 'Sumeria';
    chai.expect(await contactPage.addPerson({ name })).to.equal(name);
    const updatedName = 'Kaleb';
    chai.expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
  });

});
