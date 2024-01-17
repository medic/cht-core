const loginPage = require('@page-objects/default/login/login.wdio.page');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');

describe('Edit Person Under Area', () => {
  const placeFactory = require('@factories/cht/contacts/place');
  const personFactory = require('@factories/cht/contacts/person');
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');

  const offlineUsername = 'jack_test';
  const onlineUsername = 'program_officer';
  const password = 'Jacktest@123';
  const editedPlaceName = 'Updated Health Center';

  const healthCenter = placeFactory.place().build({
    name: 'HealthCenter',
    type: 'health_center',
    parent: {
      _id: districtHospital._id,
      parent: {
        _id: '',
      },
    },
  });

  const offlinePerson = personFactory.build({
    name: 'Jack',
    parent: {
      _id: healthCenter._id,
      parent: healthCenter.parent,
    },
  });

  const onlinePerson = personFactory.build({
    name: 'Program Officer',
    parent: {
      _id: healthCenter._id,
      parent: healthCenter.parent,
    },
  });

  const docs = [...places.values(), healthCenter, onlinePerson, offlinePerson];

  beforeEach(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields(
      offlineUsername,
      'Jack',
      'chw',
      healthCenter.name,
      offlinePerson.name,
      password
    );
    await usersAdminPage.saveUser();

    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields(
      onlineUsername,
      'Program Officer',
      'program_officer',
      healthCenter.name,
      onlinePerson.name,
      password
    );
    await usersAdminPage.saveUser();

    await browser.reloadSession();
  });

  it('can sync and update offlineUser HomePlace', async () => {
    await browser.url('/');
    await loginPage.login({ username: offlineUsername, password });
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await commonPage.logout();

    await browser.url('/');
    await loginPage.login({ username: onlineUsername, password });
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();
    await contactPage.editPlace(healthCenter.name, editedPlaceName, 'health_center');
    await commonPage.waitForPageLoaded();
    await commonPage.logout();

    await browser.url('/');
    await loginPage.login({ username: offlineUsername, password });
    await commonPage.waitForPageLoaded();
    await commonPage.goToPeople();

    expect(await contactPage.getContactCardText()).to.equal(healthCenter.name);
    await commonPage.sync();
    expect(await contactPage.getContactCardText()).to.equal(editedPlaceName);
  });
});
