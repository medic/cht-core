const _ = require('lodash');
const utils = require('@utils');
const usersPage = require('@page-objects/default/users/user.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const uuid = require('uuid').v4;

describe('Create user meta db : ', () => {
  const USERNAME = 'fulltester';
  const FULL_NAME = 'Roger Milla';
  const PASSWORD = 'StrongP@ssword1';
  const NEW_PASSWORD = 'Pa33word1';

  const OPTIONS = {
    auth: { username: USERNAME, password: NEW_PASSWORD },
    method: 'GET',
    userName: USERNAME
  };

  before(async () => await loginPage.cookieLogin());

  it('should allow a new user to read/write from meta db', async () => {
    await usersPage.goToAdminUser();
    await usersPage.openAddUserDialog();
    await usersPage.inputAddUserFields(USERNAME, FULL_NAME, 'program_officer', '', '', PASSWORD);
    await usersPage.saveUser();

    await commonPage.goToMessages();
    await commonPage.logout();
    await browser.url('/');
    await loginPage.setPasswordValue(PASSWORD);
    await loginPage.setUsernameValue(USERNAME);
    await loginPage.loginButton().click();
    await loginPage.passwordReset(PASSWORD, NEW_PASSWORD, NEW_PASSWORD);
    await loginPage.updatePasswordButton().click();
    await commonPage.waitForPageLoaded();
    await commonPage.goToReports();

    const doc = { _id: uuid() };
    await utils.requestOnTestMetaDb(_.defaults({ method: 'POST', body: doc }, OPTIONS));

    const response = await utils.requestOnTestMetaDb(_.defaults({ path: '/_changes' }, OPTIONS));

    const changes = response.results;
    const ids = changes.map(change => change.id);
    expect(ids).to.include.members(['_design/medic-user', doc._id]);

    // admins can also read and write from the users meta db
    const adminDoc = { _id: uuid() };
    await utils.requestOnTestMetaDb({ method: 'POST', body: adminDoc, userName: OPTIONS.userName });
    const adminChanges = await utils.requestOnTestMetaDb({ path: '/_changes', userName: OPTIONS.userName });
    const adminChangeIds = adminChanges.results.map(change => change.id);
    expect(adminChangeIds).to.include.members(['_design/medic-user', doc._id, adminDoc._id]);
  });
});
