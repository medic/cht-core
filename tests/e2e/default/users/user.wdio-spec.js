const utils = require('@utils');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');

const OFFLINE_USER_ROLE = 'chw';

const places = placeFactory.generateHierarchy();
const districtHospital = places.get('district_hospital');

const districtHospital2 = placeFactory.place().build({
  name: 'district_hospital',
  type: 'district_hospital',
});

const person = personFactory.build({ parent: districtHospital, roles: [OFFLINE_USER_ROLE] });

const createHierarchy = async () => {
  await utils.saveDocs([...places.values(), person, districtHospital2]);
};

const updateSettings =  async () => { 
  const settings = await utils.getSettings();
  await utils.updateSettings({
    permissions: { ...settings.permissions, can_have_multiple_places: [OFFLINE_USER_ROLE] },
    oidc_provider: {
      discovery_url: 'https://discovery_url.com',
      client_id: 'cht'
    }
  }, { ignoreReload: true });
};

describe('User Test Cases ->', () => {
  const ONLINE_USER_ROLE = 'program_officer';
  const OFFLINE_USER_ROLE = 'chw';
  const USERNAME = 'jackuser';
  const PASSWORD = 'Jacktest@123';
  const USERNAME_2 = 'jack_user';
  const PASSWORD_2 = 'Jacktest@456';
  const INCORRECT_PASSWORD = 'Passwor';

  before(async () => {
    await updateSettings();
    await createHierarchy();
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    await usersAdminPage.goToAdminUser();
  });

  after(async () => {
    await utils.revertSettings(true);
    await utils.revertDb([/^form:/], true);
  });

  describe('Creating Users ->', () => {

    beforeEach(async () => {
      await usersAdminPage.openAddUserDialog();
    });

    after(async () => await utils.deleteUsers([{ username: USERNAME }]));

    it('should add user with valid password', async () => {
      await usersAdminPage.inputAddUserFields({
        username: USERNAME,
        fullname: 'Jack',
        role: ONLINE_USER_ROLE,
        places: districtHospital.name,
        contact: person.name,
        password: PASSWORD
      });
      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([USERNAME]);
    });

    it('should add user with multiple places with permission', async () => {
      await usersAdminPage.inputAddUserFields({
        username: 'new_jack',
        fullname: 'Jack',
        role: OFFLINE_USER_ROLE,
        places: [districtHospital.name, districtHospital2.name    ],
        contact: person.name,
        password: PASSWORD
      });
      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([USERNAME]);
    });

    it('should hide and reveal password value, and add user with a revealed password', async () => {
      await usersAdminPage.inputAddUserFields({
        username: USERNAME_2,
        fullname: 'Jack',
        role: ONLINE_USER_ROLE,
        places: districtHospital.name,
        contact: person.name,
        password: PASSWORD
      });

      let revealedPassword = await usersAdminPage.togglePassword();
      expect(revealedPassword.type).to.equal('text');
      expect(revealedPassword.value).to.equal(PASSWORD);
      expect(revealedPassword.confirmType).to.equal('text');
      expect(revealedPassword.confirmValue).to.equal(PASSWORD);

      await usersAdminPage.setUserPassword(PASSWORD_2);
      await usersAdminPage.setUserConfirmPassword(PASSWORD_2);
      const hiddenPassword = await usersAdminPage.togglePassword();
      expect(hiddenPassword.type).to.equal('password');
      expect(hiddenPassword.value).to.equal(PASSWORD_2);
      expect(hiddenPassword.confirmType).to.equal('password');
      expect(hiddenPassword.confirmValue).to.equal(PASSWORD_2);

      revealedPassword = await usersAdminPage.togglePassword();
      expect(revealedPassword.type).to.equal('text');
      expect(revealedPassword.value).to.equal(PASSWORD_2);
      expect(revealedPassword.confirmType).to.equal('text');
      expect(revealedPassword.confirmValue).to.equal(PASSWORD_2);

      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([USERNAME_2]);
    });

    it('should add sso user', async () => {
      const chtUsername = `${USERNAME}_sso`;
      const oidcUsername = `${USERNAME}@email.com`;
      await usersAdminPage.inputAddUserFields({
        username: chtUsername,
        fullname: 'Jack',
        role: ONLINE_USER_ROLE,
        places: districtHospital.name,
        contact: person.name,
        oidcUsername
      });
      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([chtUsername]);
      const userId = `org.couchdb.user:${chtUsername}`;
      const userDoc = await utils.usersDb.get(userId);
      expect(userDoc.oidc_username).to.equal(oidcUsername);
      expect(userDoc.salt).to.exist;
      const userSettingsDoc = await utils.db.get(userId);
      expect(userSettingsDoc.oidc_login).to.be.true;
    });
  });

  describe('Invalid entries -> ', () => {

    beforeEach(async () => {
      await usersAdminPage.openAddUserDialog();
    });

    [
      { passwordValue: INCORRECT_PASSWORD, errorMessage: 'The password must be at least 8 characters long.' },
      { passwordValue: 'weakPassword', errorMessage: 'The password is too easy to guess.' },
      { passwordValue: PASSWORD, otherPassword: 'other-password', errorMessage: 'Passwords must match' },
      { passwordValue: '', errorMessage: 'required' },
      { passwordValue: '', errorMessage: 'required' }
    ].forEach(async (args) => {
      it(`TestCase for ${args.errorMessage}`, async () => {
        await usersAdminPage.inputAddUserFields({
          username: USERNAME,
          fullname: 'Jack',
          role: ONLINE_USER_ROLE,
          places: districtHospital.name,
          contact: person.name,
          password: args.passwordValue,
          confirmPassword: args.otherPassword
        });
        await usersAdminPage.saveUser(false);
        const text = await usersAdminPage.getPasswordErrorText();
        expect(text).to.contain(args.errorMessage);
      });
    });

    it('should require username', async () => {
      await usersAdminPage.inputAddUserFields({
        username: '',
        fullname: 'Jack',
        role: ONLINE_USER_ROLE,
        places: districtHospital.name,
        contact: person.name,
        password: PASSWORD
      });
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getUsernameErrorText();
      expect(text).to.contain('required');
    });

    it('should require place and contact for restricted user', async () => {
      await usersAdminPage.inputAddUserFields({
        username: USERNAME,
        fullname: 'Jack',
        role: OFFLINE_USER_ROLE,
        password: PASSWORD
      });
      await usersAdminPage.saveUser(false);
      expect(await usersAdminPage.getPlaceErrorText()).to.contain('required');
      expect(await usersAdminPage.getContactErrorText()).to.contain('required');
    });

    it('should require user to have permission for multiple places', async () => {
      await usersAdminPage.inputAddUserFields({
        username: USERNAME,
        fullname: 'Jack',
        role: ONLINE_USER_ROLE,
        places: [districtHospital.name, districtHospital2.name],
        contact: person.name,
        password: PASSWORD
      });
      await usersAdminPage.saveUser(false);
      expect(await usersAdminPage.getPlaceErrorText()).to.contain(
        'The selected roles do not have permission to be assigned multiple places.'
      );
    });
  });

  describe('Editing User ->', () => {
    after(async () => await utils.deleteUsers([{ username: USERNAME }]));

    it('should render user details', async () => {
      await utils.createUsers([{
        username: USERNAME,
        place: [ districtHospital._id ],
        roles: [ OFFLINE_USER_ROLE ],
        contact: person._id,
        oidc_username: `${USERNAME}@ssollinc.com`
      }]);
      await usersAdminPage.goToAdminUser();
      await usersAdminPage.openEditUserDialog(USERNAME);

      const userDetails = await usersAdminPage.editUserDialogDetails();
      expect(userDetails.usernameText).to.equal(USERNAME);
      expect(userDetails.chwIsSelected).to.be.true;
      expect(userDetails.place).to.equal(districtHospital._id);
      expect(userDetails.contact).to.equal(person._id);
      expect(userDetails.ssoEmail).to.equal(`${USERNAME}@ssollinc.com`);
    });
  });
});
