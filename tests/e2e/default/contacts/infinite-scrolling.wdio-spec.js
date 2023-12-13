const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const login = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');

const PAGE_SIZE = 50;
describe.skip('Infinite scrolling', () => {
  before(async () => {
    const type = 'district_hospital';
    const districtHospitals = Array
      .from({ length: 200 })
      .map((_, idx) => placeFactory.place().build({
        name: `${type.replace('_', ' ')} ${idx}`,
        type: type,
      }));
    await utils.saveDocs(districtHospitals);
    await login.cookieLogin({ createUser: false });
  });

  it('should load multiple pages of contacts', async () => {
    await commonPage.goToPeople();
    let nbrContacts = await contactsPage.getDisplayedContactsNames();
    expect(nbrContacts.length).to.equal(PAGE_SIZE);

    await commonPage.loadNextInfiniteScrollPage();
    nbrContacts = await contactsPage.getDisplayedContactsNames();
    expect(nbrContacts.length).to.equal(PAGE_SIZE * 2);

    await commonPage.loadNextInfiniteScrollPage();
    nbrContacts = await contactsPage.getDisplayedContactsNames();
    expect(nbrContacts.length).to.equal(PAGE_SIZE * 3);
    await browser.takeScreenshot();
  });
});
