const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const personFactory = require('../../../factories/cht/contacts/person');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const utils = require('../../../utils');

describe('Edit contacts with the default config. ', () => {
  const CONTACT_NAME = 'Maria Gomez';
  const CONTACT_UPDATED_NAME = 'Ana Paula Gonzalez';
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.find(place => place.type === 'district_hospital');
  const districtHospitalPrimaryContact = userFactory.build({ place: districtHospital._id });
  const healthCenter = places.find(place => place.type === 'health_center');
  const parent = { _id: healthCenter._id, parent: healthCenter.parent };
  const healthCenterPrimaryContact = personFactory.build({ name: CONTACT_NAME, parent: parent });
  healthCenter.contact = {
    _id: healthCenterPrimaryContact._id,
    name: healthCenterPrimaryContact.name,
    phone: healthCenterPrimaryContact.phone
  };
  const docs = [...places, districtHospitalPrimaryContact, healthCenterPrimaryContact];

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([districtHospitalPrimaryContact]);
    await loginPage.login(districtHospitalPrimaryContact);
    await commonPage.waitForPageLoaded();
  });

  it('should edit contact name', async () => {
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.editPerson(CONTACT_NAME, CONTACT_UPDATED_NAME);
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople(healthCenter._id);
    const primaryContactName = await contactPage.getPrimaryContactName();
    expect(primaryContactName).to.equal(CONTACT_UPDATED_NAME);
  });

  it('should remove the primary contact from the clinic when the contact is deleted', async () => {
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    await contactPage.deletePerson(CONTACT_UPDATED_NAME);
    await commonPage.waitForPageLoaded();
    await contactPage.selectLHSRowByText(healthCenter.name);
    const peopleNames = await contactPage.getAllRHSPeopleNames();
    expect(peopleNames.length).to.equal(0);
  });
});
