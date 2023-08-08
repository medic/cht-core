const searchPage = require('@page-objects/default/search/search.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const places = placeFactory.generateHierarchy();

//Add two more health_center
const sittuHospital = placeFactory.place().build({
  name: 'Sittu Hospital',
  type: 'district_hospital',
  parent: {
    _id: '',
    parent: {
      _id: ''
    }
  }
});

const potuHospital = placeFactory.place().build({
  name: 'Potu Hospital',
  type: 'district_hospital',
  parent: {
    _id: '',
    parent: {
      _id: ''
    }
  }
});

const sittuPerson = personFactory.build(
  {
    name: 'Sittu',
    parent: {
      _id: sittuHospital._id,
      parent: sittuHospital.parent
    }
  }
);
const potuPerson = personFactory.build(
  {
    name: 'Potu',
    parent: {
      _id: sittuHospital._id,
      parent: sittuHospital.parent
    }
  }
);

const docs = [...places.values(), sittuHospital, sittuPerson, potuHospital, potuPerson];

describe('Test Contact Search Functionality', async () => {
  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
  });

  it('search by NON empty string should display results with contains match and clears search', async () => {
    // Waiting for initial load
    await contactPage.getAllLHSContactsNames();

    // Searching with keyword
    await searchPage.performSearch('sittu');
    expect(await contactPage.getAllLHSContactsNames()).to.have.members([
      sittuPerson.name,
      sittuHospital.name,
    ]);

    // Clearing the search
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
    expect(await (await contactPage.contactCard()).getText()).to.equal(potuHospital.name);

    await searchPage.performSearch('sittu');
    await contactPage.waitForContactUnloaded();
    const url = await browser.getUrl();
    expect(url.endsWith('/contacts')).to.equal(true);
  });
});
