const loginPage = require('../../page-objects/login/login.wdio.page');
const adminPage = require('../../page-objects/contacts/admin-user.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactPage = require('../../page-objects/contacts/contacts.wdio.page');
const auth = require('../../auth')();
const utils = require('../../utils');
const placeFactory = require('../../factories/cht/contacts/place');
const personFactory = require('../../factories/cht/contacts/person');
const places = placeFactory.generateHierarchy(); // This generates ['district_hospital', 'health_center', 'clinic']

const district_hospital = places.find((place) => place.type === 'district_hospital');

const username = 'jack_test';
const password = 'Jacktest@123';
const healthCenterName = 'HealthCenter-2';

// Add one more health_center
const healthCenter2 = placeFactory.place().build({
  name: healthCenterName,
  type: 'health_center',
  parent: {
    _id: district_hospital._id,
    parent: {
      _id: ''
    }
  }
});

places.push(healthCenter2);

const healthCenters = places.filter((place) => place.type === 'health_center');
console.log(`Health Centers = ${JSON.stringify(healthCenters)}`);

const user1 = personFactory.build(
  {
    parent: {
      _id: healthCenters[0]._id,
      parent: healthCenters[0].parent
    }
  });
const user2 = personFactory.build(
  {
    parent: {
      _id: healthCenters[1]._id,
      parent: healthCenters[1].parent
    }
  });
user2.name = 'Jack';

const docs = [...places, user1, user2];

describe('Create Person Under Area', async () => {
  beforeEach(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin(auth.username, auth.password);
    console.log(`Hierarchy Generated: ${JSON.stringify(docs)}`);
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.refresh();
  });

  it('create person under area should only see children', async () => {
    await adminPage.goToAdmin();
    await adminPage.openAddUserDialog();
    await adminPage.inputAddUserFields(username, 'Jack', 'CHW', healthCenterName, user2.name, password);
    await adminPage.saveUser();
    await adminPage.logout();
    await loginPage.cookieLogin(username, password, false);
    await commonPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenterName);
  });
});
