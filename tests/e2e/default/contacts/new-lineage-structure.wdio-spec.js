const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const sentinelUtils = require('@utils/sentinel');

describe('Create new lineage structure ', () => {
  const centerName = 'Franklin';
  const centerContact = 'Center Contact';
  const area = 'Georgia';
  const areaContact = 'Area Contact';
  const household = 'Barbados';
  const householdContact = 'House Contact';

  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
    await commonPage.goToPeople();
  });

  afterEach(async () => {
    // https://github.com/medic/cht-core/issues/7244
    // avoid race conditions by not starting next test until all changes were processed by Sentinel
    // todo remove this when/after fixing https://github.com/medic/cht-core/issues/7250
    await sentinelUtils.waitForSentinel();
    await commonPage.goToPeople();
  });

  it('should create new health center', async () => {
    await contactPage.addPlace({ placeName: centerName, contactName: centerContact }, false);
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    expect(await contactPage.getPrimaryContactName()).to.equal(centerContact);
  });

  it('should create new area', async () => {
    await contactPage.selectLHSRowByText(centerName);
    await contactPage.addPlace({ type: 'health_center', placeName: area, contactName: areaContact });
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    expect(await contactPage.getPrimaryContactName()).to.equal(areaContact);
  });

  it('should create new household', async () => {
    await contactPage.selectLHSRowByText(area);
    await contactPage.addPlace({ type: 'clinic', placeName: household, contactName: householdContact });
    await sentinelUtils.waitForSentinel(); // prevent stale element references
    expect(await contactPage.getPrimaryContactName()).to.equal(householdContact);
  });

  it('should create new person', async () => {
    await contactPage.selectLHSRowByText(household);
    expect(await contactPage.addPerson({ name: 'James' })).to.equal('James');
  });

  it('should edit a person with a phone number', async () => {
    const name = 'Padishah Emperor';
    const updatedName = 'Paul Atreides';
    const phone = '+40755789789';

    await contactPage.selectLHSRowByText(centerName);

    expect(await contactPage.addPerson({ name, phone })).to.equal(name);
    expect(await contactPage.getContactSummaryField('person.field.phone')).to.equal(phone);
    expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
    expect(await contactPage.getContactSummaryField('person.field.phone')).to.equal(phone);
  });

  it('should edit a name of the health facility', async () => {
    const name = 'Georgiana';
    const updatedName = 'Karina';

    await contactPage.selectLHSRowByText(centerName);

    expect(await contactPage.addPerson({ name })).to.equal(name);
    expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
  });

  it('should delete the primary contact of health facility', async () => {
    await contactPage.selectLHSRowByText(area);
    await contactPage.waitForContactLoaded();
    expect(await contactPage.getAllRHSPeopleNames()).to.have.members([ areaContact ]);

    await contactPage.selectLHSRowByText(areaContact);
    await contactPage.waitForContactLoaded();
    await contactPage.deletePerson();

    await contactPage.selectLHSRowByText(area);
    await contactPage.waitForContactLoaded();
    expect(await contactPage.getAllRHSPeopleNames()).to.not.have.members([ areaContact ]);
  });

  it('should edit the name of the CHW area', async () => {
    const name = 'Paul Luca';
    const updatedName = 'Cora Mi';

    await contactPage.selectLHSRowByText(area);

    expect(await contactPage.addPerson({ name })).to.equal(name);
    expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
  });

  it('should edit the name of the Family', async () => {
    const name = 'Sumeria';
    const updatedName = 'Kaleb';

    await contactPage.selectLHSRowByText(household);

    expect(await contactPage.addPerson({ name })).to.equal(name);
    expect(await contactPage.editPersonName(name, updatedName)).to.equal(updatedName);
  });

});
