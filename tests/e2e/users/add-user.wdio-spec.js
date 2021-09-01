const utils = require('../../utils');
const chai = require('chai');
const usersAdminPage = require('../../page-objects/admin/user.wdio.page');
const placeFactory = require('../../factories/cht/contacts/place');
const loginPage = require('../../page-objects/login/login.wdio.page');
const personFactory = require('../../factories/cht/contacts/person');

const onlineUserRole = 'Program Officer';
const offlineUserRole = 'CHW';
const username = 'jack_test';
const password = 'Jacktest@123';
const incorrectpassword = 'Passwor';
const places = placeFactory.generateHierarchy();
const district_hospital = places.find((place) => place.type === 'district_hospital');

const person = personFactory.build(
  {
    parent: {
      _id: district_hospital._id,
      parent: district_hospital.parent
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

    it('should add user with valid password', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, district_hospital.name, 
        person.name, password);
      await usersAdminPage.saveUser();
      chai.expect(await usersAdminPage.getAllUsernames()).to.contain.members([username]);
    });
  });

  describe('Invalid entries -> ', () => {

    afterEach(async () => await usersAdminPage.closeUserDialog());

    it('should reject passwords shorter than 8 characters', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, district_hospital.name, 
        person.name, incorrectpassword);
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getPasswordErrorText();
      expect(text).toBe('The password must be at least 8 characters long.');
    });

    it('should reject weak passwords', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, district_hospital.name, 
        person.name, 'weakPassword');
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getPasswordErrorText();
      expect(text).toContain('The password is too easy to guess.');
    });

    it('should reject non-matching passwords', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, district_hospital.name, person.name, 
        password, 'other-password');
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getPasswordErrorText();
      expect(text).toContain('Passwords must match');
    });

    it('should require password', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', onlineUserRole, district_hospital.name, 
        person.name, '');
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getPasswordErrorText();
      expect(text).toContain('required');
    });

    it('should require username', async () => {
      await usersAdminPage.inputAddUserFields('', 'Jack', onlineUserRole, district_hospital.name, 
        person.name, password);
      await usersAdminPage.saveUser(false);
      const text = await usersAdminPage.getUsernameErrorText();
      expect(text).toContain('required');
    });

    it('should require place and contact for restricted user', async () => {
      await usersAdminPage.inputAddUserFields(username, 'Jack', offlineUserRole, null, null, password);
      await usersAdminPage.saveUser(false);
      expect(await usersAdminPage.getPlaceErrorText()).toContain('required');
      expect(await usersAdminPage.getContactErrorText()).toContain('required');
    });
  });
});
