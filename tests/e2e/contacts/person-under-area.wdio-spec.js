const loginPage = require('../../page-objects/login/login.wdio.page');
const usersAdminPage = require('../../page-objects/admin/user.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const utils = require('../../utils');
const placeFactory = require('../../factories/cht/contacts/place');
const personFactory = require('../../factories/cht/contacts/person');
const places = placeFactory.generateHierarchy(); // This generates ['district_hospital', 'health_center', 'clinic']
const district_hospital = places.find((place) => place.type === 'district_hospital');

const username = 'jack_test';
const password = 'Jacktest@123';

// Add one more health_center
const healthCenter2 = placeFactory.place().build({
  name: 'HealthCenter-2',
  type: 'health_center',
  parent: {
    _id: district_hospital._id,
    parent: {
      _id: ''
    }
  }
});

const healthCenters = places.filter((place) => place.type === 'health_center');

const person1 = personFactory.build(
  {
    parent: {
      _id: healthCenters[0]._id,
      parent: healthCenters[0].parent
    }
  });
const person2 = personFactory.build(
  {
    name: 'Jack',
    parent: {
      _id: healthCenter2._id,
      parent: healthCenter2.parent
    }
  });

const docs = [...places, healthCenter2, person1, person2];

describe('Create Person Under Area', async () => {
  beforeEach(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
  });

  afterEach(async () => {
    await utils.revertDb([], true);
  });

  it('create person under area should only see children', async () => {
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields(username, 'Jack', 'CHW', healthCenter2.name, person2.name, password);
    await usersAdminPage.saveUser();
    await usersAdminPage.logout();
    await loginPage.login(username, password);
    await commonPage.closeTour();

    await commonPage.goToPeople();
    const rows = await contactPage.getAllContactText();
    // Only one row will be displayed: for HealthCenter
    expect(rows.length).toEqual(1);
    expect(rows[0]).toEqual(healthCenter2.name);
    await contactPage.selectLHSRowByText(healthCenter2.name);
  });
});
