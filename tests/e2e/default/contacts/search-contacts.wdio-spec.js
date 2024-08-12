const searchPage = require('@page-objects/default/search/search.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');

describe('Contact Search', () => {
  const places = placeFactory.generateHierarchy();

  const sittuHospital = placeFactory.place().build({
    name: 'Sittu Hospital',
    type: 'district_hospital',
    parent: { _id: '', parent: { _id: '' } }
  });

  const potuHospital = placeFactory.place().build({
    name: 'Potu Hospital',
    type: 'district_hospital',
    parent: { _id: '', parent: { _id: '' } }
  });

  const sittuPerson = personFactory.build({
    name: 'Sittu',
    parent: { _id: sittuHospital._id, parent: sittuHospital.parent }
  });

  const potuPerson = personFactory.build({
    name: 'Potu',
    parent: { _id: sittuHospital._id, parent: sittuHospital.parent }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), sittuHospital, sittuPerson, potuHospital, potuPerson]);
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
  });

  it('search by NON empty string should display results with contains match and clears search', async () => {
    await contactPage.getAllLHSContactsNames();

    await searchPage.performSearch('sittu');
    expect(await contactPage.getAllLHSContactsNames()).to.have.members([
      sittuPerson.name,
      sittuHospital.name,
    ]);

    await searchPage.clearSearch();
    expect(await contactPage.getAllLHSContactsNames()).to.have.members([
      potuHospital.name,
      sittuHospital.name,
      places.get('district_hospital').name,
    ]);
  });

  it('search should clear RHS selected contact', async () => {
    await contactPage.selectLHSRowByText(potuHospital.name, false);
    await contactPage.waitForContactLoaded();
    expect(await (await contactPage.contactCardSelectors.contactCardName()).getText()).to.equal(potuHospital.name);

    await searchPage.performSearch('sittu');
    await contactPage.waitForContactUnloaded();
    const url = await browser.getUrl();
    expect(url.endsWith('/contacts')).to.equal(true);
  });
});
