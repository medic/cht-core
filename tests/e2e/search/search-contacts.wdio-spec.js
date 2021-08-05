const searchPage = require('../../page-objects/search/search.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const utils = require('../../utils');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const placeFactory = require('../../factories/cht/contacts/place');
const personFactory = require('../../factories/cht/contacts/person');
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
  });
const potuPerson = personFactory.build(
  {
    name: 'Potu',
    parent: {
      _id: sittuHospital._id,
      parent: sittuHospital.parent
    }
  });

const docs = [...places, sittuHospital, sittuPerson, potuHospital, potuPerson];

describe('Test Contact Search Functionality', async () => {
  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
  });

  after(async () => {
    await utils.revertDb([], true);
  });

  it('search by NON empty string should display results with contains match and clears search', async () => {
    // Waiting for initial load
    await contactPage.getAllContactText();

    // Searching with keyword
    await searchPage.performSearch('sittu');
    let allLHSContacts = await contactPage.getAllContactText();
    expect(allLHSContacts.sort()).toEqual([sittuPerson.name, sittuHospital.name]);

    // Clearing the search
    await searchPage.clearSearch();
    allLHSContacts = await contactPage.getAllContactText();
    expect(allLHSContacts.sort()).toEqual([potuHospital.name, sittuHospital.name, places[0].name]);
  });
});
