const utils = require('@utils');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const { updateSettings, createHierarchy, createUser, user, districtHospital, person } = require('./common');

describe('User Test Cases ->', () => {
  before(async () => {
    await updateSettings();
    await createHierarchy();
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    if (await usersAdminPage.addUserDialog().isDisplayed()) {
      await usersAdminPage.closeAddUserDialog();
    }
    await usersAdminPage.goToAdminUser();
  });

  after(async () => {
    await utils.revertSettings(true);
    await utils.revertDb([/^form:/], true);
  });

  describe('Editing User ->', () => {

    after(async () => await utils.deleteUsers([{ username: user.username }]));

    it('should render user details', async () => {
      await createUser();

      await usersAdminPage.openEditUserDialog(user.username);

      const usernameText = await (await $('[id="edit-username"]')).getValue();
      expect(usernameText).to.equal(user.username);

      const chwIsSelected = await (await $('input[value="chw"]')).isSelected();
      expect(chwIsSelected).to.be.true;

      const place = await (await $('[id="facilitySelect"]')).getValue();
      expect(place).to.equal(districtHospital._id);

      const contact = await (await $('[id="contactSelect"]')).getValue();
      expect(contact).to.equal(person._id);

      const ssoEmail = await (await $('[id="sso-login"]')).getValue();
      expect(ssoEmail).to.equal(user.oidc_username);
    });
  });
});
