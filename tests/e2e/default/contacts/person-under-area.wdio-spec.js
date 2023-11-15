const loginPage = require('@page-objects/default/login/login.wdio.page');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const places = placeFactory.generateHierarchy(); // This generates ['district_hospital', 'health_center', 'clinic']
const districtHospital = places.get('district_hospital');

const username = 'jack_test';
const password = 'Jacktest@123';

// Add one more health_center
const healthCenter2 = placeFactory.place().build({
  name: 'HealthCenter-2',
  type: 'health_center',
  parent: {
    _id: districtHospital._id,
    parent: {
      _id: ''
    }
  }
});

const healthCenters = places.get('health_center');

const person1 = personFactory.build(
  {
    parent: {
      _id: healthCenters._id,
      parent: healthCenters.parent
    }
  }
);
const person2 = personFactory.build(
  {
    name: 'Jack',
    parent: {
      _id: healthCenter2._id,
      parent: healthCenter2.parent
    }
  }
);

const docs = [...places.values(), healthCenter2, person1, person2];

describe('Create Person Under Area', () => {
  beforeEach(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
  });

  it('create person under area should only see children', async () => {
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields(username, 'Jack', 'chw', healthCenter2.name, person2.name, password);
    await usersAdminPage.saveUser();

    await browser.reloadSession();
    await browser.url('/');

    await loginPage.login({ username, password });

    await commonPage.goToPeople();
    const rows = await contactPage.getAllLHSContactsNames();
    // Only one row will be displayed: for HealthCenter
    expect(rows.length).to.equal(1);
    expect(rows[0]).to.equal(healthCenter2.name);
    await contactPage.selectLHSRowByText(healthCenter2.name);
  });
});
