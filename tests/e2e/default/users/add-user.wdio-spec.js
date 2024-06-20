const utils = require('@utils');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const personFactory = require('@factories/cht/contacts/person');

const onlineUserRole = 'program_officer';
const offlineUserRole = 'chw';
const username = 'jackuser';
const password = 'Jacktest@123';
const incorrectpassword = 'Passwor';
const places = placeFactory.generateHierarchy();
const districtHospital = places.get('district_hospital');
const districtHospital2 = placeFactory.place().build({
  name: 'district_hospital',
  type: 'district_hospital',
});

const person = personFactory.build(
  {
    parent: {
      _id: districtHospital._id,
      parent: districtHospital.parent
    },
    roles: [offlineUserRole]
  }
);


const docs = [...places.values(), person, districtHospital2];

describe('User Test Cases ->', () => {

  before(async () => {
    const settings = await utils.getSettings();
    const permissions = {
      ...settings.permissions,
      can_have_multiple_places: [offlineUserRole],
    };
    await utils.updateSettings({ permissions }, true);
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

  describe('Creating Users ->', () => {

    after(async () => await utils.deleteUsers([{ username: username }]));

    it('should add user with valid password', async () => {
      await usersAdminPage.inputAddUserFields(
        username,
        'Jack',
        onlineUserRole,
        districtHospital.name,
        person.name,
        password
      );
      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([username]);
    });

    it('should add user with multiple places with permission', async () => {
      await usersAdminPage.inputAddUserFields(
        'new_jack',
        'Jack',
        offlineUserRole,
        [districtHospital.name, districtHospital2.name],
        person.name,
        password
      );
      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([username]);
    });
  });

  describe('Invalid entries -> ', () => {

    [
      { passwordValue: incorrectpassword, errorMessage: 'The password must be at least 8 characters long.' },
      { passwordValue: 'weakPassword', errorMessage: 'The password is too easy to guess.' },
      { passwordValue: password, otherPassword: 'other-password', errorMessage: 'Passwords must match' },
      { passwordValue: '', errorMessage: 'required' },
      { passwordValue: '', errorMessage: 'required' }
    ].forEach(async (args) => {
      it(`TestCase for ${args.errorMessage}`, async () => {
        await usersAdminPage.inputAddUserFields(
          username,
          'Jack',
          onlineUserRole,
          districtHospital.name,
          person.name,
          args.passwordValue,
          args.otherPassword
        );
        await usersAdminPage.saveUser(false);
        const text = await usersAdminPage.getPasswordErrorText();
        expect(text).to.contain(args.errorMessage);
      });
    });

    it('should require username', async () => {
      await usersAdminPage.inputAddUserFields('', 'Jack', onlineUserRole, districtHospital.name, person.name, password);
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getUsernameErrorText();
      expect(text).to.contain('required');
    });

    it('should require place and contact for restricted user', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', offlineUserRole, null, null, password);
      await usersAdminPage.saveUser(false);
      expect(await usersAdminPage.getPlaceErrorText()).to.contain('required');
      expect(await usersAdminPage.getContactErrorText()).to.contain('required');
    });

    it('should require user to have permission for multiple places', async () => {
      await usersAdminPage.inputAddUserFields(
        username,
        'Jack',
        onlineUserRole,
        [districtHospital.name, districtHospital2.name],
        person.name,
        password
      );
      await usersAdminPage.saveUser(false);
      expect(await usersAdminPage.getPlaceErrorText()).to.contain(
        'The selected roles do not have permission to be assigned multiple places.'
      );
    });
  });
});
