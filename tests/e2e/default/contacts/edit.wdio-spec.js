const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const utils = require('../../../utils');


describe('Editing contacts with the default config. ', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.find(place => place.type === 'health_center');
  const healthCenterPrimaryContact = userFactory.build({ place: healthCenter._id });
  const docs = [...places, healthCenterPrimaryContact];

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([healthCenterPrimaryContact]);
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
  });

  it('should remove the primary contact from the health center when the contact is deleted', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.deletePerson(healthCenterPrimaryContact.contact.name);
    await commonPage.waitForPageLoaded();
    await contactPage.selectLHSRowByText(healthCenter.name);
    const peopleNames = await contactPage.getAllRHSPeopleNames();
    expect(peopleNames.length).to.equal(0);
  });
});
