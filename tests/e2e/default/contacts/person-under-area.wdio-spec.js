const loginPage = require('@page-objects/default/login/login.wdio.page');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { DOC_IDS } = require('@medic/constants');

describe('Create Person Under Area, ', () => {
  const username = 'jack_test';
  const password = 'Jacktest@123';
  const NEW_PASSWORD = 'Pa33word1';

  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const healthCenters = places.get(DOC_IDS.HEALTH_CENTER);

  const healthCenter2 = placeFactory.place().build({
    name: 'HealthCenter-2',
    type: DOC_IDS.HEALTH_CENTER,
    parent: { _id: districtHospital._id, parent: { _id: '' } }
  });

  const person1 = personFactory.build({ parent: { _id: healthCenters._id, parent: healthCenters.parent } });
  const person2 = personFactory.build({
    name: 'Jack',
    parent: { _id: healthCenter2._id, parent: healthCenter2.parent }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), healthCenter2, person1, person2]);
    await loginPage.cookieLogin();
  });

  it('should create person under area should only see children', async () => {
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields({
      username,
      fullname: 'Jack',
      role: 'chw',
      places: healthCenter2.name,
      contact: person2.name,
      password
    });
    await usersAdminPage.saveUser();

    await commonPage.reloadSession();
    await loginPage.setPasswordValue(password);
    await loginPage.setUsernameValue(username);
    await loginPage.loginButton().click();
    await loginPage.passwordReset(password, NEW_PASSWORD, NEW_PASSWORD);
    await loginPage.updatePasswordButton().click();
    await commonPage.waitForPageLoaded();

    await commonPage.goToPeople();
    const rows = await contactPage.getAllLHSContactsNames();
    // Only one row will be displayed: for HealthCenter
    expect(rows.length).to.equal(1);
    expect(rows[0]).to.equal(healthCenter2.name);
    await contactPage.selectLHSRowByText(healthCenter2.name);
  });
});
