const utils = require('@utils');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');

describe('User Test Cases -> Creating Users ->', () => {
  const offlineUserRole = 'chw';
  const username = 'jackuser';
  const password = 'Jacktest@123';
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const districtHospital2 = placeFactory.place().build({
    name: 'district_hospital',
    type: 'district_hospital',
  });
  const NEW_PASSWORD = 'Pa33word1';

  const person = personFactory.build({
    parent: {
      _id: districtHospital._id,
      parent: districtHospital.parent,
    },
    roles: [offlineUserRole],
  });

  const docs = [ ...places.values(), person, districtHospital2 ];

  before(async () => {
    const settings = await utils.getSettings();
    const permissions = {
      ...settings.permissions,
      can_have_multiple_places: [offlineUserRole],
    };
    await utils.updateSettings({ permissions }, { ignoreReload: true });
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    if (await usersAdminPage.addUserDialog().isDisplayed()) {
      await usersAdminPage.closeAddUserDialog();
    }
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
  });

  after(async () => await utils.deleteUsers([{ username: username }]));

  it('should add user with multiple places with permission', async () => {
    await usersAdminPage.inputAddUserFields(
      username,
      'Jack',
      offlineUserRole,
      [districtHospital.name, districtHospital2.name],
      person.name,
      password
    );
    await usersAdminPage.saveUser();

    await commonPage.reloadSession();
    await loginPage.setUsernameValue(username);
    await loginPage.setPasswordValue(password);
    await loginPage.loginButton().click();
    await loginPage.passwordReset(password, NEW_PASSWORD, NEW_PASSWORD);
    await loginPage.updatePasswordButton().click();
    await commonPage.waitForPageLoaded();

    await commonPage.goToPeople();
    await contactPage.getAllLHSContactsNames();
    await contactPage.selectLHSRowByText(districtHospital2.name);
    await commonPage.openMoreOptionsMenu();

    expect(await commonPage.isMenuOptionEnabled('delete')).to.be.false;
  });
});
