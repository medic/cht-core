const utils = require('../../utils');
const usersAdminPage = require('../../page-objects/admin/user.wdio.page');
const placeFactory = require('../../factories/cht/contacts/place');
const loginPage = require('../../page-objects/login/login.wdio.page');
const personFactory = require('../../factories/cht/contacts/person');

const onlineUserRole = 'Program Officer';
const offlineUserRole = 'CHW';
const username = 'jackuser';
const password = 'Jacktest@123';
const incorrectpassword = 'Passwor';
const places = placeFactory.generateHierarchy();
const districtHospital = utils.findDistrictHospitalFromPlaces(places);

const person = personFactory.build(
  {
    parent: {
      _id: districtHospital._id,
      parent: districtHospital.parent
    }
  });

const docs = [...places, person];

describe('User Test Cases ->', () => {

  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.openAddUserDialog();
  });

  describe('Creating Users ->', () => {

    after(async () => await utils.deleteUsers([{ username: username }]));

    it('should add user with valid password', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, districtHospital.name,
        person.name, password);
      await usersAdminPage.saveUser();
      expect(await usersAdminPage.getAllUsernames()).to.include.members([username]);
    });
  });

  describe('Invalid entries -> ', () => {

    afterEach(async () => await usersAdminPage.closeUserDialog());

    [
      { passwordValue: incorrectpassword, errorMessage: 'The password must be at least 8 characters long.' },
      { passwordValue: 'weakPassword', errorMessage: 'The password is too easy to guess.' },
      { passwordValue: password, otherPassword: 'other-password', errorMessage: 'Passwords must match' },
      { passwordValue: '', errorMessage: 'required' },
      { passwordValue: '', errorMessage: 'required' }
    ].forEach(async (args) => {
      it(`TestCase for ${args.errorMessage}`, async () => {
        await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, districtHospital.name,
          person.name, args.passwordValue, args.otherPassword);
        await usersAdminPage.saveUser(false);
        const text = await usersAdminPage.getPasswordErrorText();
        expect(text).to.contain(args.errorMessage);
      });
    });

    it('should require username', async () => {
      await usersAdminPage.inputAddUserFields('', 'Jack', onlineUserRole, districtHospital.name,
        person.name, password);
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
  });
});
